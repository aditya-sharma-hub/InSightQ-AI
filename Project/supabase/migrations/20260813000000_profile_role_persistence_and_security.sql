-- ============================================================================
-- InsightIQ AI — Role Persistence, Security Enforcement & User Role Switching
-- Migration: 20260813000000_profile_role_persistence_and_security.sql
-- Description:
--   1. Ensures RLS policies support SELECT, INSERT, and UPDATE for authenticated users on their own profiles.
--   2. Enforces server-side authorization check preventing non-admins from self-assigning 'Administrator'.
--   3. Adds RPC function 'update_user_workspace_role' for atomic, validated workspace role updates.
--   4. Standardizes canonical role storage and updates 'role_configured' flag.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Ensure columns exist on public.profiles
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'Data Analyst';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role_configured BOOLEAN DEFAULT false;

-- ----------------------------------------------------------------------------
-- 2. Update Row Level Security (RLS) Policies on public.profiles
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- SELECT policy: Users can only read their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- INSERT policy: Users can insert their own profile (required for upsert operations)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- UPDATE policy: Users can only update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- DELETE policy: Users can only delete their own profile
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
CREATE POLICY "Users can delete own profile"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- 3. Server-side Trigger: Enforce Role Security & Prevent Unauthorized Escalation
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_profile_role_security()
RETURNS TRIGGER AS $$
DECLARE
  calling_uid UUID;
  normalized_new_role TEXT;
BEGIN
  calling_uid := auth.uid();
  normalized_new_role := lower(regexp_replace(trim(COALESCE(NEW.role, '')), '[\s_-]+', '_', 'g'));

  -- Canonicalize permitted workspace roles
  IF normalized_new_role IN ('data_analyst', 'analyst', 'business_analyst', 'student', 'researcher') THEN
    NEW.role := 'Data Analyst';
  ELSIF normalized_new_role IN ('data_scientist', 'scientist', 'ml_engineer', 'ai_engineer') THEN
    NEW.role := 'Data Scientist';
  ELSIF normalized_new_role IN ('project_manager', 'pm', 'product_manager', 'program_manager') THEN
    NEW.role := 'Project Manager';
  ELSIF normalized_new_role IN ('admin', 'administrator', 'system_admin', 'superadmin') THEN
    NEW.role := 'Administrator';
  ELSE
    IF TG_OP = 'UPDATE' AND OLD.role IS NOT NULL THEN
      NEW.role := OLD.role;
    ELSE
      NEW.role := 'Data Analyst';
    END IF;
  END IF;

  -- CRITICAL SECURITY ENFORCEMENT: Self-assignment of 'Administrator' is strictly forbidden
  -- Only existing administrators or background service workers (calling_uid IS NULL) may retain or grant Administrator
  IF NEW.role = 'Administrator' THEN
    IF calling_uid IS NOT NULL THEN
      IF TG_OP = 'UPDATE' THEN
        IF OLD.role IS DISTINCT FROM 'Administrator' AND OLD.role IS DISTINCT FROM 'admin' THEN
          RAISE EXCEPTION 'Access Denied: The Administrator role grants privileged system access and cannot be self-assigned. Contact a system administrator.'
            USING ERRCODE = '42501';
        END IF;
      ELSIF TG_OP = 'INSERT' THEN
        RAISE EXCEPTION 'Access Denied: The Administrator role grants privileged system access and cannot be self-assigned during onboarding.'
          USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  NEW.role_configured := true;
  NEW.updated_at := NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_enforce_profile_role_security ON public.profiles;
CREATE TRIGGER tr_enforce_profile_role_security
  BEFORE INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_role_security();

-- ----------------------------------------------------------------------------
-- 4. Atomic Role Switching RPC for Authenticated Clients
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_user_workspace_role(new_role TEXT)
RETURNS JSONB AS $$
DECLARE
  user_id UUID;
  clean_role TEXT;
  normalized_role TEXT;
  target_role TEXT;
  updated_record RECORD;
BEGIN
  user_id := auth.uid();
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to update workspace role.' USING ERRCODE = '42501';
  END IF;

  clean_role := trim(COALESCE(new_role, ''));
  normalized_role := lower(regexp_replace(clean_role, '[\s_-]+', '_', 'g'));

  -- Validate allowlist of user-selectable roles
  IF normalized_role IN ('data_analyst', 'analyst', 'business_analyst', 'student', 'researcher') THEN
    target_role := 'Data Analyst';
  ELSIF normalized_role IN ('data_scientist', 'scientist', 'ml_engineer', 'ai_engineer') THEN
    target_role := 'Data Scientist';
  ELSIF normalized_role IN ('project_manager', 'pm', 'product_manager', 'program_manager') THEN
    target_role := 'Project Manager';
  ELSE
    RAISE EXCEPTION 'Invalid role "%". Users may only select Data Analyst, Data Scientist, or Project Manager.', clean_role
      USING ERRCODE = '22023';
  END IF;

  -- Update the authoritative profile record
  UPDATE public.profiles
  SET 
    role = target_role,
    role_configured = true,
    updated_at = NOW()
  WHERE id = user_id
  RETURNING * INTO updated_record;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found for id %', user_id USING ERRCODE = 'P0002';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', updated_record.id,
    'role', updated_record.role,
    'role_configured', updated_record.role_configured,
    'updated_at', updated_record.updated_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
