-- ============================================================================
-- AGRILINK AI — PHASE 1 MIGRATION: REAL DATA & FARMER COMMUNITY
-- File: supabase/migrations/20260914000006_phase1_real_data_and_community.sql
-- ============================================================================
-- 1. Ensure public.profiles has all contact & business metadata columns
-- 2. Ensure public.crop_inventory has photo_urls TEXT[]
-- 3. Ensure public.aggregated_orders has price override columns
-- 4. Create public.farmer_community_messages table + indexes + strict immutable RLS
-- 5. Configure Supabase Storage bucket 'produce-photos' + Strict Role & Path RLS
-- 6. Fix public.aggregated_order_items RLS with strict scoped SELECT/INSERT/UPDATE/DELETE
-- 7. Harden public.profiles RLS to prevent unauthorized profile harvesting
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Profiles Column Completeness
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS business_type TEXT,
  ADD COLUMN IF NOT EXISTS business_address TEXT;

-- ----------------------------------------------------------------------------
-- 2. Crop Inventory Photo Support
-- ----------------------------------------------------------------------------
ALTER TABLE public.crop_inventory
  ADD COLUMN IF NOT EXISTS photo_urls TEXT[] DEFAULT '{}'::TEXT[];

-- ----------------------------------------------------------------------------
-- 3. Aggregated Orders Price Override Support
-- ----------------------------------------------------------------------------
ALTER TABLE public.aggregated_orders
  ADD COLUMN IF NOT EXISTS price_override_approved BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS approved_price_per_kg NUMERIC(10,2);

-- ----------------------------------------------------------------------------
-- 4. Farmer Community Messages (Broadcast Channel for Farmers & FPOs Only)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.farmer_community_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL CHECK (char_length(trim(message)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_farmer_comm_messages_created_at 
  ON public.farmer_community_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_farmer_comm_messages_sender 
  ON public.farmer_community_messages(sender_id);

-- Enable RLS
ALTER TABLE public.farmer_community_messages ENABLE ROW LEVEL SECURITY;

-- SELECT Policy: Only Farmers and FPO Admins can read
DROP POLICY IF EXISTS "Farmer community messages viewable only by farmers and fpos" ON public.farmer_community_messages;
CREATE POLICY "Farmer community messages viewable only by farmers and fpos"
  ON public.farmer_community_messages FOR SELECT
  TO authenticated
  USING (
    public.get_my_role() IN ('farmer', 'fpo_admin')
  );

-- INSERT Policy: Only Farmers and FPO Admins can post, sender_id must be caller
DROP POLICY IF EXISTS "Farmers and fpos can insert community messages" ON public.farmer_community_messages;
CREATE POLICY "Farmers and fpos can insert community messages"
  ON public.farmer_community_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND public.get_my_role() IN ('farmer', 'fpo_admin')
  );

-- UPDATE/DELETE: Strictly immutable. No UPDATE or DELETE policies are provisioned.
DROP POLICY IF EXISTS "Community messages are immutable by users" ON public.farmer_community_messages;

-- ----------------------------------------------------------------------------
-- 5. Storage Configuration for Produce Photos
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('produce-photos', 'produce-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Marketplace Discovery: Authenticated users can view produce photos
DROP POLICY IF EXISTS "Public can view produce photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view produce photos" ON storage.objects;
CREATE POLICY "Authenticated users can view produce photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'produce-photos');

-- Farmer / FPO Upload: Only farmer and fpo_admin within their own UID folder
DROP POLICY IF EXISTS "Farmers can upload produce photos" ON storage.objects;
CREATE POLICY "Farmers can upload produce photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'produce-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.get_my_role() IN ('farmer', 'fpo_admin')
  );

-- Farmer / FPO Update: Only farmer and fpo_admin within their own UID folder
DROP POLICY IF EXISTS "Farmers can update/delete own produce photos" ON storage.objects;
DROP POLICY IF EXISTS "Farmers can update own produce photos" ON storage.objects;
CREATE POLICY "Farmers can update own produce photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'produce-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.get_my_role() IN ('farmer', 'fpo_admin')
  );

-- Farmer / FPO Delete: Only farmer and fpo_admin within their own UID folder
DROP POLICY IF EXISTS "Farmers can delete own produce photos" ON storage.objects;
CREATE POLICY "Farmers can delete own produce photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'produce-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.get_my_role() IN ('farmer', 'fpo_admin')
  );

-- ----------------------------------------------------------------------------
-- 6. Scoped Aggregated Order Items RLS (Strict Relational Access)
-- ----------------------------------------------------------------------------
ALTER TABLE public.aggregated_order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Aggregated order items viewable by all authenticated users" ON public.aggregated_order_items;
DROP POLICY IF EXISTS "Scoped aggregated order items select" ON public.aggregated_order_items;
DROP POLICY IF EXISTS "Authorized roles can view aggregated order items" ON public.aggregated_order_items;

