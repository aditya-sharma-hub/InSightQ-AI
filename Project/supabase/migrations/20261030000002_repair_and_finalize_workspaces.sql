-- ============================================================================
-- INSIGHTIQ AI — PRODUCTION WORKSPACES & PERSISTENCE FINAL REPAIR MIGRATION
-- Migration Name: 20261030000002_repair_and_finalize_workspaces.sql
--
-- Objective:
-- Idempotently repairs the production schema by safely accommodating the
-- pre-existing public.workspaces table (from 020_enterprise_collaboration_platform.sql).
--
-- Core Operations:
-- 1. Idempotently extends public.workspaces with all required analytical columns.
-- 2. Aligns nullability on workspace_name while RETAINING uq_user_workspace_name
--    to preserve workspace uniqueness contract per user.
-- 3. Hardens owner_id foreign key constraint to ON DELETE RESTRICT (defending
--    against accidental profile deletion cascading into workspace loss).
-- 4. Installs bidirectional name synchronization triggers.
-- 5. Implements validate_workspace_dataset_ownership trigger for strict tenant attachment.
-- 6. Replaces public.workspaces RLS policies with strict authenticated owner isolation.
-- 7. Creates updatable public.projects view with INSTEAD OF mutation trigger.
-- 8. Installs security-definer public.upsert_workspace(JSONB) RPC with strict search_path.
-- 9. Extends public.datasets with mime_type, processing_status, and description.
-- 10. Drops ALL legacy/overlapping storage policies and establishes dedicated,
--     isolated folder policies for 'datasets' and sibling buckets.
-- 11. Idempotently restores the two canonical seed projects with ON CONFLICT (id) DO NOTHING.
-- 12. Signals PostgREST schema reload via NOTIFY pgrst.
--
-- Safety Guarantees:
-- - 100% NON-DESTRUCTIVE: Zero DROP TABLE, zero TRUNCATE, zero data loss.
-- - Wrapped in an atomic transaction: BEGIN ... COMMIT.
-- - Post-execution verification output confirms all objects and row counts.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. UTILITY FUNCTIONS & TIMESTAMP TRIGGER
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
-- 2. WORKSPACES TABLE REPAIR & COLUMN ALIGNMENT
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
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

-- Idempotently extend any existing columns if table was created with 020 schema
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS workspace_name TEXT;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General Analytics';
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS health TEXT DEFAULT 'On Track';
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS health_status TEXT DEFAULT 'ontrack';
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS health_score INT DEFAULT 100;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS progress INT DEFAULT 0;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS workspace_state JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS stats JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS members JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS dataset_ids JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS dataset_names JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS milestones JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS risks JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS models JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS is_personal BOOLEAN DEFAULT true;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Relax NOT NULL constraint on workspace_name if inherited from 020 migration
-- (Bidirectional sync trigger ensures workspace_name is always set from name)
ALTER TABLE public.workspaces ALTER COLUMN workspace_name DROP NOT NULL;

-- Backfill name and workspace_name bidirectionally
UPDATE public.workspaces
SET name = COALESCE(workspace_name, 'Untitled Project')
WHERE name IS NULL;

UPDATE public.workspaces
SET workspace_name = COALESCE(name, 'Untitled Project')
WHERE workspace_name IS NULL;

-- Retain / ensure unique workspace name constraint per owner
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' 
      AND table_name = 'workspaces' 
      AND constraint_name = 'uq_user_workspace_name'
  ) THEN
    ALTER TABLE public.workspaces
      ADD CONSTRAINT uq_user_workspace_name UNIQUE (owner_id, workspace_name);
  END IF;
END $$;

-- Ensure owner_id foreign key strictly references public.profiles(id) with ON DELETE RESTRICT
DO $$
DECLARE
  r RECORD;
