-- ============================================================================
-- Migration: 006_storage_policies.sql
-- Description: Storage Row Level Security Policies Enforcing Folder Isolation
-- ============================================================================

DROP POLICY IF EXISTS "storage_insert_own_folder" ON storage.objects;
DROP POLICY IF EXISTS "storage_select_own_folder" ON storage.objects;
DROP POLICY IF EXISTS "storage_update_own_folder" ON storage.objects;
DROP POLICY IF EXISTS "storage_delete_own_folder" ON storage.objects;

-- Policy 1: INSERT — Authenticated users upload ONLY into their own folder {auth.uid()}
CREATE POLICY "storage_insert_own_folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id IN ('avatars', 'datasets', 'reports', 'exports', 'models') AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy 2: SELECT — Authenticated users read ONLY files in their own folder {auth.uid()}
CREATE POLICY "storage_select_own_folder"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id IN ('avatars', 'datasets', 'reports', 'exports', 'models') AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy 3: UPDATE — Authenticated users update ONLY files in their own folder {auth.uid()}
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

-- Policy 4: DELETE — Authenticated users delete ONLY files in their own folder {auth.uid()}
CREATE POLICY "storage_delete_own_folder"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id IN ('avatars', 'datasets', 'reports', 'exports', 'models') AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