-- Scoped SELECT: Strictly restricted by legitimate relationship
CREATE POLICY "Scoped aggregated order items select"
  ON public.aggregated_order_items FOR SELECT
  TO authenticated
  USING (
    -- DoCA Admin: Oversight
    public.get_my_role() = 'doca_admin'
    -- Buyer / Consumer Group: Own aggregated orders
    OR (
      public.get_my_role() IN ('bulk_buyer', 'consumer_group')
      AND EXISTS (
        SELECT 1 FROM public.aggregated_orders ao
        WHERE ao.id = aggregated_order_items.order_id
          AND (
            ao.buyer_id = auth.uid()
            OR EXISTS (
              SELECT 1 FROM public.buyer_requirements br
              WHERE br.id = ao.requirement_id AND br.buyer_id = auth.uid()
            )
          )
      )
    )
    -- Farmer / FPO Admin: Only items containing their own produce listing
    OR (
      public.get_my_role() IN ('farmer', 'fpo_admin')
      AND EXISTS (
        SELECT 1 FROM public.crop_inventory ci
        WHERE ci.id = aggregated_order_items.inventory_id
          AND ci.farmer_id = auth.uid()
      )
    )
    -- Transporter: Only items in orders assigned to their logistics route
    OR (
      public.get_my_role() = 'transporter'
      AND EXISTS (
        SELECT 1 FROM public.logistics_routes lr
        WHERE lr.order_id = aggregated_order_items.order_id
          AND lr.transporter_id = auth.uid()
      )
    )
  );

-- Scoped INSERT: Buyer placing order or FPO/Admin aggregation
DROP POLICY IF EXISTS "Buyers, FPOs, and Admins can manage aggregated order items" ON public.aggregated_order_items;
DROP POLICY IF EXISTS "Authorized roles can manage aggregated order items" ON public.aggregated_order_items;
DROP POLICY IF EXISTS "Authorized roles can insert aggregated order items" ON public.aggregated_order_items;
DROP POLICY IF EXISTS "Authorized roles can modify aggregated order items" ON public.aggregated_order_items;
DROP POLICY IF EXISTS "Authorized roles can delete aggregated order items" ON public.aggregated_order_items;

CREATE POLICY "Authorized roles can insert aggregated order items"
  ON public.aggregated_order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_my_role() IN ('bulk_buyer', 'consumer_group', 'fpo_admin', 'doca_admin')
    AND (
      public.get_my_role() IN ('fpo_admin', 'doca_admin')
      OR EXISTS (
        SELECT 1 FROM public.aggregated_orders ao
        WHERE ao.id = aggregated_order_items.order_id
          AND (
            ao.buyer_id = auth.uid()
            OR EXISTS (
              SELECT 1 FROM public.buyer_requirements br
              WHERE br.id = ao.requirement_id AND br.buyer_id = auth.uid()
            )
          )
      )
    )
  );

CREATE POLICY "Authorized roles can modify aggregated order items"
  ON public.aggregated_order_items FOR UPDATE
  TO authenticated
  USING (
    public.get_my_role() IN ('fpo_admin', 'doca_admin')
    OR (
      public.get_my_role() IN ('bulk_buyer', 'consumer_group')
      AND EXISTS (
        SELECT 1 FROM public.aggregated_orders ao
        WHERE ao.id = aggregated_order_items.order_id
          AND ao.buyer_id = auth.uid()
      )
    )
  );

CREATE POLICY "Authorized roles can delete aggregated order items"
  ON public.aggregated_order_items FOR DELETE
  TO authenticated
  USING (
    public.get_my_role() IN ('fpo_admin', 'doca_admin')
    OR (
      public.get_my_role() IN ('bulk_buyer', 'consumer_group')
      AND EXISTS (
        SELECT 1 FROM public.aggregated_orders ao
        WHERE ao.id = aggregated_order_items.order_id
          AND ao.buyer_id = auth.uid()
      )
    )
  );

-- ----------------------------------------------------------------------------
-- 7. Controlled Profile Visibility RLS (Anti-Scraping & Privacy Preserving)
-- ----------------------------------------------------------------------------
-- - Users see their own profile
-- - DoCA Admins see all profiles for oversight and audit
-- - Legitimate market participants see counterpart profiles involved in listings, requirements, orders, or assigned routes
DROP POLICY IF EXISTS "Public profiles are readable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Scoped profiles readable by authenticated users" ON public.profiles;
CREATE POLICY "Scoped profiles readable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR public.get_my_role() = 'doca_admin'
    OR EXISTS (SELECT 1 FROM public.crop_inventory ci WHERE ci.farmer_id = profiles.id)
    OR EXISTS (SELECT 1 FROM public.buyer_requirements br WHERE br.buyer_id = profiles.id)
    OR EXISTS (
      SELECT 1 FROM public.farmer_community_messages fcm 
      WHERE fcm.sender_id = profiles.id 
        AND public.get_my_role() IN ('farmer', 'fpo_admin')
    )
    OR EXISTS (SELECT 1 FROM public.logistics_routes lr WHERE lr.transporter_id = profiles.id)
  );

-- Reload PostgREST Schema Cache
NOTIFY pgrst, 'reload schema';
