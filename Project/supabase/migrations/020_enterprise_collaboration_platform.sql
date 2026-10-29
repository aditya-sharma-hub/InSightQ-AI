-- ============================================================================
-- Migration: 020_enterprise_collaboration_platform.sql
-- Description: Enterprise Collaboration & Platform Features Schema & RLS Policies
-- ============================================================================

-- 1. WORKSPACES TABLE
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  workspace_name TEXT NOT NULL,
  description TEXT,
  is_personal BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_user_workspace_name UNIQUE (owner_id, workspace_name)
);

-- 2. SAVED ANALYSES TABLE
CREATE TABLE IF NOT EXISTS public.saved_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  dataset_id UUID REFERENCES public.datasets(id) ON DELETE CASCADE,
  dataset_version_id UUID REFERENCES public.dataset_versions(id) ON DELETE SET NULL,
  analysis_name TEXT NOT NULL,
  analysis_type TEXT NOT NULL,
  selected_columns JSONB DEFAULT '[]'::jsonb,
  filters JSONB DEFAULT '{}'::jsonb,
  statistical_config JSONB DEFAULT '{}'::jsonb,
  bi_config JSONB DEFAULT '{}'::jsonb,
  ai_config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'success', 'warning', 'error')),
  read BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. RESOURCE SHARES TABLE
CREATE TABLE IF NOT EXISTS public.resource_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('dashboard', 'report', 'analysis')),
  resource_id UUID NOT NULL,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  share_token TEXT DEFAULT encode(gen_random_bytes(16), 'hex') UNIQUE,
  share_status TEXT DEFAULT 'active' CHECK (share_status IN ('active', 'revoked', 'expired')),
  access_permission TEXT DEFAULT 'viewer' CHECK (access_permission IN ('owner', 'editor', 'viewer')),
  expiration TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. EXTEND EXISTING TABLES SCHEMA
ALTER TABLE public.dashboard_layouts
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS filters JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.user_activity
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS dashboard_preferences JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS default_dataset_behavior JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS visualization_preferences JSONB DEFAULT '{}'::jsonb;

-- 6. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_shares ENABLE ROW LEVEL SECURITY;

-- 7. WORKSPACES RLS POLICIES
DROP POLICY IF EXISTS "Users can view own workspaces" ON public.workspaces;
CREATE POLICY "Users can view own workspaces" ON public.workspaces FOR SELECT TO authenticated USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can insert own workspaces" ON public.workspaces;
CREATE POLICY "Users can insert own workspaces" ON public.workspaces FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can update own workspaces" ON public.workspaces;
CREATE POLICY "Users can update own workspaces" ON public.workspaces FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can delete own workspaces" ON public.workspaces;
CREATE POLICY "Users can delete own workspaces" ON public.workspaces FOR DELETE TO authenticated USING (auth.uid() = owner_id);

-- 8. SAVED ANALYSES RLS POLICIES
DROP POLICY IF EXISTS "Users can view own saved analyses" ON public.saved_analyses;
CREATE POLICY "Users can view own saved analyses" ON public.saved_analyses FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own saved analyses" ON public.saved_analyses;
CREATE POLICY "Users can insert own saved analyses" ON public.saved_analyses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own saved analyses" ON public.saved_analyses;
CREATE POLICY "Users can update own saved analyses" ON public.saved_analyses FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own saved analyses" ON public.saved_analyses;
CREATE POLICY "Users can delete own saved analyses" ON public.saved_analyses FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 9. NOTIFICATIONS RLS POLICIES
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notifications;
CREATE POLICY "Users can insert own notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 10. RESOURCE SHARES RLS POLICIES
DROP POLICY IF EXISTS "Users can view own resource shares" ON public.resource_shares;
CREATE POLICY "Users can view own resource shares" ON public.resource_shares FOR SELECT TO authenticated USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can insert own resource shares" ON public.resource_shares;
CREATE POLICY "Users can insert own resource shares" ON public.resource_shares FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can update own resource shares" ON public.resource_shares;
CREATE POLICY "Users can update own resource shares" ON public.resource_shares FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can delete own resource shares" ON public.resource_shares;
CREATE POLICY "Users can delete own resource shares" ON public.resource_shares FOR DELETE TO authenticated USING (auth.uid() = owner_id);

-- 11. INDEXES FOR HIGH-PERFORMANCE QUERYING
CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON public.workspaces (owner_id);
CREATE INDEX IF NOT EXISTS idx_saved_analyses_user ON public.saved_analyses (user_id);
CREATE INDEX IF NOT EXISTS idx_saved_analyses_workspace ON public.saved_analyses (workspace_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications (user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_resource_shares_owner ON public.resource_shares (owner_id);
CREATE INDEX IF NOT EXISTS idx_resource_shares_token ON public.resource_shares (share_token);

-- 12. REALTIME PUBLICATION SETUP
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN
    ALTER TABLE public.notifications REPLICA IDENTITY FULL;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications; EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'workspaces') THEN
    ALTER TABLE public.workspaces REPLICA IDENTITY FULL;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.workspaces; EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'saved_analyses') THEN
    ALTER TABLE public.saved_analyses REPLICA IDENTITY FULL;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.saved_analyses; EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;
END $$;
