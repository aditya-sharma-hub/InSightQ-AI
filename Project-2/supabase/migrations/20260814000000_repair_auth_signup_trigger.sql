-- ============================================================================
-- InsightIQ AI — Minimal Targeted Auth Signup Repair Migration
-- Migration: 20260814000000_repair_auth_signup_trigger.sql
-- Description:
--   1. Ensures missing columns exist on auxiliary tables (profiles, user_preferences, user_activity).
--   2. Replaces handle_new_user() trigger function to extract and store selected workspace role,
--      prevent privilege escalation to Administrator, and isolate auxiliary inserts with exception handling.
--   3. Re-attaches trigger on auth.users and reinforces profile RLS policies.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Ensure Columns Exist (Non-destructive)
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'Data Analyst';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role_configured BOOLEAN DEFAULT false;

ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true;

ALTER TABLE public.user_activity ADD COLUMN IF NOT EXISTS action TEXT;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_activity' AND column_name = 'activity') THEN
    UPDATE public.user_activity SET action = activity WHERE action IS NULL;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. Resilient handle_new_user() Auth Trigger Function
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  selected_role TEXT;
  clean_role TEXT;
BEGIN
  -- Extract and sanitize requested role from user metadata (strictly forbid self-assigning Administrator)
  clean_role := lower(regexp_replace(trim(COALESCE(NEW.raw_user_meta_data->>'role', '')), '[\s_-]+', '_', 'g'));
  IF clean_role IN ('data_scientist', 'scientist', 'ml_engineer', 'ai_engineer') THEN
    selected_role := 'Data Scientist';
  ELSIF clean_role IN ('project_manager', 'pm', 'product_manager', 'program_manager') THEN
    selected_role := 'Project Manager';
  ELSE
    selected_role := 'Data Analyst';
  END IF;

  -- 1. Create Profile Record
  INSERT INTO public.profiles (id, email, full_name, avatar_url, role, role_configured, provider)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', NULL),
    selected_role,
    true,
    COALESCE(NEW.raw_app_meta_data->>'provider', 'email')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    role = COALESCE(public.profiles.role, EXCLUDED.role),
    role_configured = COALESCE(public.profiles.role_configured, true),
    updated_at = NOW();

  -- 2. Create User Preferences Record safely (isolated)
  BEGIN
    INSERT INTO public.user_preferences (user_id, theme, language, timezone, currency, email_notifications)
    VALUES (NEW.id, 'dark', 'en', 'Asia/Kolkata', 'INR', true)
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'user_preferences logging skipped during signup: %', SQLERRM;
  END;

  -- 3. Record Initial Activity Log safely (isolated)
  BEGIN
    INSERT INTO public.user_activity (user_id, action)
    VALUES (NEW.id, 'Account Registered & Provisioned');
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'user_activity logging skipped during signup: %', SQLERRM;
  END;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Prevent any downstream trigger failure from aborting the user signup transaction
  RAISE WARNING 'handle_new_user error: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 3. Re-attach Trigger to auth.users
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 4. Verify & Maintain Profile RLS Policies
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
CREATE POLICY "Users can delete own profile" ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = id);

