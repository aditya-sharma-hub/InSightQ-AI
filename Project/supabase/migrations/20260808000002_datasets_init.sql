-- ============================================================================
-- InsightIQ AI - Storage Extension & Dataset Management Backend Migration
-- Buckets: avatars, datasets, reports, exports, models (All Private)
-- Tables: datasets, dataset_versions, dataset_columns, dataset_quality, dataset_upload_logs
-- RLS Policies & Helper PostgreSQL Functions
-- ============================================================================

-- 1. EXTEND PRIVATE STORAGE BUCKETS (Add 'models' Bucket)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('avatars', 'avatars', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']),
  ('datasets', 'datasets', false, 524288000, ARRAY['text/csv', 'application/json', 'application/parquet', 'text/plain', 'application/x-zip-compressed', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
  ('reports', 'reports', false, 104857600, ARRAY['application/pdf', 'text/html', 'application/json', 'text/markdown', 'text/plain']),
  ('exports', 'exports', false, 524288000, ARRAY['text/csv', 'application/json', 'application/pdf', 'application/x-zip-compressed']),
  ('models', 'models', false, 1073741824, ARRAY['application/octet-stream', 'application/x-python-pickle', 'application/json', 'application/x-hdf5', 'application/zip'])
ON CONFLICT (id) DO UPDATE SET 
  public = false;

-- Re-enforce Storage RLS Policies for All 5 Private Buckets
DROP POLICY IF EXISTS "InsightIQ Storage Select Policy" ON storage.objects;
DROP POLICY IF EXISTS "InsightIQ Storage Insert Policy" ON storage.objects;
DROP POLICY IF EXISTS "InsightIQ Storage Update Policy" ON storage.objects;
DROP POLICY IF EXISTS "InsightIQ Storage Delete Policy" ON storage.objects;

CREATE POLICY "InsightIQ Storage Select Policy"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id IN ('avatars', 'datasets', 'reports', 'exports', 'models') AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "InsightIQ Storage Insert Policy"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('avatars', 'datasets', 'reports', 'exports', 'models') AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "InsightIQ Storage Update Policy"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id IN ('avatars', 'datasets', 'reports', 'exports', 'models') AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id IN ('avatars', 'datasets', 'reports', 'exports', 'models') AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "InsightIQ Storage Delete Policy"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id IN ('avatars', 'datasets', 'reports', 'exports', 'models') AND (storage.foldername(name))[1] = auth.uid()::text);

-- 2. CREATE DATABASE TABLES

-- PREREQUISITE: PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'Data Scientist',
  provider TEXT DEFAULT 'email',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- A. DATASETS TABLE
CREATE TABLE IF NOT EXISTS public.datasets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('CSV', 'XLSX', 'XLS', 'JSON', 'PARQUET')),
  file_size BIGINT NOT NULL,
  row_count BIGINT DEFAULT 0,
  column_count INT DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'processing', 'error')),
  upload_source TEXT DEFAULT 'manual_upload',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- B. DATASET VERSIONS TABLE
CREATE TABLE IF NOT EXISTS public.dataset_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dataset_id UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
  version_number INT NOT NULL DEFAULT 1,
  storage_path TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_dataset_version UNIQUE (dataset_id, version_number)
);

-- C. DATASET COLUMNS TABLE (Metadata & Profiling Schema)
CREATE TABLE IF NOT EXISTS public.dataset_columns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dataset_id UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
  column_name TEXT NOT NULL,
  data_type TEXT NOT NULL,
  null_percentage NUMERIC(5,2) DEFAULT 0.00,
  unique_values BIGINT DEFAULT 0,
  sample_values JSONB DEFAULT '[]'::jsonb,
  is_target BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_dataset_column UNIQUE (dataset_id, column_name)
);

-- D. DATASET QUALITY METRICS TABLE
CREATE TABLE IF NOT EXISTS public.dataset_quality (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dataset_id UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE UNIQUE,
  missing_values BIGINT DEFAULT 0,
  duplicate_rows BIGINT DEFAULT 0,
  outlier_count BIGINT DEFAULT 0,
  quality_score NUMERIC(5,2) DEFAULT 100.00,
  last_scanned TIMESTAMPTZ DEFAULT NOW()
);

