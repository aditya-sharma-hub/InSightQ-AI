-- ============================================================================
-- Migration: 004_auth_triggers.sql
-- Description: Automated User Provisioning Trigger (Auth Signup)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Create Profile Record
  INSERT INTO public.profiles (id, email, full_name, avatar_url, provider)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', NULL),
    COALESCE(NEW.raw_app_meta_data->>'provider', 'email')
  )
  ON CONFLICT (id) DO NOTHING;

  -- 2. Create User Preferences Record
  INSERT INTO public.user_preferences (user_id, theme, language, timezone, currency, email_notifications)
  VALUES (NEW.id, 'dark', 'en', 'Asia/Kolkata', 'INR', true)
  ON CONFLICT (user_id) DO NOTHING;

  -- 3. Record Initial Activity Log
  INSERT INTO public.user_activity (user_id, action)
  VALUES (NEW.id, 'Account Registered & Provisioned');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach Trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