BEGIN
  -- 1. Drop any foreign key constraint on workspaces.owner_id that is NOT referencing public.profiles(id) with ON DELETE RESTRICT
  FOR r IN (
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.referential_constraints rc
      ON tc.constraint_name = rc.constraint_name AND tc.table_schema = rc.constraint_schema
    JOIN information_schema.constraint_column_usage ccu
      ON rc.unique_constraint_name = ccu.constraint_name AND rc.unique_constraint_schema = ccu.constraint_schema
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'workspaces'
      AND kcu.column_name = 'owner_id'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND (
        ccu.table_schema <> 'public'
        OR ccu.table_name <> 'profiles'
        OR ccu.column_name <> 'id'
        OR rc.delete_rule <> 'RESTRICT'
      )
  ) LOOP
    EXECUTE format('ALTER TABLE public.workspaces DROP CONSTRAINT %I', r.constraint_name);
  END LOOP;

  -- 2. Add canonical constraint if not already present
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.referential_constraints rc
      ON tc.constraint_name = rc.constraint_name AND tc.table_schema = rc.constraint_schema
    JOIN information_schema.constraint_column_usage ccu
      ON rc.unique_constraint_name = ccu.constraint_name AND rc.unique_constraint_schema = ccu.constraint_schema
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'workspaces'
      AND kcu.column_name = 'owner_id'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_schema = 'public'
      AND ccu.table_name = 'profiles'
      AND ccu.column_name = 'id'
      AND rc.delete_rule = 'RESTRICT'
  ) THEN
    ALTER TABLE public.workspaces
      ADD CONSTRAINT workspaces_owner_id_fkey
      FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- High-performance lookup indexes
CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id ON public.workspaces (owner_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_created_at ON public.workspaces (created_at DESC);

-- ----------------------------------------------------------------------------
-- 3. WORKSPACES TRIGGERS
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_workspace_name_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.name IS NULL AND NEW.workspace_name IS NOT NULL THEN
    NEW.name := NEW.workspace_name;
  ELSIF NEW.workspace_name IS NULL AND NEW.name IS NOT NULL THEN
    NEW.workspace_name := NEW.name;
  ELSIF NEW.name IS NULL AND NEW.workspace_name IS NULL THEN
    NEW.name := 'Untitled Project';
    NEW.workspace_name := 'Untitled Project';
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

CREATE OR REPLACE FUNCTION public.validate_workspace_dataset_ownership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_ds_id_text TEXT;
  v_ds_id UUID;
  v_ds_owner UUID;
BEGIN
  IF NEW.dataset_ids IS NULL 
     OR jsonb_typeof(NEW.dataset_ids) <> 'array' 
     OR jsonb_array_length(NEW.dataset_ids) = 0 THEN
    RETURN NEW;
  END IF;

  FOR v_ds_id_text IN SELECT jsonb_array_elements_text(NEW.dataset_ids)
  LOOP
    BEGIN
      v_ds_id := v_ds_id_text::uuid;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Access Denied: Invalid dataset ID "%". Must be a valid UUID.', v_ds_id_text
        USING ERRCODE = '22P02';
    END;

    SELECT user_id INTO v_ds_owner
    FROM public.datasets
    WHERE id = v_ds_id;

    IF v_ds_owner IS NULL THEN
      RAISE EXCEPTION 'Access Denied: Attached dataset "%" does not exist in public.datasets.', v_ds_id
        USING ERRCODE = '42501';
    END IF;

    IF v_ds_owner <> NEW.owner_id THEN
      RAISE EXCEPTION 'Access Denied: Dataset "%" is owned by another user (dataset_owner=%, workspace_owner=%).',
        v_ds_id, v_ds_owner, NEW.owner_id
        USING ERRCODE = '42501';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.validate_workspace_dataset_ownership() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.validate_workspace_dataset_ownership() TO authenticated, service_role;

DROP TRIGGER IF EXISTS tr_workspaces_validate_dataset_ownership ON public.workspaces;
CREATE TRIGGER tr_workspaces_validate_dataset_ownership
  BEFORE INSERT OR UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.validate_workspace_dataset_ownership();

-- ----------------------------------------------------------------------------
-- 4. WORKSPACES ROW LEVEL SECURITY (RLS) & GRANTS
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

REVOKE ALL ON public.workspaces FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspaces TO authenticated;
GRANT ALL ON public.workspaces TO service_role;

-- ----------------------------------------------------------------------------
-- 5. PROJECTS VIEW & INSTEAD OF MUTATION HANDLER
-- ----------------------------------------------------------------------------
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
  IF v_caller_id IS NULL AND COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Access Denied: authentication required.' USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF v_caller_id IS NOT NULL THEN
      IF NEW.owner_id IS NOT NULL AND NEW.owner_id <> v_caller_id THEN
        RAISE EXCEPTION 'Access Denied: Cannot insert a workspace owned by another user (caller=%, owner_id=%).', v_caller_id, NEW.owner_id
          USING ERRCODE = '42501';
      END IF;
      v_owner_id := v_caller_id;
    ELSE
      v_owner_id := NEW.owner_id;
      IF v_owner_id IS NULL THEN
        RAISE EXCEPTION 'Access Denied: Workspace owner_id is required for service_role.'
          USING ERRCODE = '42501';
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
    IF v_caller_id IS NOT NULL AND OLD.owner_id <> v_caller_id THEN
      RAISE EXCEPTION 'Access Denied: You cannot update a workspace owned by another user.'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.owner_id IS NOT NULL AND OLD.owner_id IS NOT NULL AND NEW.owner_id <> OLD.owner_id THEN
      RAISE EXCEPTION 'Access Denied: Workspace owner cannot be altered.'
        USING ERRCODE = '42501';
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
      AND (v_caller_id IS NULL OR workspaces.owner_id = v_caller_id)
    RETURNING * INTO NEW;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    IF v_caller_id IS NOT NULL AND OLD.owner_id <> v_caller_id THEN
      RAISE EXCEPTION 'Access Denied: You cannot delete a workspace owned by another user.'
        USING ERRCODE = '42501';
    END IF;

    DELETE FROM public.workspaces
    WHERE id = OLD.id
      AND (v_caller_id IS NULL OR workspaces.owner_id = v_caller_id);
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

REVOKE ALL ON public.projects FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;

-- ----------------------------------------------------------------------------
-- 6. SECURE WORKSPACE UPSERT RPC
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
  IF v_caller_id IS NULL AND COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Access Denied: authentication required.' USING ERRCODE = '42501';
  END IF;

  IF workspace_record->>'id' IS NOT NULL THEN
    BEGIN
      v_id := (workspace_record->>'id')::uuid;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Access Denied: Invalid workspace ID "%". Must be a valid UUID.', workspace_record->>'id'
        USING ERRCODE = '22P02';
    END;
  END IF;

  IF v_caller_id IS NULL THEN
    v_owner_id := (workspace_record->>'owner_id')::uuid;
    IF v_owner_id IS NULL THEN
      RAISE EXCEPTION 'Access Denied: owner_id is required for service_role workspace upsert.'
        USING ERRCODE = '42501';
    END IF;
  ELSE
    v_owner_id := v_caller_id;
    IF (workspace_record->>'owner_id') IS NOT NULL AND (workspace_record->>'owner_id')::uuid <> v_caller_id THEN
      RAISE EXCEPTION 'Access Denied: Cannot upsert workspace owned by another user (caller=%, requested=%).', v_caller_id, (workspace_record->>'owner_id')
        USING ERRCODE = '42501';
    END IF;
  END IF;

  IF v_id IS NOT NULL THEN
    SELECT owner_id INTO v_existing_owner FROM public.workspaces WHERE id = v_id;
    IF v_existing_owner IS NOT NULL THEN
      IF v_caller_id IS NOT NULL AND v_existing_owner <> v_caller_id THEN
        RAISE EXCEPTION 'Access Denied: Cannot modify workspace owned by another user.'
          USING ERRCODE = '42501';
      END IF;
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
-- 7. DATASETS TABLE EXTENSIONS & QUALITY POLICIES
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

ALTER TABLE public.dataset_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dataset_quality ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own dataset columns" ON public.dataset_columns;
CREATE POLICY "Users can view own dataset columns"
  ON public.dataset_columns FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.datasets d WHERE d.id = dataset_columns.dataset_id AND d.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own dataset columns" ON public.dataset_columns;
CREATE POLICY "Users can insert own dataset columns"
  ON public.dataset_columns FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.datasets d WHERE d.id = dataset_columns.dataset_id AND d.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete own dataset columns" ON public.dataset_columns;
CREATE POLICY "Users can delete own dataset columns"
  ON public.dataset_columns FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.datasets d WHERE d.id = dataset_columns.dataset_id AND d.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can view own dataset quality" ON public.dataset_quality;
CREATE POLICY "Users can view own dataset quality"
  ON public.dataset_quality FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.datasets d WHERE d.id = dataset_quality.dataset_id AND d.user_id = auth.uid()));

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
-- 8. STORAGE BUCKET HARDENING & STRICT POLICIES
-- ----------------------------------------------------------------------------
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
  allowed_mime_types = EXCLUDED.allowed_mime_types;

