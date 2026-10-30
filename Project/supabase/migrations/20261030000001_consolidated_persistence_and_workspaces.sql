-- ============================================================================
-- INSIGHTIQ AI — FINAL REVIEWED PRODUCTION MIGRATION (CORRECTED)
-- Migration Name: 20261030000001_consolidated_persistence_and_workspaces.sql
-- 
-- Description:
-- 1. Creates canonical public.workspaces table and read-compatible public.projects view.
-- 2. Configures strict Row Level Security (RLS) on workspaces & projects.
-- 3. Hardens all SECURITY DEFINER functions with explicit search_path and permission revokes.
-- 4. Enforces strict tenant ownership validation (callers cannot spoof or alter owner_id).
-- 5. Clarifies PostgreSQL view limitations: mutations and .upsert() target public.workspaces directly.
-- 6. Adds secure RPC public.upsert_workspace(workspace_record JSONB) for authorized operations.
-- 7. Ensures private Supabase Storage bucket 'datasets' with 500MB limit & folder-level RLS,
--    while PRESERVING all existing policies and access configurations for avatars, reports,
--    exports, and models.
-- 8. Hardens public.datasets with missing columns (mime_type, processing_status, description).
-- 9. Idempotently seeds initial projects using ON CONFLICT (id) DO NOTHING so that legitimate
--    subsequent changes to progress, milestones, or datasets are NEVER overwritten on re-runs.
--
-- Safety & Invariants:
-- - All operations use IF NOT EXISTS / OR REPLACE / ON CONFLICT (id) DO NOTHING.
-- - No data is deleted, dropped, or destroyed.
-- - Storage backup {userId}/meta/projects.json remains intact.
-- - Can be executed repeatedly without errors, policy conflicts, or overwriting newer state.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 0. PREFLIGHT (fail fast, change nothing, if production drifted from expectations)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_kind "char";
BEGIN
  SELECT c.relkind INTO v_kind
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'projects';
  IF v_kind IS NOT NULL AND v_kind <> 'v' THEN
    RAISE EXCEPTION 'Preflight failed: public.projects already exists as relkind "%" (expected absent or a view). Was consolidated_repair_and_remaining_migrations.sql applied?', v_kind;
  END IF;

  IF to_regclass('public.workspaces') IS NOT NULL AND EXISTS (
    SELECT 1
    FROM unnest(ARRAY['owner_id','name','workspace_name','description','category','status','health','health_status',
                      'health_score','progress','workspace_state','stats','members','dataset_ids','dataset_names',
                      'milestones','risks','models','is_personal','created_at','updated_at']) AS req(col)
    WHERE NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'workspaces' AND column_name = req.col
    )
  ) THEN
    RAISE EXCEPTION 'Preflight failed: public.workspaces already exists with a different column set (020_enterprise_collaboration_platform.sql or the repair script?). A dedicated ALTER migration is required first.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = '051cf8bc-5891-4040-b04d-6954825bdbc2'::uuid) THEN
    RAISE EXCEPTION 'Preflight failed: seed owner profile 051cf8bc-5891-4040-b04d-6954825bdbc2 not found in public.profiles.';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 1. UTILITY TRIGGERS & SEARCH_PATH HARDENING
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_timestamp() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_timestamp() TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 2. WORKSPACES TABLE (Canonical storage for workspaces & projects)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  workspace_name TEXT,
  description TEXT DEFAULT '',
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

-- Name synchronization helper trigger (keeps name and workspace_name aligned)
CREATE OR REPLACE FUNCTION public.sync_workspace_name_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.name IS NULL AND NEW.workspace_name IS NOT NULL THEN
    NEW.name = NEW.workspace_name;
  ELSIF NEW.workspace_name IS NULL AND NEW.name IS NOT NULL THEN
    NEW.workspace_name = NEW.name;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_workspace_name_columns() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_workspace_name_columns() TO authenticated, service_role;

