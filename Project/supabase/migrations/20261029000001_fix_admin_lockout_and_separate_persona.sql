-- ============================================================================
-- InsightIQ AI — Fix Administrator Lockout & Separate Workspace Persona
-- Target Account: adityasharmand@gmail.com
-- Migration: 20261029000001_fix_admin_lockout_and_separate_persona.sql
-- Description:
--   1. Adds 'workspace_persona' column to public.profiles to decouple
--      workspace viewing lens from trusted authorization roles.
--   2. Explicitly and safely restores canonical 'Administrator' role for
--      designated account 'adityasharmand@gmail.com' while setting workspace_persona
--      to 'Data Analyst' without client-side spoofing or unverified metadata.
--   3. Hardens server-side anti-escalation trigger tr_enforce_profile_role_security
--      to prevent accidental demotion when administrators switch workspace views.
--   4. Updates atomic workspace role switching RPC function to preserve
--      'Administrator' authorization role while updating 'workspace_persona'.
--   5. Logs the explicit recovery and separation in public.user_activity.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Ensure 'workspace_persona' column exists on public.profiles
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS workspace_persona TEXT DEFAULT NULL;

-- ----------------------------------------------------------------------------
-- 2. Trusted Server-Side Administrator Access Restoration
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_target_email CONSTANT TEXT := 'adityasharmand@gmail.com';
  v_user_count INTEGER;
  v_user RECORD;
  v_existing_profile RECORD;
BEGIN
  -- Verify existence and uniqueness in auth.users
  SELECT COUNT(*) INTO v_user_count
  FROM auth.users
  WHERE lower(email) = lower(v_target_email);

  IF v_user_count = 0 THEN
    RAISE EXCEPTION 'Administrator recovery aborted: Account "%" does not exist in auth.users.', v_target_email
      USING ERRCODE = 'P0002';
  ELSIF v_user_count > 1 THEN
    RAISE EXCEPTION 'Administrator recovery aborted: Ambiguous account. Found % users with email "%" in auth.users.', v_user_count, v_target_email
      USING ERRCODE = '23505';
  END IF;

  -- Fetch authoritative user record from auth.users
  SELECT id, email, confirmed_at, email_confirmed_at, raw_user_meta_data
  INTO v_user
  FROM auth.users
  WHERE lower(email) = lower(v_target_email);

  -- Strict Precondition: Verify email confirmation status
  IF v_user.confirmed_at IS NULL AND v_user.email_confirmed_at IS NULL THEN
    RAISE EXCEPTION 'Administrator recovery aborted: Account "%" (ID: %) is not confirmed. Email confirmation is required.', v_target_email, v_user.id
      USING ERRCODE = '42501';
  END IF;

  -- Check existing profile record
  SELECT * INTO v_existing_profile
  FROM public.profiles
  WHERE id = v_user.id;

  -- Transactionally restore canonical 'Administrator' role and separate workspace_persona
  IF v_existing_profile.id IS NOT NULL THEN
    UPDATE public.profiles
    SET
      role = 'Administrator',
      role_configured = true,
      workspace_persona = COALESCE(v_existing_profile.workspace_persona, 'Data Analyst'),
      updated_at = NOW()
    WHERE id = v_user.id;
  ELSE
    INSERT INTO public.profiles (
      id,
      email,
      full_name,
      avatar_url,
      role,
      workspace_persona,
      role_configured,
      provider,
      created_at,
      updated_at
    )
    VALUES (
      v_user.id,
      lower(v_target_email),
      COALESCE(v_user.raw_user_meta_data->>'full_name', v_user.raw_user_meta_data->>'name', split_part(v_target_email, '@', 1)),
      COALESCE(v_user.raw_user_meta_data->>'avatar_url', v_user.raw_user_meta_data->>'picture', NULL),
      'Administrator',
      'Data Analyst',
      true,
      'email',
      NOW(),
      NOW()
    );
  END IF;

  -- Mandatory Transactional Audit Log
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_activity' AND column_name = 'action') THEN
    INSERT INTO public.user_activity (user_id, action)
    VALUES (
      v_user.id,
      'Administrator Access Restored & Workspace Persona Separated (adityasharmand@gmail.com)'
    );
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_activity' AND column_name = 'activity') THEN
    EXECUTE 'INSERT INTO public.user_activity (user_id, activity) VALUES ($1, $2)'
    USING
      v_user.id,
      'Administrator Access Restored & Workspace Persona Separated (adityasharmand@gmail.com)';
  END IF;

  RAISE NOTICE 'SUCCESS: Account "%" (ID: %) restored with role "Administrator" and workspace persona "Data Analyst".', v_target_email, v_user.id;
END $$;

-- ----------------------------------------------------------------------------
-- 3. Hardened Trigger: Prevent Accidental Demotion & Enforce Anti-Escalation
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

  -- ACCIDENTAL DEMOTION PREVENTION:
  -- If user is already an Administrator, retain 'Administrator' authorization role
  -- and redirect the requested workspace view into workspace_persona.
  IF TG_OP = 'UPDATE' AND (OLD.role = 'Administrator' OR OLD.role = 'admin') THEN
    IF NEW.role != 'Administrator' THEN
      NEW.workspace_persona := NEW.role;
      NEW.role := 'Administrator';
    END IF;
  END IF;

  -- STRICT ANTI-ESCALATION ENFORCEMENT:
  -- Non-administrators cannot self-assign the Administrator role.
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
-- 4. Atomic Role & Persona Switching RPC
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_user_workspace_role(new_role TEXT)
RETURNS JSONB AS $$
DECLARE
  user_id UUID;
  clean_role TEXT;
  normalized_role TEXT;
  target_role TEXT;
  current_user_role TEXT;
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

  -- Check current role of the user
  SELECT role INTO current_user_role FROM public.profiles WHERE id = user_id;

  -- If user is an Administrator, preserve Administrator authorization role and switch workspace_persona
  IF current_user_role = 'Administrator' OR current_user_role = 'admin' THEN
    UPDATE public.profiles
    SET 
      workspace_persona = target_role,
      role = 'Administrator',
      role_configured = true,
      updated_at = NOW()
    WHERE id = user_id
    RETURNING * INTO updated_record;
  ELSE
    UPDATE public.profiles
    SET 
      role = target_role,
      workspace_persona = target_role,
      role_configured = true,
      updated_at = NOW()
    WHERE id = user_id
    RETURNING * INTO updated_record;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found for id %', user_id USING ERRCODE = 'P0002';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', updated_record.id,
    'role', updated_record.role,
    'workspace_persona', updated_record.workspace_persona,
    'role_configured', updated_record.role_configured,
    'updated_at', updated_record.updated_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

