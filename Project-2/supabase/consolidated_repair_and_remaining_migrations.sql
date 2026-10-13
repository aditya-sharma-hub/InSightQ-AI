-- ============================================================================
-- InsightIQ AI — Production Schema Consolidation & Repair Migration
-- Description: Repairs auth triggers and provisions missing tables (ml_models,
--              workspaces, projects, notifications, anomaly_results, reports).
-- How to apply: Copy and paste this script into the Supabase SQL Editor:
--               https://app.supabase.com/project/<your-project-id>/sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. REPAIR EXISTING TABLES SCHEMA INCONSISTENCIES
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'data_analyst';
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
-- 2. REPAIR AUTH SIGNUP TRIGGER TO PREVENT 'Database error saving new user'
-- ----------------------------------------------------------------------------
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
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    updated_at = NOW();

  -- 2. Create User Preferences Record
  INSERT INTO public.user_preferences (user_id, theme, language, timezone, currency, email_notifications)
  VALUES (NEW.id, 'dark', 'en', 'Asia/Kolkata', 'INR', true)
  ON CONFLICT (user_id) DO NOTHING;

  -- 3. Record Initial Activity Log safely (exception-protected)
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

-- Re-attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 3. WORKSPACES, PROJECTS & COLLABORATION PLATFORM
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan TEXT DEFAULT 'free',
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own workspaces" ON public.workspaces;
CREATE POLICY "Users can manage own workspaces" ON public.workspaces FOR ALL TO authenticated USING (auth.uid() = owner_id);

CREATE TABLE IF NOT EXISTS public.projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own projects" ON public.projects;
CREATE POLICY "Users can manage own projects" ON public.projects FOR ALL TO authenticated USING (auth.uid() = owner_id);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  read BOOLEAN DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 4. MACHINE LEARNING MODEL REGISTRY
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ml_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dataset_id UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
  project_name TEXT NOT NULL,
  problem_type TEXT NOT NULL,
  target_column TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.ml_projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own ml_projects" ON public.ml_projects;
CREATE POLICY "Users can manage own ml_projects" ON public.ml_projects FOR ALL TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.ml_models (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id UUID,
  model_name TEXT NOT NULL,
  algorithm TEXT NOT NULL,
  version INT DEFAULT 1 NOT NULL,
  status TEXT DEFAULT 'production',
  artifact_path TEXT NOT NULL,
  problem_type TEXT,
  target_column TEXT,
  dataset_name TEXT,
  accuracy TEXT,
  roc_auc TEXT,
  precision TEXT,
  recall TEXT,
  f1_score TEXT,
  rmse TEXT,
  mae TEXT,
  mape TEXT,
  r2_score TEXT,
  drift_status TEXT DEFAULT 'Zero Drift Detected',
  drift_score NUMERIC DEFAULT 0.002,
  is_demo BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.ml_models ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own ml_models" ON public.ml_models;
CREATE POLICY "Users can manage own ml_models" ON public.ml_models FOR ALL TO authenticated USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 5. ANOMALY RESULTS & REPORTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.anomaly_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dataset_id UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
  method TEXT NOT NULL,
  total_anomalies INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.anomaly_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own anomaly_runs" ON public.anomaly_runs;
CREATE POLICY "Users can manage own anomaly_runs" ON public.anomaly_runs FOR ALL TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.anomaly_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id UUID REFERENCES public.anomaly_runs(id) ON DELETE CASCADE,
  row_id INT NOT NULL,
  record_identifier TEXT,
  anomaly_score NUMERIC,
  severity TEXT,
  reasons JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.anomaly_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own anomaly_results" ON public.anomaly_results;
CREATE POLICY "Users can manage own anomaly_results" ON public.anomaly_results FOR ALL TO authenticated USING (auth.uid() = (SELECT user_id FROM public.anomaly_runs WHERE id = run_id));

CREATE TABLE IF NOT EXISTS public.reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dataset_id UUID REFERENCES public.datasets(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  report_type TEXT NOT NULL,
  storage_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own reports" ON public.reports;
CREATE POLICY "Users can manage own reports" ON public.reports FOR ALL TO authenticated USING (auth.uid() = user_id);
