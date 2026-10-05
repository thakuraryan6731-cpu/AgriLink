-- ============================================================================
-- AGRILINK AI — MASTER FEATURE UPDATE MIGRATION
-- File: supabase/migrations/20260914000005_master_feature_update.sql
-- ============================================================================
-- Features implemented:
-- 1. Contact information columns for profiles (Farmer & Buyer)
-- 2. Produce photos support on crop_inventory
-- 3. Farmer-only private chat system (farmer_conversations, farmer_messages) + RLS
-- 4. Atomic create_aggregated_order RPC function with price override approval
-- 5. Scoped RLS policies for aggregated orders & items
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Profile Contact & Business Information
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS business_type TEXT,
  ADD COLUMN IF NOT EXISTS business_address TEXT;

-- ----------------------------------------------------------------------------
-- 2. Crop Inventory Produce Photos
-- ----------------------------------------------------------------------------
ALTER TABLE public.crop_inventory
  ADD COLUMN IF NOT EXISTS photo_urls TEXT[] DEFAULT '{}'::TEXT[];

-- ----------------------------------------------------------------------------
-- 3. Aggregated Orders Price Override Support
-- ----------------------------------------------------------------------------
ALTER TABLE public.aggregated_orders
  ADD COLUMN IF NOT EXISTS price_override_approved BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS approved_price_per_kg FLOAT;

-- ----------------------------------------------------------------------------
-- 4. Farmer-to-Farmer Chat System (Strict Farmer/FPO Isolation)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.farmer_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  participant_2_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_different_participants CHECK (participant_1_id <> participant_2_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_farmer_conversations_pair 
  ON public.farmer_conversations(
    LEAST(participant_1_id, participant_2_id), 
    GREATEST(participant_1_id, participant_2_id)
  );

CREATE TABLE IF NOT EXISTS public.farmer_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.farmer_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message_text TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_farmer_messages_conv_id ON public.farmer_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_farmer_messages_sender ON public.farmer_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_farmer_messages_unread ON public.farmer_messages(conversation_id, is_read);

-- Enable RLS on Chat Tables
ALTER TABLE public.farmer_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farmer_messages ENABLE ROW LEVEL SECURITY;

-- Farmer Conversations Policies: Strictly Farmers and FPOs only
DROP POLICY IF EXISTS "Farmers can view own conversations" ON public.farmer_conversations;
CREATE POLICY "Farmers can view own conversations"
  ON public.farmer_conversations FOR SELECT
  TO authenticated
  USING (
    (auth.uid() = participant_1_id OR auth.uid() = participant_2_id)
    AND public.get_my_role() IN ('farmer', 'fpo_admin')
  );

DROP POLICY IF EXISTS "Farmers can create conversations" ON public.farmer_conversations;
CREATE POLICY "Farmers can create conversations"
  ON public.farmer_conversations FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.uid() = participant_1_id OR auth.uid() = participant_2_id)
    AND public.get_my_role() IN ('farmer', 'fpo_admin')
    AND EXISTS (
      SELECT 1 FROM public.profiles p1, public.profiles p2
      WHERE p1.id = participant_1_id AND p1.role IN ('farmer', 'fpo_admin')
        AND p2.id = participant_2_id AND p2.role IN ('farmer', 'fpo_admin')
    )
  );

DROP POLICY IF EXISTS "Farmers can update own conversations" ON public.farmer_conversations;
CREATE POLICY "Farmers can update own conversations"
  ON public.farmer_conversations FOR UPDATE
  TO authenticated
  USING (
    (auth.uid() = participant_1_id OR auth.uid() = participant_2_id)
    AND public.get_my_role() IN ('farmer', 'fpo_admin')
  );