DROP TRIGGER IF EXISTS tr_workspaces_sync_name ON public.workspaces;
CREATE TRIGGER tr_workspaces_sync_name
  BEFORE INSERT OR UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.sync_workspace_name_columns();

DROP TRIGGER IF EXISTS tr_workspaces_updated_at ON public.workspaces;
CREATE TRIGGER tr_workspaces_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

-- ----------------------------------------------------------------------------
-- 3. WORKSPACES ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------------------
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspaces TO authenticated;
GRANT ALL ON public.workspaces TO service_role;
REVOKE ALL ON public.workspaces FROM anon;

-- ----------------------------------------------------------------------------
-- 4. PROJECTS VIEW & INSTEAD OF MUTATION HANDLER
-- ----------------------------------------------------------------------------
-- Note on PostgreSQL Views & Upsert:
-- PostgreSQL does NOT support "INSERT ... ON CONFLICT" on views (even with INSTEAD OF triggers).
-- Therefore, all Supabase .upsert() operations target public.workspaces directly.
-- The public.projects view is provided for read-compatibility (with security_invoker = true)
-- and standard INSERT, UPDATE, DELETE mutations.

CREATE OR REPLACE VIEW public.projects WITH (security_invoker = true) AS
  SELECT * FROM public.workspaces;

CREATE OR REPLACE FUNCTION public.projects_view_mutation_handler()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_caller_id UUID;
  v_owner_id UUID;
BEGIN
  v_caller_id := auth.uid();
  -- Defense in depth: a NULL uid is only acceptable for the trusted service_role.
  IF v_caller_id IS NULL AND COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Access Denied: authentication required.' USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Explicit validation: authenticated caller cannot specify another user's owner_id
    IF v_caller_id IS NOT NULL THEN
      IF NEW.owner_id IS NOT NULL AND NEW.owner_id <> v_caller_id THEN
        RAISE EXCEPTION 'Access Denied: Cannot insert a workspace owned by another user (caller=%, owner_id=%)', v_caller_id, NEW.owner_id;
      END IF;
      v_owner_id := v_caller_id;
    ELSE
      -- Administrative or service_role migration caller
      v_owner_id := NEW.owner_id;
      IF v_owner_id IS NULL THEN
        RAISE EXCEPTION 'Access Denied: Workspace owner_id is required.';
      END IF;
    END IF;

    INSERT INTO public.workspaces (
      id, owner_id, name, workspace_name, description, category,
      status, health, health_status, health_score, progress,
      workspace_state, stats, members, dataset_ids, dataset_names,
      milestones, risks, models, is_personal, created_at, updated_at
    ) VALUES (
      COALESCE(NEW.id, gen_random_uuid()),
      v_owner_id,
      COALESCE(NEW.name, NEW.workspace_name, 'Untitled Project'),
      COALESCE(NEW.workspace_name, NEW.name, 'Untitled Project'),
      COALESCE(NEW.description, ''),
      COALESCE(NEW.category, 'General Analytics'),
      COALESCE(NEW.status, 'active'),
      COALESCE(NEW.health, 'On Track'),
      COALESCE(NEW.health_status, 'ontrack'),
      COALESCE(NEW.health_score, 100),
      COALESCE(NEW.progress, 0),
      COALESCE(NEW.workspace_state, '{}'::jsonb),
      COALESCE(NEW.stats, '{}'::jsonb),
      COALESCE(NEW.members, '[]'::jsonb),
      COALESCE(NEW.dataset_ids, '[]'::jsonb),
      COALESCE(NEW.dataset_names, '[]'::jsonb),
      COALESCE(NEW.milestones, '[]'::jsonb),
      COALESCE(NEW.risks, '[]'::jsonb),
      COALESCE(NEW.models, '[]'::jsonb),
      COALESCE(NEW.is_personal, true),
      COALESCE(NEW.created_at, NOW()),
      COALESCE(NEW.updated_at, NOW())
    )
    RETURNING * INTO NEW;
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Verify caller owns the workspace being updated
    IF v_caller_id IS NOT NULL AND OLD.owner_id <> v_caller_id THEN
      RAISE EXCEPTION 'Access Denied: You cannot update a workspace owned by another user.';
    END IF;

    -- Reject unauthorized owner alteration
    IF NEW.owner_id IS NOT NULL AND OLD.owner_id IS NOT NULL AND NEW.owner_id <> OLD.owner_id THEN
      RAISE EXCEPTION 'Access Denied: Workspace owner cannot be altered.';
    END IF;

    UPDATE public.workspaces SET
      name = COALESCE(NEW.name, workspaces.name),
      workspace_name = COALESCE(NEW.workspace_name, NEW.name, workspaces.workspace_name),
      description = COALESCE(NEW.description, workspaces.description),
      category = COALESCE(NEW.category, workspaces.category),
      status = COALESCE(NEW.status, workspaces.status),
      health = COALESCE(NEW.health, workspaces.health),
      health_status = COALESCE(NEW.health_status, workspaces.health_status),
      health_score = COALESCE(NEW.health_score, workspaces.health_score),
      progress = COALESCE(NEW.progress, workspaces.progress),
      workspace_state = COALESCE(NEW.workspace_state, workspaces.workspace_state),
      stats = COALESCE(NEW.stats, workspaces.stats),
      members = COALESCE(NEW.members, workspaces.members),
      dataset_ids = COALESCE(NEW.dataset_ids, workspaces.dataset_ids),
      dataset_names = COALESCE(NEW.dataset_names, workspaces.dataset_names),
      milestones = COALESCE(NEW.milestones, workspaces.milestones),
      risks = COALESCE(NEW.risks, workspaces.risks),
      models = COALESCE(NEW.models, workspaces.models),
      is_personal = COALESCE(NEW.is_personal, workspaces.is_personal),
      updated_at = NOW()
    WHERE id = OLD.id
    RETURNING * INTO NEW;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    -- Verify caller owns the workspace being deleted
    IF v_caller_id IS NOT NULL AND OLD.owner_id <> v_caller_id THEN
      RAISE EXCEPTION 'Access Denied: You cannot delete a workspace owned by another user.';
    END IF;

    DELETE FROM public.workspaces
    WHERE id = OLD.id;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.projects_view_mutation_handler() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.projects_view_mutation_handler() TO authenticated, service_role;

