-- ============================================================================
-- InsightIQ AI — Dedicated Administrator Provisioning Migration
-- Target Account: adityasharmand@gmail.com
-- Migration File: Project/supabase/migrations/20261029000000_provision_dedicated_administrator.sql
-- ============================================================================

DO $$
DECLARE
  v_target_email CONSTANT TEXT := 'adityasharmand@gmail.com';
  v_user_count INTEGER;
  v_user RECORD;
  v_existing_profile RECORD;
BEGIN
  -- 1. Verify existence and uniqueness in auth.users
  SELECT COUNT(*) INTO v_user_count
  FROM auth.users
  WHERE lower(email) = lower(v_target_email);

  IF v_user_count = 0 THEN
    RAISE EXCEPTION 'Administrator provisioning aborted: Account "%" does not exist in auth.users. Please create the user in Supabase Authentication -> Users first.', v_target_email
      USING ERRCODE = 'P0002';
  ELSIF v_user_count > 1 THEN
    RAISE EXCEPTION 'Administrator provisioning aborted: Ambiguous account. Found % users with email "%" in auth.users.', v_user_count, v_target_email
      USING ERRCODE = '23505';
  END IF;

  -- 2. Fetch authoritative user record
  SELECT id, email, confirmed_at, email_confirmed_at, raw_user_meta_data
  INTO v_user
  FROM auth.users
  WHERE lower(email) = lower(v_target_email);

  -- 3. Strict Precondition: Verify email confirmation status
  -- Fails immediately if email confirmation is missing
  IF v_user.confirmed_at IS NULL AND v_user.email_confirmed_at IS NULL THEN
    RAISE EXCEPTION 'Administrator provisioning aborted: Account "%" (ID: %) is not confirmed. Email confirmation is required before granting administrator privileges. In Supabase Dashboard -> Authentication -> Users, select "Confirm user" for this account.', v_target_email, v_user.id
      USING ERRCODE = '42501';
  END IF;

  -- 4. Check for existing profile record
  SELECT * INTO v_existing_profile
  FROM public.profiles
  WHERE id = v_user.id;

  -- 5. Transactionally and idempotently assign the canonical 'Administrator' role
  -- Preserves existing full_name, avatar_url, created_at, provider, and any custom attributes
  IF v_existing_profile.id IS NOT NULL THEN
    UPDATE public.profiles
    SET
      role = 'Administrator',
      role_configured = true,
      updated_at = NOW()
    WHERE id = v_user.id;
  ELSE
    INSERT INTO public.profiles (
      id,
      email,
      full_name,
      avatar_url,
      role,
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
      true,
      'email',
      NOW(),
      NOW()
    );
  END IF;

  -- 6. Mandatory Transactional Audit Log
  -- Inserts into confirmed schema columns (user_id, action) without depending on unverified auxiliary columns
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_activity' AND column_name = 'action') THEN
    INSERT INTO public.user_activity (user_id, action)
    VALUES (
      v_user.id,
      'Dedicated Administrator Provisioned (adityasharmand@gmail.com)'
    );
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_activity' AND column_name = 'activity') THEN
    EXECUTE 'INSERT INTO public.user_activity (user_id, activity) VALUES ($1, $2)'
    USING
      v_user.id,
      'Dedicated Administrator Provisioned (adityasharmand@gmail.com)';
  ELSE
    RAISE EXCEPTION 'Audit logging table public.user_activity does not have required action or activity column.'
      USING ERRCODE = '42703';
  END IF;

  RAISE NOTICE 'SUCCESS: Account "%" (ID: %) verified and provisioned with canonical role "Administrator".', v_target_email, v_user.id;
END $$;
