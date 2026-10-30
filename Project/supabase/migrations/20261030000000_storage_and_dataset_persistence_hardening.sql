-- ============================================================================
-- Migration: 20261030000000_storage_and_dataset_persistence_hardening.sql
-- Description: Hardens Supabase Storage bucket 'datasets', ensures private access,
--              adds missing metadata columns to public.datasets (mime_type, processing_status, description),
--              and configures strict user-tenant isolation RLS policies.
-- ============================================================================

-- 1. Ensure private 'datasets' storage bucket exists
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
  file_size_limit = 524288000;

-- 2. Extend public.datasets table columns if not present
ALTER TABLE public.datasets ADD COLUMN IF NOT EXISTS mime_type TEXT DEFAULT 'text/csv';
ALTER TABLE public.datasets ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'ready';
ALTER TABLE public.datasets ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';

-- 3. Row Level Security on storage.objects for 'datasets'
-- Enforces tenant isolation: authenticated users read and write only files where folder matches auth.uid()
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

-- 4. Ensure RLS is active on public.datasets
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

-- 5. Ensure RLS on dataset_columns and dataset_quality
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
