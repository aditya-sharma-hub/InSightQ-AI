-- ============================================================================
-- InsightIQ AI - Supabase Storage Row Level Security (RLS) Policy Migration
-- Target Buckets: avatars, datasets, reports, exports, models (All Private)
-- Folder Pattern: {bucket}/{auth.uid()}/...
-- ============================================================================

-- 1. Ensure Storage Buckets Exist & Are Marked Private
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('avatars', 'avatars', false),
  ('datasets', 'datasets', false),
  ('reports', 'reports', false),
  ('exports', 'exports', false),
  ('models', 'models', false)
ON CONFLICT (id) DO UPDATE SET 
  public = false;

-- Note: RLS is pre-enabled on storage.objects by default in Supabase.

-- 2. Clean up Existing Policies for Target Buckets
DROP POLICY IF EXISTS "storage_insert_own_folder" ON storage.objects;
DROP POLICY IF EXISTS "storage_select_own_folder" ON storage.objects;
DROP POLICY IF EXISTS "storage_update_own_folder" ON storage.objects;
DROP POLICY IF EXISTS "storage_delete_own_folder" ON storage.objects;

DROP POLICY IF EXISTS "InsightIQ Storage Select Policy" ON storage.objects;
DROP POLICY IF EXISTS "InsightIQ Storage Insert Policy" ON storage.objects;
DROP POLICY IF EXISTS "InsightIQ Storage Update Policy" ON storage.objects;
DROP POLICY IF EXISTS "InsightIQ Storage Delete Policy" ON storage.objects;

-- 4. CREATE DEDICATED STORAGE RLS POLICIES

-- Policy 1: INSERT (Upload) — Authenticated users can upload ONLY into their own folder {auth.uid()}
CREATE POLICY "storage_insert_own_folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id IN ('avatars', 'datasets', 'reports', 'exports', 'models') AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy 2: SELECT (Read) — Authenticated users can read ONLY files in their own folder {auth.uid()}
CREATE POLICY "storage_select_own_folder"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id IN ('avatars', 'datasets', 'reports', 'exports', 'models') AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy 3: UPDATE — Authenticated users can update ONLY files in their own folder {auth.uid()}
CREATE POLICY "storage_update_own_folder"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id IN ('avatars', 'datasets', 'reports', 'exports', 'models') AND
    (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id IN ('avatars', 'datasets', 'reports', 'exports', 'models') AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy 4: DELETE — Authenticated users can delete ONLY files in their own folder {auth.uid()}
CREATE POLICY "storage_delete_own_folder"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id IN ('avatars', 'datasets', 'reports', 'exports', 'models') AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