DROP TRIGGER IF EXISTS tr_projects_view_mutation ON public.projects;
CREATE TRIGGER tr_projects_view_mutation
  INSTEAD OF INSERT OR UPDATE OR DELETE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.projects_view_mutation_handler();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
REVOKE ALL ON public.projects FROM anon;

-- ----------------------------------------------------------------------------
-- 5. SECURE WORKSPACE UPSERT RPC (Defense-in-depth mutation endpoint)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.upsert_workspace(workspace_record JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_caller_id UUID;
  v_id UUID;
  v_owner_id UUID;
  v_existing_owner UUID;
  v_result JSONB;
BEGIN
  v_caller_id := auth.uid();
  -- Defense in depth: a NULL uid is only acceptable for the trusted service_role.
  IF v_caller_id IS NULL AND COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Access Denied: authentication required.' USING ERRCODE = '42501';
  END IF;
  v_id := (workspace_record->>'id')::uuid;

  IF v_caller_id IS NULL THEN
    -- Service role / administrative execution
    v_owner_id := (workspace_record->>'owner_id')::uuid;
    IF v_owner_id IS NULL THEN
      RAISE EXCEPTION 'Access Denied: owner_id is required for service_role workspace upsert.';
    END IF;
  ELSE
    -- Authenticated user validation
    v_owner_id := v_caller_id;
    IF (workspace_record->>'owner_id') IS NOT NULL AND (workspace_record->>'owner_id')::uuid <> v_caller_id THEN
      RAISE EXCEPTION 'Access Denied: Cannot upsert workspace owned by another user (caller=%, requested=%).', v_caller_id, (workspace_record->>'owner_id');
    END IF;
  END IF;

  IF v_id IS NOT NULL THEN
    SELECT owner_id INTO v_existing_owner FROM public.workspaces WHERE id = v_id;
    IF v_existing_owner IS NOT NULL THEN
      IF v_caller_id IS NOT NULL AND v_existing_owner <> v_caller_id THEN
        RAISE EXCEPTION 'Access Denied: Cannot modify workspace owned by another user.';
      END IF;
      -- Preserve existing ownership on update
      v_owner_id := v_existing_owner;
    END IF;
  ELSE
    v_id := gen_random_uuid();
  END IF;

  INSERT INTO public.workspaces (
    id, owner_id, name, workspace_name, description, category,
    status, health, health_status, health_score, progress,
    workspace_state, stats, members, dataset_ids, dataset_names,
    milestones, risks, models, is_personal, updated_at
  ) VALUES (
    v_id,
    v_owner_id,
    COALESCE(workspace_record->>'name', workspace_record->>'workspace_name', 'Untitled Project'),
    COALESCE(workspace_record->>'workspace_name', workspace_record->>'name', 'Untitled Project'),
    COALESCE(workspace_record->>'description', ''),
    COALESCE(workspace_record->>'category', 'General Analytics'),
    COALESCE(workspace_record->>'status', 'active'),
    COALESCE(workspace_record->>'health', 'On Track'),
    COALESCE(workspace_record->>'health_status', 'ontrack'),
    COALESCE((workspace_record->>'health_score')::int, 100),
    COALESCE((workspace_record->>'progress')::int, 0),
    COALESCE(workspace_record->'workspace_state', '{}'::jsonb),
    COALESCE(workspace_record->'stats', '{}'::jsonb),
    COALESCE(workspace_record->'members', '[]'::jsonb),
    COALESCE(workspace_record->'dataset_ids', '[]'::jsonb),
    COALESCE(workspace_record->'dataset_names', '[]'::jsonb),
    COALESCE(workspace_record->'milestones', '[]'::jsonb),
    COALESCE(workspace_record->'risks', '[]'::jsonb),
    COALESCE(workspace_record->'models', '[]'::jsonb),
    COALESCE((workspace_record->>'is_personal')::boolean, true),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    workspace_name = EXCLUDED.workspace_name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    status = EXCLUDED.status,
    health = EXCLUDED.health,
    health_status = EXCLUDED.health_status,
    health_score = EXCLUDED.health_score,
    progress = EXCLUDED.progress,
    workspace_state = EXCLUDED.workspace_state,
    stats = EXCLUDED.stats,
    members = EXCLUDED.members,
    dataset_ids = EXCLUDED.dataset_ids,
    dataset_names = EXCLUDED.dataset_names,
    milestones = EXCLUDED.milestones,
    risks = EXCLUDED.risks,
    models = EXCLUDED.models,
    is_personal = EXCLUDED.is_personal,
    updated_at = NOW();

  SELECT to_jsonb(w.*) INTO v_result FROM public.workspaces w WHERE id = v_id;
  RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.upsert_workspace(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_workspace(JSONB) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 6. DATASET TABLE EXTENSIONS & METADATA HARDENING
-- ----------------------------------------------------------------------------
ALTER TABLE public.datasets ADD COLUMN IF NOT EXISTS mime_type TEXT DEFAULT 'text/csv';
ALTER TABLE public.datasets ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'ready';
ALTER TABLE public.datasets ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';

ALTER TABLE public.datasets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own datasets" ON public.datasets;
CREATE POLICY "Users can view own datasets"
  ON public.datasets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own datasets" ON public.datasets;
CREATE POLICY "Users can insert own datasets"
  ON public.datasets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own datasets" ON public.datasets;
CREATE POLICY "Users can update own datasets"
  ON public.datasets FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own datasets" ON public.datasets;
CREATE POLICY "Users can delete own datasets"
  ON public.datasets FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies required by server.js dataset delete/registration paths. These were present in
-- 20261030000000 but missing from this consolidated file; included so it is a true superset.
ALTER TABLE public.dataset_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dataset_quality ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can delete own dataset columns" ON public.dataset_columns;
CREATE POLICY "Users can delete own dataset columns"
  ON public.dataset_columns FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.datasets d WHERE d.id = dataset_columns.dataset_id AND d.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own dataset quality" ON public.dataset_quality;
CREATE POLICY "Users can insert own dataset quality"
  ON public.dataset_quality FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.datasets d WHERE d.id = dataset_quality.dataset_id AND d.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update own dataset quality" ON public.dataset_quality;
CREATE POLICY "Users can update own dataset quality"
  ON public.dataset_quality FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.datasets d WHERE d.id = dataset_quality.dataset_id AND d.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.datasets d WHERE d.id = dataset_quality.dataset_id AND d.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete own dataset quality" ON public.dataset_quality;
CREATE POLICY "Users can delete own dataset quality"
  ON public.dataset_quality FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.datasets d WHERE d.id = dataset_quality.dataset_id AND d.user_id = auth.uid()));

-- ----------------------------------------------------------------------------
-- 7. STORAGE BUCKET HARDENING (TARGETED TO DATASETS BUCKET ONLY)
-- ----------------------------------------------------------------------------
-- Ensure datasets bucket is private with 500MB limit and comprehensive data mime types
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'datasets',
  'datasets',
  false,
  524288000, -- 500MB
  ARRAY[
    'text/csv',
    'text/plain',
    'text/tab-separated-values',
    'application/json',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/parquet',
    'application/octet-stream',
    'application/zip',
    'application/x-zip-compressed'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 524288000,
  allowed_mime_types = EXCLUDED.allowed_mime_types; -- strict superset of the previously deployed list

-- Never create or re-configure other buckets here (that would drop their size/MIME limits).
-- Only force EXISTING sibling buckets to private; their objects and policies are untouched.
UPDATE storage.buckets
SET public = false
WHERE id IN ('avatars', 'reports', 'exports', 'models') AND public IS DISTINCT FROM false;

-- Clean up and establish dedicated policies scoped strictly to the 'datasets' bucket.
-- Existing policies for avatars, reports, exports, and models remain completely untouched.
DROP POLICY IF EXISTS "storage_datasets_select_own_folder" ON storage.objects;
CREATE POLICY "storage_datasets_select_own_folder"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'datasets' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "storage_datasets_insert_own_folder" ON storage.objects;
CREATE POLICY "storage_datasets_insert_own_folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'datasets' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "storage_datasets_update_own_folder" ON storage.objects;
CREATE POLICY "storage_datasets_update_own_folder"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'datasets' AND
    (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'datasets' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "storage_datasets_delete_own_folder" ON storage.objects;
CREATE POLICY "storage_datasets_delete_own_folder"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'datasets' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- ----------------------------------------------------------------------------
-- 8. INITIAL PROJECT SEED MIGRATION (PRESERVING EXISTING USER DATA)
-- ----------------------------------------------------------------------------
-- Seeds the 2 initial projects from storage backup ONLY if they do not already exist in public.workspaces.
-- Using ON CONFLICT (id) DO NOTHING guarantees that:
-- 1. Existing project progress is preserved.
-- 2. Existing dataset associations are preserved.
-- 3. Existing milestones, models, and workspace_state are preserved.
-- 4. Re-running the migration in production can NEVER overwrite or revert newer user state.
INSERT INTO public.workspaces (
  id,
  owner_id,
  name,
  workspace_name,
  description,
  category,
  status,
  health,
  health_status,
  health_score,
  progress,
  workspace_state,
  stats,
  members,
  dataset_ids,
  dataset_names,
  milestones,
  risks,
  models,
  is_personal,
  created_at,
  updated_at
)
VALUES
(
  'dabe7fd6-f4cb-48ed-8c97-5797dd08a9d0'::uuid,
  '051cf8bc-5891-4040-b04d-6954825bdbc2'::uuid,
  'DataCo Supply Chain Analysis',
  'DataCo Supply Chain Analysis',
  'Strategic analytics workspace for DataCo Supply Chain Analysis.',
  'Supply Chain',
  'On Track',
  'On Track',
  'ontrack',
  100,
  63,
  '{"projectConfigured": true, "datasetAttached": true, "profilingComplete": true, "analyticsComplete": true, "geographicComplete": true, "modelingComplete": false, "reportGenerated": false, "projectFinalized": false}'::jsonb,
  '{"records": "1 Datasets", "models": "0", "milestones": "1 Active"}'::jsonb,
  '[{"name": "ADITYA SHARMA", "role": "Data Analyst", "email": "123.321aditya@gmail.com", "avatar": "AS", "color": "#38BDF8"}]'::jsonb,
  '["5d9ea772-c07c-4f21-8bcc-bf67eb39b123"]'::jsonb,
  '["DataCoSupplyChainDataset"]'::jsonb,
  '[{"id": "m_dabe7fd6-f4cb-48ed-8c97-5797dd08a9d0_1", "title": "Project Inception & Baseline Ingestion", "owner": "ADITYA SHARMA", "status": "Completed", "progress": 100}]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  true,
  '2026-10-29T18:58:37.892Z'::timestamptz,
  '2026-10-29T18:58:37.892Z'::timestamptz
),
(
  'd498e262-fb3d-4b69-8c80-c554e5624f8e'::uuid,
  '051cf8bc-5891-4040-b04d-6954825bdbc2'::uuid,
  'IEEE Fraud Detection',
  'IEEE Fraud Detection',
  'Strategic analytics workspace for IEEE Fraud Detection.',
  'Finance',
  'Completed',
  'On Track',
  'ontrack',
  100,
  100,
  '{"projectConfigured": true, "datasetAttached": true, "profilingComplete": true, "analyticsComplete": true, "geographicComplete": false, "modelingComplete": true, "reportGenerated": true, "projectFinalized": true}'::jsonb,
  '{"records": "3 Datasets", "models": "0", "milestones": "1 Active"}'::jsonb,
  '[{"name": "ADITYA SHARMA", "role": "Data Analyst", "email": "123.321aditya@gmail.com", "avatar": "AS", "color": "#38BDF8"}]'::jsonb,
  '["e734d058-bf86-43a2-b884-a0cc2d1efa6c", "ca1298ce-721f-464f-96c0-7e70d88241f1", "36f9e28c-682f-4e8f-986f-445e73850ed5"]'::jsonb,
  '["sample_submission", "test_identity", "train_identity"]'::jsonb,
  '[{"id": "m_d498e262-fb3d-4b69-8c80-c554e5624f8e_1", "title": "Project Inception & Baseline Ingestion", "owner": "ADITYA SHARMA", "status": "Completed", "progress": 100}]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  true,
  '2026-10-29T18:58:38.057Z'::timestamptz,
  '2026-10-29T18:58:38.057Z'::timestamptz
)
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- Make PostgREST pick up the new table/view/RPC immediately (outside the transaction).
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- VERIFICATION QUERY (Run this after executing the migration above)
-- ============================================================================
-- SELECT 
--   EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workspaces') AS workspaces_table_exists,
--   EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'projects') AS projects_view_exists,
--   (SELECT COUNT(*) FROM public.workspaces) AS workspace_count,
--   EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'datasets' AND public = false) AS datasets_bucket_private,
--   (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%datasets%') AS dataset_storage_policy_count;
-- ============================================================================
