-- ============================================================================
-- InsightIQ AI - Private Supabase Storage Buckets & RLS Policy Configuration
-- Buckets: avatars, datasets, reports, exports (All Private)
-- Folder Path Requirement: {bucket}/{auth.uid()}/...
-- ============================================================================

-- 1. Create Private Storage Buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('avatars', 'avatars', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']),
  ('datasets', 'datasets', false, 524288000, ARRAY['text/csv', 'application/json', 'application/parquet', 'text/plain', 'application/x-zip-compressed', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
  ('reports', 'reports', false, 104857600, ARRAY['application/pdf', 'text/html', 'application/json', 'text/markdown', 'text/plain']),
  ('exports', 'exports', false, 524288000, ARRAY['text/csv', 'application/json', 'application/pdf', 'application/x-zip-compressed'])
ON CONFLICT (id) DO UPDATE SET 
  public = false;

-- Note: RLS is pre-enabled on storage.objects by default in Supabase.

-- 3. Clean up Existing Policies for InsightIQ AI Storage Buckets
DROP POLICY IF EXISTS "InsightIQ Storage Select Policy" ON storage.objects;
DROP POLICY IF EXISTS "InsightIQ Storage Insert Policy" ON storage.objects;
DROP POLICY IF EXISTS "InsightIQ Storage Update Policy" ON storage.objects;
DROP POLICY IF EXISTS "InsightIQ Storage Delete Policy" ON storage.objects;

-- 4. CREATE RLS POLICIES FOR PRIVATE STORAGE BUCKETS

-- A. SELECT POLICY: Users can read ONLY their own storage objects
CREATE POLICY "InsightIQ Storage Select Policy"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id IN ('avatars', 'datasets', 'reports', 'exports') AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- B. INSERT POLICY: Users can upload ONLY into folders matching their auth.uid()
CREATE POLICY "InsightIQ Storage Insert Policy"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id IN ('avatars', 'datasets', 'reports', 'exports') AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- C. UPDATE POLICY: Users can update ONLY their own storage objects
CREATE POLICY "InsightIQ Storage Update Policy"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id IN ('avatars', 'datasets', 'reports', 'exports') AND
    (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id IN ('avatars', 'datasets', 'reports', 'exports') AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- D. DELETE POLICY: Users can delete ONLY their own storage objects
CREATE POLICY "InsightIQ Storage Delete Policy"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id IN ('avatars', 'datasets', 'reports', 'exports') AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
