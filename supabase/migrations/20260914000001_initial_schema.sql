-- ============================================================================
-- AGRILINK AI - MASTER LOCKED SUPABASE POSTGRESQL SCHEMA (SIH26033)
-- Ministry of Consumer Affairs, Food & Public Distribution (DoCA)
-- ============================================================================

-- Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. User Profiles & RBAC
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('farmer', 'fpo_admin', 'bulk_buyer', 'consumer_group', 'transporter', 'doca_admin')),
  district TEXT NOT NULL DEFAULT 'Nashik',
  state TEXT NOT NULL DEFAULT 'Maharashtra',
  latitude FLOAT NOT NULL DEFAULT 20.0059,
  longitude FLOAT NOT NULL DEFAULT 73.7898,
  fpo_name TEXT,
  rating FLOAT DEFAULT 4.8,
  verified BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Automatic Profile Creation Trigger on auth.users Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    full_name,
    phone,
    role,
    district,
    state,
    latitude,
    longitude,
    fpo_name
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'AgriLink User'),
    COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone, NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'farmer'),
    COALESCE(NEW.raw_user_meta_data->>'district', 'Nashik'),
    COALESCE(NEW.raw_user_meta_data->>'state', 'Maharashtra'),
    COALESCE((NEW.raw_user_meta_data->>'latitude')::FLOAT, 20.0059),
    COALESCE((NEW.raw_user_meta_data->>'longitude')::FLOAT, 73.7898),
    NEW.raw_user_meta_data->>'fpo_name'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 2. Crop Inventory Listings
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crop_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  crop_name TEXT NOT NULL,
  variety TEXT,
  quantity_kg FLOAT NOT NULL CHECK (quantity_kg > 0),
  asking_price_per_kg FLOAT NOT NULL CHECK (asking_price_per_kg > 0),
  mandi_benchmark_price FLOAT,
  quality_grade TEXT NOT NULL CHECK (quality_grade IN ('Grade A', 'Grade B', 'Grade C')),
  harvest_date DATE NOT NULL,
  location_name TEXT DEFAULT 'Nashik Farm Cluster',
  latitude FLOAT NOT NULL DEFAULT 20.0059,
  longitude FLOAT NOT NULL DEFAULT 73.7898,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'aggregating', 'matched', 'sold')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 3. Buyer Requirements
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.buyer_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  crop_name TEXT NOT NULL,
  variety TEXT,
  required_quantity_kg FLOAT NOT NULL CHECK (required_quantity_kg > 0),
  max_price_per_kg FLOAT NOT NULL CHECK (max_price_per_kg > 0),
  preferred_quality_grade TEXT CHECK (preferred_quality_grade IN ('Grade A', 'Grade B', 'Grade C')),
  delivery_deadline TIMESTAMPTZ NOT NULL,
  destination_name TEXT NOT NULL,
  destination_lat FLOAT NOT NULL,
  destination_lng FLOAT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'matched', 'fulfilled', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 4. Aggregated Orders & Batches (Knapsack Lots)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.aggregated_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id UUID REFERENCES public.buyer_requirements(id) ON DELETE SET NULL,
  crop_name TEXT NOT NULL,
  quality_grade TEXT NOT NULL DEFAULT 'Grade A',
  total_quantity_kg FLOAT NOT NULL,
  pooled_farmer_ids JSONB NOT NULL DEFAULT '[]'::JSONB, -- Array of farmer UUIDs with allocation
  hub_location JSONB NOT NULL DEFAULT '{}'::JSONB,
  avg_price_per_kg FLOAT NOT NULL,
  cluster_radius_km FLOAT DEFAULT 25.0,
  status TEXT NOT NULL DEFAULT 'aggregating' CHECK (status IN ('aggregating', 'confirmed', 'in_transit', 'delivered')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 5. Optimized Logistics Routes (CVRP Solution)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.logistics_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_code TEXT UNIQUE NOT NULL,
  aggregated_order_id UUID REFERENCES public.aggregated_orders(id) ON DELETE CASCADE,
  transporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  vehicle_number TEXT NOT NULL DEFAULT 'MH-15-EG-4829',
  vehicle_type TEXT NOT NULL DEFAULT 'Eicher Pro 2049 (2.5T)',
  vehicle_capacity_kg FLOAT NOT NULL DEFAULT 2500.0,
  current_load_kg FLOAT NOT NULL,
  route_waypoints JSONB NOT NULL, -- Sequenced array of pickup stops with lat/lng
  total_distance_km FLOAT NOT NULL,
  estimated_time_minutes INT NOT NULL,
  estimated_cost_inr FLOAT NOT NULL,
  fuel_saved_inr FLOAT DEFAULT 0.0,
  route_geojson JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'picking_up', 'in_transit', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS across all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crop_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aggregated_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logistics_routes ENABLE ROW LEVEL SECURITY;

-- Helper function to fetch current auth user role
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 1. Profiles Policies
CREATE POLICY "Public profiles are readable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- 2. Crop Inventory Policies
CREATE POLICY "Anyone authenticated can view crop inventory"
  ON public.crop_inventory FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Farmers can insert their own crop listings"
  ON public.crop_inventory FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = farmer_id OR
    public.get_auth_user_role() IN ('farmer', 'fpo_admin', 'doca_admin')
  );

CREATE POLICY "Farmers can update their own crop listings"
  ON public.crop_inventory FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = farmer_id OR
    public.get_auth_user_role() IN ('fpo_admin', 'doca_admin')
  );

CREATE POLICY "Farmers can delete their own crop listings"
  ON public.crop_inventory FOR DELETE
  TO authenticated
  USING (
    auth.uid() = farmer_id OR
    public.get_auth_user_role() = 'doca_admin'
  );

-- 3. Buyer Requirements Policies
CREATE POLICY "Anyone authenticated can view buyer requirements"
  ON public.buyer_requirements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Buyers can create requirements"
  ON public.buyer_requirements FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = buyer_id OR
    public.get_auth_user_role() IN ('bulk_buyer', 'consumer_group', 'doca_admin')
  );

CREATE POLICY "Buyers can update their own requirements"
  ON public.buyer_requirements FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = buyer_id OR
    public.get_auth_user_role() = 'doca_admin'
  );

-- 4. Aggregated Orders Policies
CREATE POLICY "Aggregated orders are viewable by all authenticated roles"
  ON public.aggregated_orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Buyers, FPOs, and Admins can create/update aggregated orders"
  ON public.aggregated_orders FOR ALL
  TO authenticated
  USING (
    public.get_auth_user_role() IN ('bulk_buyer', 'fpo_admin', 'doca_admin', 'transporter')
  );

-- 5. Logistics Routes Policies
CREATE POLICY "Logistics routes are viewable by all authenticated roles"
  ON public.logistics_routes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Transporters and Admins can update route status"
  ON public.logistics_routes FOR ALL
  TO authenticated
  USING (
    auth.uid() = transporter_id OR
    public.get_auth_user_role() IN ('transporter', 'doca_admin', 'fpo_admin')
  );
