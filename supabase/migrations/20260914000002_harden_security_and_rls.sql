-- ============================================================================
-- AGRILINK AI - SECURITY HARDENING & ROW-LEVEL SECURITY (RLS) MIGRATION
-- Ministry of Consumer Affairs, Food & Public Distribution (DoCA) - SIH26033
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Helper Function: Trusted Role Extraction (Non-Recursive & Scoped)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- If not authenticated, return anonymous
  IF auth.uid() IS NULL THEN
    RETURN 'anon';
  END IF;

  -- Strictly query only the authenticated caller's profile row
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = auth.uid();
  
  RETURN COALESCE(user_role, 'farmer');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ----------------------------------------------------------------------------
-- 2. Prevent Public Registration Role Escalation
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  requested_role TEXT;
  assigned_role TEXT;
BEGIN
  requested_role := LOWER(COALESCE(NEW.raw_user_meta_data->>'role', 'farmer'));
  
  -- Strict Escalation Protection: Block public registration as doca_admin
  -- doca_admin must only be provisioned via SQL Editor or admin_assign_user_role()
  IF requested_role NOT IN ('farmer', 'fpo_admin', 'bulk_buyer', 'consumer_group', 'transporter') THEN
    assigned_role := 'farmer';
  ELSE
    assigned_role := requested_role;
  END IF;

  INSERT INTO public.profiles (
    id,
    full_name,
    phone,
    role,
    district,
    state,
    latitude,
    longitude,
    fpo_name,
    verified
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'AgriLink User'),
    COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone, NEW.email),
    assigned_role,
    COALESCE(NEW.raw_user_meta_data->>'district', 'Nashik'),
    COALESCE(NEW.raw_user_meta_data->>'state', 'Maharashtra'),
    COALESCE((NEW.raw_user_meta_data->>'latitude')::FLOAT, 20.0059),
    COALESCE((NEW.raw_user_meta_data->>'longitude')::FLOAT, 73.7898),
    NEW.raw_user_meta_data->>'fpo_name',
    FALSE
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 3. Prevent Self-Elevation of Role / Verified in Profiles Table
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_profile_immutable_fields()
RETURNS TRIGGER AS $$
DECLARE
  caller_role TEXT;
BEGIN
  -- If executed by postgres superuser / service_role (SQL Editor or Backend API key), allow update
  IF auth.uid() IS NULL THEN
    NEW.updated_at := NOW();
    RETURN NEW;
  END IF;

  -- If an authenticated user is updating their own profile
  IF auth.uid() = OLD.id THEN
    -- Check if user is trying to change their own role
    IF NEW.role <> OLD.role THEN
      RAISE EXCEPTION 'Security Violation: Users cannot modify their own role.';
    END IF;
    -- Check if user is trying to verify themselves
    IF NEW.verified <> OLD.verified THEN
      RAISE EXCEPTION 'Security Violation: Verification status is managed by administrators.';
    END IF;
    -- Check if user is trying to modify their ID
    IF NEW.id <> OLD.id THEN
      RAISE EXCEPTION 'Security Violation: User ID is immutable.';
    END IF;
  ELSE
    -- If a user is updating ANOTHER user's profile, caller MUST be doca_admin
    SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();
    IF caller_role <> 'doca_admin' THEN
      RAISE EXCEPTION 'Security Violation: Unauthorized cross-user profile modification.';
    END IF;
  END IF;
  
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_protect_profile_immutable ON public.profiles;
CREATE TRIGGER trg_protect_profile_immutable
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.protect_profile_immutable_fields();

-- ----------------------------------------------------------------------------
-- 4. Authorized Server-Side / Admin Role Provisioning Procedure
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_assign_user_role(
  target_user_id UUID,
  new_role TEXT,
  set_verified BOOLEAN DEFAULT TRUE
)
RETURNS JSONB AS $$
DECLARE
  caller_role TEXT;
BEGIN
  -- Verify caller is doca_admin OR superuser/service_role
  IF auth.uid() IS NOT NULL THEN
    SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();
    IF caller_role <> 'doca_admin' THEN
      RAISE EXCEPTION 'Security Error: Only DoCA Policy Administrators can provision roles.';
    END IF;
  END IF;

  -- Validate role name
  IF new_role NOT IN ('farmer', 'fpo_admin', 'bulk_buyer', 'consumer_group', 'transporter', 'doca_admin') THEN
    RAISE EXCEPTION 'Invalid role name: %', new_role;
  END IF;

  -- Perform trusted administrative update
  UPDATE public.profiles
  SET 
    role = new_role,
    verified = set_verified,
    updated_at = NOW()
  WHERE id = target_user_id;

  RETURN jsonb_build_object(
    'status', 'success',
    'target_user_id', target_user_id,
    'assigned_role', new_role,
    'verified', set_verified
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ----------------------------------------------------------------------------
-- 5. PROFILES RLS POLICIES
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are readable by authenticated users" ON public.profiles;
CREATE POLICY "Public profiles are readable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR public.get_my_role() = 'doca_admin')
  WITH CHECK (auth.uid() = id OR public.get_my_role() = 'doca_admin');

-- ----------------------------------------------------------------------------
-- 6. CROP INVENTORY RLS POLICIES (Test A: Farmer Isolation)
-- ----------------------------------------------------------------------------
ALTER TABLE public.crop_inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can view crop inventory" ON public.crop_inventory;
CREATE POLICY "Anyone authenticated can view crop inventory"
  ON public.crop_inventory FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Farmers can insert crop listings" ON public.crop_inventory;
CREATE POLICY "Farmers can insert crop listings"
  ON public.crop_inventory FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = farmer_id AND
    public.get_my_role() IN ('farmer', 'fpo_admin', 'doca_admin')
  );