UPDATE storage.buckets
SET public = false
WHERE id IN ('avatars', 'reports', 'exports', 'models') AND public IS DISTINCT FROM false;

-- Clean up ALL legacy/overlapping policies on storage.objects
DROP POLICY IF EXISTS "Avatar Storage Read Policy" ON storage.objects;
DROP POLICY IF EXISTS "User Storage Bucket Access Policy" ON storage.objects;
DROP POLICY IF EXISTS "InsightIQ Storage Select Policy" ON storage.objects;
DROP POLICY IF EXISTS "InsightIQ Storage Insert Policy" ON storage.objects;
DROP POLICY IF EXISTS "InsightIQ Storage Update Policy" ON storage.objects;
DROP POLICY IF EXISTS "InsightIQ Storage Delete Policy" ON storage.objects;
DROP POLICY IF EXISTS "storage_select_own_folder" ON storage.objects;
DROP POLICY IF EXISTS "storage_insert_own_folder" ON storage.objects;
DROP POLICY IF EXISTS "storage_update_own_folder" ON storage.objects;
DROP POLICY IF EXISTS "storage_delete_own_folder" ON storage.objects;
DROP POLICY IF EXISTS "storage_datasets_select_own_folder" ON storage.objects;
DROP POLICY IF EXISTS "storage_datasets_insert_own_folder" ON storage.objects;
DROP POLICY IF EXISTS "storage_datasets_update_own_folder" ON storage.objects;
DROP POLICY IF EXISTS "storage_datasets_delete_own_folder" ON storage.objects;
DROP POLICY IF EXISTS "storage_sibling_buckets_select_own_folder" ON storage.objects;
DROP POLICY IF EXISTS "storage_sibling_buckets_insert_own_folder" ON storage.objects;
DROP POLICY IF EXISTS "storage_sibling_buckets_update_own_folder" ON storage.objects;
DROP POLICY IF EXISTS "storage_sibling_buckets_delete_own_folder" ON storage.objects;

-- Recreate dedicated policies for 'datasets' bucket
CREATE POLICY "storage_datasets_select_own_folder"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'datasets' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "storage_datasets_insert_own_folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'datasets' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

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

CREATE POLICY "storage_datasets_delete_own_folder"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'datasets' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Recreate dedicated policies for sibling buckets ('avatars', 'reports', 'exports', 'models')
CREATE POLICY "storage_sibling_buckets_select_own_folder"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id IN ('avatars', 'reports', 'exports', 'models') AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "storage_sibling_buckets_insert_own_folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id IN ('avatars', 'reports', 'exports', 'models') AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "storage_sibling_buckets_update_own_folder"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id IN ('avatars', 'reports', 'exports', 'models') AND
    (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id IN ('avatars', 'reports', 'exports', 'models') AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "storage_sibling_buckets_delete_own_folder"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id IN ('avatars', 'reports', 'exports', 'models') AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- ----------------------------------------------------------------------------
-- 9. SEED PROJECTS IDEMPOTENT RESTORATION
-- ----------------------------------------------------------------------------
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
  '[{"name": "ADITYA SHARMA", "role": "Data Analyst", "user_id": "051cf8bc-5891-4040-b04d-6954825bdbc2", "avatar": "AS", "color": "#38BDF8"}]'::jsonb,
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
  '[{"name": "ADITYA SHARMA", "role": "Data Analyst", "user_id": "051cf8bc-5891-4040-b04d-6954825bdbc2", "avatar": "AS", "color": "#38BDF8"}]'::jsonb,
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

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Verification output
SELECT 
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workspaces') AS workspaces_table_exists,
  EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'projects') AS projects_view_exists,
  (SELECT COUNT(*) FROM public.workspaces) AS workspace_count,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'datasets' AND column_name = 'mime_type') AS datasets_has_mime_type,
  EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'upsert_workspace') AS upsert_workspace_rpc_exists,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects') AS total_storage_policies;
