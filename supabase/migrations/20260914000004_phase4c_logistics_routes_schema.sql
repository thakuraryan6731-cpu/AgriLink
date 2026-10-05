-- ============================================================================
-- Phase 4C Migration: Logistics Routes Schema & Operational Status Alignment
-- File: supabase/migrations/20260914000004_phase4c_logistics_routes_schema.sql
-- ============================================================================
-- 1. Updates logistics_routes status check constraint to support both canonical
--    uppercase and legacy lowercase operational route statuses:
--    'SCHEDULED', 'PICKING_UP', 'IN_TRANSIT', 'COMPLETED',
--    'scheduled', 'picking_up', 'in_transit', 'completed'.
-- 2. Adds baseline_distance_km and distance_savings_km columns for auditability.
-- 3. Ensures indexes on aggregated_order_id and transporter_id.
-- ============================================================================

-- Step 1: Update status constraint on logistics_routes
ALTER TABLE public.logistics_routes 
  DROP CONSTRAINT IF EXISTS logistics_routes_status_check;

ALTER TABLE public.logistics_routes
  ADD CONSTRAINT logistics_routes_status_check
  CHECK (status IN (
    'SCHEDULED',
    'PICKING_UP',
    'IN_TRANSIT',
    'COMPLETED',
    -- Legacy lowercase values for backward compatibility
    'scheduled',
    'picking_up',
    'in_transit',
    'completed'
  ));

-- Step 2: Add road distance optimization metrics columns
ALTER TABLE public.logistics_routes
  ADD COLUMN IF NOT EXISTS baseline_distance_km FLOAT,
  ADD COLUMN IF NOT EXISTS distance_savings_km FLOAT;

-- Step 3: Performance Indexes
CREATE INDEX IF NOT EXISTS idx_logistics_routes_order_id ON public.logistics_routes(aggregated_order_id);
CREATE INDEX IF NOT EXISTS idx_logistics_routes_transporter_id ON public.logistics_routes(transporter_id);
