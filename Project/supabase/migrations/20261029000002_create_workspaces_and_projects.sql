-- ============================================================================
-- Migration: 20261029000002_create_workspaces_and_projects.sql
-- Description: Creates persistent workspaces & projects tables with RLS policies,
--              supporting multi-device synchronization and ownership isolation.
-- ============================================================================

-- 1. Create or ensure update_timestamp function exists
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. WORKSPACES TABLE (Canonical workspace and project metadata table)
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  workspace_name TEXT,
  description TEXT,
  category TEXT DEFAULT 'General Analytics',
  status TEXT DEFAULT 'active',
  health TEXT DEFAULT 'On Track',
  health_status TEXT DEFAULT 'ontrack',
  health_score INT DEFAULT 100,
  progress INT DEFAULT 0,
  workspace_state JSONB DEFAULT '{}'::jsonb,
  stats JSONB DEFAULT '{}'::jsonb,
  members JSONB DEFAULT '[]'::jsonb,
  dataset_ids JSONB DEFAULT '[]'::jsonb,
  dataset_names JSONB DEFAULT '[]'::jsonb,
  milestones JSONB DEFAULT '[]'::jsonb,
  risks JSONB DEFAULT '[]'::jsonb,
  models JSONB DEFAULT '[]'::jsonb,
  is_personal BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure workspace_name is synced with name if null
CREATE OR REPLACE FUNCTION public.sync_workspace_name_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.name IS NULL AND NEW.workspace_name IS NOT NULL THEN
    NEW.name = NEW.workspace_name;
  ELSIF NEW.workspace_name IS NULL AND NEW.name IS NOT NULL THEN
    NEW.workspace_name = NEW.name;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_workspaces_sync_name ON public.workspaces;
CREATE TRIGGER tr_workspaces_sync_name
  BEFORE INSERT OR UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.sync_workspace_name_columns();

DROP TRIGGER IF EXISTS tr_workspaces_updated_at ON public.workspaces;
CREATE TRIGGER tr_workspaces_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

-- 3. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- 4. WORKSPACES RLS POLICIES (Tenant isolation: users read/write only their own records)
DROP POLICY IF EXISTS "Users can view own workspaces" ON public.workspaces;
CREATE POLICY "Users can view own workspaces"
  ON public.workspaces FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can insert own workspaces" ON public.workspaces;
CREATE POLICY "Users can insert own workspaces"
  ON public.workspaces FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can update own workspaces" ON public.workspaces;
CREATE POLICY "Users can update own workspaces"
  ON public.workspaces FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can delete own workspaces" ON public.workspaces;
CREATE POLICY "Users can delete own workspaces"
  ON public.workspaces FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- 5. CREATE PROJECTS VIEW (Aliasing workspaces for universal compatibility)
CREATE OR REPLACE VIEW public.projects AS
  SELECT * FROM public.workspaces;

-- 6. GRANT NECESSARY ROLES
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspaces TO authenticated;
GRANT ALL ON public.workspaces TO service_role;