-- E. DATASET UPLOAD LOGS TABLE
CREATE TABLE IF NOT EXISTS public.dataset_upload_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dataset_id UUID REFERENCES public.datasets(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  upload_status TEXT NOT NULL CHECK (upload_status IN ('success', 'failed', 'processing', 'cancelled')),
  processing_time_ms INT DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES
ALTER TABLE public.datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dataset_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dataset_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dataset_quality ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dataset_upload_logs ENABLE ROW LEVEL SECURITY;

-- 4. RLS POLICIES FOR DATASETS TABLES

-- Datasets Policies
DROP POLICY IF EXISTS "Users can view own datasets" ON public.datasets;
CREATE POLICY "Users can view own datasets" ON public.datasets FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own datasets" ON public.datasets;
CREATE POLICY "Users can insert own datasets" ON public.datasets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own datasets" ON public.datasets;
CREATE POLICY "Users can update own datasets" ON public.datasets FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own datasets" ON public.datasets;
CREATE POLICY "Users can delete own datasets" ON public.datasets FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Dataset Versions Policies (Check via Parent Dataset user_id)
DROP POLICY IF EXISTS "Users can view own dataset versions" ON public.dataset_versions;
CREATE POLICY "Users can view own dataset versions" ON public.dataset_versions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.datasets d WHERE d.id = dataset_versions.dataset_id AND d.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own dataset versions" ON public.dataset_versions;
CREATE POLICY "Users can insert own dataset versions" ON public.dataset_versions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.datasets d WHERE d.id = dataset_versions.dataset_id AND d.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete own dataset versions" ON public.dataset_versions;
CREATE POLICY "Users can delete own dataset versions" ON public.dataset_versions FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.datasets d WHERE d.id = dataset_versions.dataset_id AND d.user_id = auth.uid()));

-- Dataset Columns Policies
DROP POLICY IF EXISTS "Users can view own dataset columns" ON public.dataset_columns;
CREATE POLICY "Users can view own dataset columns" ON public.dataset_columns FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.datasets d WHERE d.id = dataset_columns.dataset_id AND d.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own dataset columns" ON public.dataset_columns;
CREATE POLICY "Users can insert own dataset columns" ON public.dataset_columns FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.datasets d WHERE d.id = dataset_columns.dataset_id AND d.user_id = auth.uid()));

-- Dataset Quality Policies
DROP POLICY IF EXISTS "Users can view own dataset quality" ON public.dataset_quality;
CREATE POLICY "Users can view own dataset quality" ON public.dataset_quality FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.datasets d WHERE d.id = dataset_quality.dataset_id AND d.user_id = auth.uid()));

-- Upload Logs Policies
DROP POLICY IF EXISTS "Users can view own upload logs" ON public.dataset_upload_logs;
CREATE POLICY "Users can view own upload logs" ON public.dataset_upload_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own upload logs" ON public.dataset_upload_logs;
CREATE POLICY "Users can insert own upload logs" ON public.dataset_upload_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 5. REUSABLE HELPER POSTGRESQL FUNCTIONS

-- Function 1: Create Dataset with Initial Version & Quality Record
CREATE OR REPLACE FUNCTION public.create_dataset_with_version(
  p_user_id UUID,
  p_name TEXT,
  p_original_filename TEXT,
  p_storage_path TEXT,
  p_file_type TEXT,
  p_file_size BIGINT,
  p_row_count BIGINT DEFAULT 0,
  p_column_count INT DEFAULT 0
)
RETURNS UUID AS $$
DECLARE
  v_dataset_id UUID;
BEGIN
  -- Insert Master Dataset Record
  INSERT INTO public.datasets (
    user_id, name, original_filename, storage_path, file_type, file_size, row_count, column_count, status
  )
  VALUES (
    p_user_id, p_name, p_original_filename, p_storage_path, UPPER(p_file_type), p_file_size, p_row_count, p_column_count, 'active'
  )
  RETURNING id INTO v_dataset_id;

  -- Insert Initial Version 1
  INSERT INTO public.dataset_versions (dataset_id, version_number, storage_path, description)
  VALUES (v_dataset_id, 1, p_storage_path, 'Initial dataset upload');

  -- Insert Initial Quality Record Placeholder
  INSERT INTO public.dataset_quality (dataset_id, quality_score)
  VALUES (v_dataset_id, 100.00);

  RETURN v_dataset_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 2: Create New Dataset Version
CREATE OR REPLACE FUNCTION public.create_dataset_version(
  p_dataset_id UUID,
  p_storage_path TEXT,
  p_description TEXT DEFAULT 'Updated dataset version'
)
RETURNS INT AS $$
DECLARE
  v_next_version INT;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_next_version
  FROM public.dataset_versions
  WHERE dataset_id = p_dataset_id;

  INSERT INTO public.dataset_versions (dataset_id, version_number, storage_path, description)
  VALUES (p_dataset_id, v_next_version, p_storage_path, p_description);

  UPDATE public.datasets
  SET storage_path = p_storage_path, updated_at = NOW()
  WHERE id = p_dataset_id;

  RETURN v_next_version;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 3: Log Dataset Upload Activity
CREATE OR REPLACE FUNCTION public.log_dataset_upload(
  p_dataset_id UUID,
  p_user_id UUID,
  p_upload_status TEXT,
  p_processing_time_ms INT DEFAULT 0,
  p_error_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.dataset_upload_logs (dataset_id, user_id, upload_status, processing_time_ms, error_message)
  VALUES (p_dataset_id, p_user_id, p_upload_status, p_processing_time_ms, p_error_message)
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reusable Timestamp Trigger Function
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind Timestamp Trigger for Datasets
DROP TRIGGER IF EXISTS tr_datasets_updated_at ON public.datasets;
CREATE TRIGGER tr_datasets_updated_at
  BEFORE UPDATE ON public.datasets
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();