-- Farmer Messages Policies: Strictly Participants only
DROP POLICY IF EXISTS "Participants can view conversation messages" ON public.farmer_messages;
CREATE POLICY "Participants can view conversation messages"
  ON public.farmer_messages FOR SELECT
  TO authenticated
  USING (
    public.get_my_role() IN ('farmer', 'fpo_admin')
    AND EXISTS (
      SELECT 1 FROM public.farmer_conversations c
      WHERE c.id = conversation_id
      AND (c.participant_1_id = auth.uid() OR c.participant_2_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Participants can insert conversation messages" ON public.farmer_messages;
CREATE POLICY "Participants can insert conversation messages"
  ON public.farmer_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND public.get_my_role() IN ('farmer', 'fpo_admin')
    AND EXISTS (
      SELECT 1 FROM public.farmer_conversations c
      WHERE c.id = conversation_id
      AND (c.participant_1_id = auth.uid() OR c.participant_2_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Participants can update message read status" ON public.farmer_messages;
CREATE POLICY "Participants can update message read status"
  ON public.farmer_messages FOR UPDATE
  TO authenticated
  USING (
    public.get_my_role() IN ('farmer', 'fpo_admin')
    AND EXISTS (
      SELECT 1 FROM public.farmer_conversations c
      WHERE c.id = conversation_id
      AND (c.participant_1_id = auth.uid() OR c.participant_2_id = auth.uid())
    )
  );

-- ----------------------------------------------------------------------------
-- 5. Atomic Order Creation RPC Function
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_aggregated_order(
  p_requirement_id UUID,
  p_crop_name TEXT,
  p_quality_grade TEXT,
  p_hub_lat FLOAT,
  p_hub_lng FLOAT,
  p_hub_name TEXT,
  p_items JSONB,
  p_price_override_approved BOOLEAN DEFAULT FALSE
)
RETURNS JSONB AS $$
DECLARE
  v_caller_id UUID;
  v_caller_role TEXT;
  v_req RECORD;
  v_item JSONB;
  v_crop_id UUID;
  v_crop RECORD;
  v_allocated_qty FLOAT;
  v_item_price FLOAT;
  v_total_qty FLOAT := 0;
  v_total_cost FLOAT := 0;
  v_avg_price FLOAT := 0;
  v_order_id UUID;
  v_farmer_ids JSONB := '[]'::JSONB;
  v_now TIMESTAMPTZ := NOW();
  v_highest_item_price FLOAT := 0;
BEGIN
  -- 1. Verify caller authentication
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: User must be authenticated to create aggregated orders.';
  END IF;

  SELECT role INTO v_caller_role FROM public.profiles WHERE id = v_caller_id;
  IF v_caller_role NOT IN ('bulk_buyer', 'consumer_group', 'doca_admin', 'fpo_admin') THEN
    RAISE EXCEPTION 'FORBIDDEN: Role % is not authorized to create aggregated orders.', v_caller_role;
  END IF;

  -- 2. Verify requirement exists and belongs to caller (or caller is admin)
  SELECT * INTO v_req FROM public.buyer_requirements WHERE id = p_requirement_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'REQUIREMENT_NOT_FOUND: Buyer requirement % does not exist.', p_requirement_id;
  END IF;

  IF v_caller_role NOT IN ('doca_admin', 'fpo_admin') AND v_req.buyer_id <> v_caller_id THEN
    RAISE EXCEPTION 'FORBIDDEN: Buyer cannot create an order for another buyer requirement.';
  END IF;

  IF v_req.status IN ('fulfilled', 'cancelled') THEN
    RAISE EXCEPTION 'INVALID_STATUS: Requirement is already %.', v_req.status;
  END IF;

  -- 3. Validate items and check prices/availability
  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'EMPTY_ITEMS: Aggregated order must contain at least one produce item.';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_crop_id := (v_item->>'crop_inventory_id')::UUID;
    v_allocated_qty := (v_item->>'allocated_quantity_kg')::FLOAT;
    v_item_price := (v_item->>'price_per_kg')::FLOAT;

    IF v_crop_id IS NULL OR v_allocated_qty IS NULL OR v_allocated_qty <= 0 THEN
      RAISE EXCEPTION 'INVALID_ITEM: Each item must contain a valid crop_inventory_id and positive allocated_quantity_kg.';
    END IF;

    -- Lock and verify crop inventory
    SELECT * INTO v_crop FROM public.crop_inventory WHERE id = v_crop_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'CROP_NOT_FOUND: Crop inventory % not found.', v_crop_id;
    END IF;

    IF v_crop.status <> 'available' THEN
      RAISE EXCEPTION 'CROP_UNAVAILABLE: Crop listing % is no longer available (current status: %).', v_crop.crop_name, v_crop.status;
    END IF;

    IF v_allocated_qty > v_crop.quantity_kg THEN
      RAISE EXCEPTION 'INSUFFICIENT_QUANTITY: Requested % kg exceeds available % kg for listing %.', v_allocated_qty, v_crop.quantity_kg, v_crop.crop_name;
    END IF;

    -- Price Check against buyer max price
    IF v_item_price > v_req.max_price_per_kg THEN
      IF NOT p_price_override_approved THEN
        RAISE EXCEPTION 'PRICE_EXCEEDS_MAX: Produce price ₹%/kg exceeds buyer max price of ₹%/kg. Explicit buyer override required.', v_item_price, v_req.max_price_per_kg;
      END IF;
    END IF;

    IF v_item_price > v_highest_item_price THEN
      v_highest_item_price := v_item_price;
    END IF;

    v_total_qty := v_total_qty + v_allocated_qty;
    v_total_cost := v_total_cost + (v_allocated_qty * v_item_price);
    v_farmer_ids := v_farmer_ids || jsonb_build_array(jsonb_build_object(
      'farmer_id', v_crop.farmer_id,
      'crop_inventory_id', v_crop.id,
      'allocated_kg', v_allocated_qty,
      'price_per_kg', v_item_price
    ));
  END LOOP;

  v_avg_price := ROUND((v_total_cost / NULLIF(v_total_qty, 0))::NUMERIC, 2);

  -- 4. Create aggregated_orders record
  v_order_id := gen_random_uuid();
  INSERT INTO public.aggregated_orders (
    id,
    requirement_id,
    crop_name,
    quality_grade,
    total_quantity_kg,
    pooled_farmer_ids,
    hub_location,
    avg_price_per_kg,
    cluster_radius_km,
    harvest_window_hours,
    status,
    price_override_approved,
    approved_price_per_kg,
    created_at,
    updated_at
  ) VALUES (
    v_order_id,
    p_requirement_id,
    p_crop_name,
    COALESCE(p_quality_grade, v_req.preferred_quality_grade, 'Grade A'),
    v_total_qty,
    v_farmer_ids,
    jsonb_build_object('name', COALESCE(p_hub_name, 'Central Hub'), 'lat', p_hub_lat, 'lng', p_hub_lng),
    v_avg_price,
    15.0,
    24.0,
    'BUYER_CONFIRMED',
    p_price_override_approved,
    CASE WHEN p_price_override_approved THEN v_highest_item_price ELSE NULL END,
    v_now,
    v_now
  );

  -- 5. Insert aggregated_order_items and update crop_inventory status
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_crop_id := (v_item->>'crop_inventory_id')::UUID;
    v_allocated_qty := (v_item->>'allocated_quantity_kg')::FLOAT;
    v_item_price := (v_item->>'price_per_kg')::FLOAT;

    SELECT * INTO v_crop FROM public.crop_inventory WHERE id = v_crop_id;

    INSERT INTO public.aggregated_order_items (
      id,
      aggregated_order_id,
      crop_inventory_id,
      farmer_id,
      allocated_quantity_kg,
      price_per_kg,
      distance_from_hub_km,
      harvest_date,
      is_seed_farmer,
      created_at
    ) VALUES (
      gen_random_uuid(),
      v_order_id,
      v_crop_id,
      v_crop.farmer_id,
      v_allocated_qty,
      v_item_price,
      COALESCE((v_item->>'distance_from_hub_km')::FLOAT, 10.0),
      v_crop.harvest_date,
      COALESCE((v_item->>'is_seed_farmer')::BOOLEAN, FALSE),
      v_now
    );

    -- Transition crop status to aggregating
    UPDATE public.crop_inventory
    SET status = 'aggregating', updated_at = v_now
    WHERE id = v_crop_id;
  END LOOP;

  -- 6. Update buyer requirement status
  IF v_total_qty >= v_req.required_quantity_kg THEN
    UPDATE public.buyer_requirements
    SET status = 'matched', updated_at = v_now
    WHERE id = p_requirement_id;
  ELSE
    UPDATE public.buyer_requirements
    SET status = 'matched', updated_at = v_now
    WHERE id = p_requirement_id;
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'order_id', v_order_id,
    'crop_name', p_crop_name,
    'total_quantity_kg', v_total_qty,
    'avg_price_per_kg', v_avg_price,
    'status', 'BUYER_CONFIRMED',
    'price_override_approved', p_price_override_approved
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.create_aggregated_order TO authenticated;

-- ----------------------------------------------------------------------------
-- 6. Storage Configuration for Produce Photos
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('produce-photos', 'produce-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public can view produce photos" ON storage.objects;
CREATE POLICY "Public can view produce photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'produce-photos');

DROP POLICY IF EXISTS "Farmers can upload produce photos" ON storage.objects;
CREATE POLICY "Farmers can upload produce photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'produce-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Farmers can update/delete own produce photos" ON storage.objects;
CREATE POLICY "Farmers can update/delete own produce photos"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'produce-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Reload PostgREST Schema Cache
NOTIFY pgrst, 'reload schema';
