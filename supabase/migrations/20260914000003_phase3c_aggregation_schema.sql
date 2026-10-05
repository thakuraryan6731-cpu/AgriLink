-- ============================================================================
-- Phase 3C Migration: Supply Aggregation Schema & 7-State Order Lifecycle
-- File: supabase/migrations/20260914000003_phase3c_aggregation_schema.sql
-- ============================================================================
-- 1. Updates aggregated_orders status check constraint to support the 7-state
--    lifecycle: MATCHED, AGGREGATING, BUYER_CONFIRMED, PICKUP_SCHEDULED,
--    IN_TRANSIT, DELIVERED, PAYMENT_CONFIRMED.
-- 2. Adds harvest_window_hours column and updates cluster_radius_km default to 15.0 km.
-- 3. Creates public.aggregated_order_items child table for granular per-farmer
--    lot allocation records.
-- 4. Establishes RLS policies for aggregated_order_items.
-- ============================================================================

-- Step 1: Update status constraint on aggregated_orders
ALTER TABLE public.aggregated_orders 
  DROP CONSTRAINT IF EXISTS aggregated_orders_status_check;

ALTER TABLE public.aggregated_orders
  ADD CONSTRAINT aggregated_orders_status_check
  CHECK (status IN (
    'MATCHED',
    'AGGREGATING',
    'BUYER_CONFIRMED',
    'PICKUP_SCHEDULED',
    'IN_TRANSIT',
    'DELIVERED',
    'PAYMENT_CONFIRMED',
    -- Legacy lowercase values for backward compatibility
    'aggregating',
    'confirmed',
    'in_transit',
    'delivered'
  ));

-- Step 2: Add harvest_window_hours and ensure default cluster radius is 15.0
ALTER TABLE public.aggregated_orders
  ADD COLUMN IF NOT EXISTS harvest_window_hours FLOAT DEFAULT 24.0;

ALTER TABLE public.aggregated_orders
  ALTER COLUMN cluster_radius_km SET DEFAULT 15.0;

-- Step 3: Create public.aggregated_order_items table
CREATE TABLE IF NOT EXISTS public.aggregated_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregated_order_id UUID NOT NULL REFERENCES public.aggregated_orders(id) ON DELETE CASCADE,
  crop_inventory_id UUID REFERENCES public.crop_inventory(id) ON DELETE SET NULL,
  farmer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  allocated_quantity_kg FLOAT NOT NULL CHECK (allocated_quantity_kg > 0),
  price_per_kg FLOAT NOT NULL CHECK (price_per_kg >= 0),
  distance_from_hub_km FLOAT,
  harvest_date DATE,
  is_seed_farmer BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agg_items_order_id ON public.aggregated_order_items(aggregated_order_id);
CREATE INDEX IF NOT EXISTS idx_agg_items_farmer_id ON public.aggregated_order_items(farmer_id);

-- Step 4: RLS Configuration for aggregated_order_items
ALTER TABLE public.aggregated_order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Aggregated order items viewable by all authenticated users" ON public.aggregated_order_items;
CREATE POLICY "Aggregated order items viewable by all authenticated users"
  ON public.aggregated_order_items FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Buyers, FPOs, and Admins can manage aggregated order items" ON public.aggregated_order_items;
CREATE POLICY "Buyers, FPOs, and Admins can manage aggregated order items"
  ON public.aggregated_order_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('buyer', 'fpo', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('buyer', 'fpo', 'admin')
    )
  );