DROP POLICY IF EXISTS "Farmers can update own crop listings" ON public.crop_inventory;
CREATE POLICY "Farmers can update own crop listings"
  ON public.crop_inventory FOR UPDATE
  TO authenticated
  USING (
    (auth.uid() = farmer_id AND public.get_my_role() IN ('farmer', 'fpo_admin')) OR
    public.get_my_role() = 'doca_admin'
  )
  WITH CHECK (
    (auth.uid() = farmer_id AND public.get_my_role() IN ('farmer', 'fpo_admin')) OR
    public.get_my_role() = 'doca_admin'
  );

DROP POLICY IF EXISTS "Farmers can delete own crop listings" ON public.crop_inventory;
CREATE POLICY "Farmers can delete own crop listings"
  ON public.crop_inventory FOR DELETE
  TO authenticated
  USING (
    (auth.uid() = farmer_id AND public.get_my_role() IN ('farmer', 'fpo_admin')) OR
    public.get_my_role() = 'doca_admin'
  );

-- ----------------------------------------------------------------------------
-- 7. BUYER REQUIREMENTS RLS POLICIES (Test B: Buyer Isolation)
-- ----------------------------------------------------------------------------
ALTER TABLE public.buyer_requirements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can view buyer requirements" ON public.buyer_requirements;
CREATE POLICY "Anyone authenticated can view buyer requirements"
  ON public.buyer_requirements FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Buyers can create requirements" ON public.buyer_requirements;
CREATE POLICY "Buyers can create requirements"
  ON public.buyer_requirements FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = buyer_id AND
    public.get_my_role() IN ('bulk_buyer', 'consumer_group', 'doca_admin')
  );

DROP POLICY IF EXISTS "Buyers can update own requirements" ON public.buyer_requirements;
CREATE POLICY "Buyers can update own requirements"
  ON public.buyer_requirements FOR UPDATE
  TO authenticated
  USING (
    (auth.uid() = buyer_id AND public.get_my_role() IN ('bulk_buyer', 'consumer_group')) OR
    public.get_my_role() = 'doca_admin'
  )
  WITH CHECK (
    (auth.uid() = buyer_id AND public.get_my_role() IN ('bulk_buyer', 'consumer_group')) OR
    public.get_my_role() = 'doca_admin'
  );

DROP POLICY IF EXISTS "Buyers can delete own requirements" ON public.buyer_requirements;
CREATE POLICY "Buyers can delete own requirements"
  ON public.buyer_requirements FOR DELETE
  TO authenticated
  USING (
    (auth.uid() = buyer_id AND public.get_my_role() IN ('bulk_buyer', 'consumer_group')) OR
    public.get_my_role() = 'doca_admin'
  );

-- ----------------------------------------------------------------------------
-- 8. AGGREGATED ORDERS RLS POLICIES
-- ----------------------------------------------------------------------------
ALTER TABLE public.aggregated_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Aggregated orders viewable by all" ON public.aggregated_orders;
CREATE POLICY "Aggregated orders viewable by all"
  ON public.aggregated_orders FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authorized roles can create aggregated lots" ON public.aggregated_orders;
CREATE POLICY "Authorized roles can create aggregated lots"
  ON public.aggregated_orders FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_my_role() IN ('bulk_buyer', 'consumer_group', 'fpo_admin', 'doca_admin')
  );

DROP POLICY IF EXISTS "Authorized roles can update aggregated lots" ON public.aggregated_orders;
CREATE POLICY "Authorized roles can update aggregated lots"
  ON public.aggregated_orders FOR UPDATE
  TO authenticated
  USING (
    public.get_my_role() IN ('bulk_buyer', 'consumer_group', 'fpo_admin', 'transporter', 'doca_admin')
  );

-- ----------------------------------------------------------------------------
-- 9. LOGISTICS ROUTES RLS POLICIES (Test C: Transporter Isolation)
-- ----------------------------------------------------------------------------
ALTER TABLE public.logistics_routes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Logistics routes viewable by all" ON public.logistics_routes;
CREATE POLICY "Logistics routes viewable by all"
  ON public.logistics_routes FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Transporters and Admins can create routes" ON public.logistics_routes;
CREATE POLICY "Transporters and Admins can create routes"
  ON public.logistics_routes FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_my_role() IN ('transporter', 'fpo_admin', 'doca_admin')
  );

DROP POLICY IF EXISTS "Assigned Transporter can update route" ON public.logistics_routes;
CREATE POLICY "Assigned Transporter can update route"
  ON public.logistics_routes FOR UPDATE
  TO authenticated
  USING (
    (auth.uid() = transporter_id AND public.get_my_role() = 'transporter') OR
    public.get_my_role() = 'doca_admin'
  )
  WITH CHECK (
    (auth.uid() = transporter_id AND public.get_my_role() = 'transporter') OR
    public.get_my_role() = 'doca_admin'
  );
