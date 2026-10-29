-- ============================================================================
-- InsightIQ AI - Enterprise Dataset Management Module Backend Migration
-- Tables: datasets, dataset_versions, dataset_columns, dataset_quality, 
--         dataset_statistics, dataset_tags, dataset_processing_logs
-- RLS Policies & Reusable Helper PostgreSQL Functions
-- ============================================================================

-- 1. PREREQUISITES & TIMESTAMP FUNCTION (Self-Contained Safeguards)
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

CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. CREATE DATABASE TABLES

-- A. DATASETS TABLE
CREATE TABLE IF NOT EXISTS public.datasets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dataset_name TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  storage_bucket TEXT DEFAULT 'datasets',
  storage_path TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('CSV', 'XLS', 'XLSX', 'JSON', 'PARQUET')),
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  upload_source TEXT DEFAULT 'manual_upload',
  upload_status TEXT DEFAULT 'completed' CHECK (upload_status IN ('completed', 'failed', 'processing', 'pending')),
  processing_status TEXT DEFAULT 'ready' CHECK (processing_status IN ('ready', 'processing', 'failed', 'error')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- B. DATASET VERSIONS TABLE
CREATE TABLE IF NOT EXISTS public.dataset_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  version_number INT NOT NULL DEFAULT 1,
  dataset_id UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  version_notes TEXT,
  CONSTRAINT uq_dataset_version_num UNIQUE (dataset_id, version_number)
);

-- C. DATASET COLUMNS TABLE (Schema & Data Dictionary)
CREATE TABLE IF NOT EXISTS public.dataset_columns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dataset_id UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
  column_name TEXT NOT NULL,
  detected_data_type TEXT NOT NULL,
  nullable BOOLEAN DEFAULT true,
  unique_count BIGINT DEFAULT 0,
  missing_count BIGINT DEFAULT 0,
  sample_values JSONB DEFAULT '[]'::jsonb,
  is_target_column BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_dataset_column_name UNIQUE (dataset_id, column_name)
);

-- D. DATASET QUALITY TABLE
CREATE TABLE IF NOT EXISTS public.dataset_quality (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dataset_id UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE UNIQUE,
  duplicate_rows BIGINT DEFAULT 0,
  missing_values BIGINT DEFAULT 0,
  outlier_count BIGINT DEFAULT 0,
  quality_score NUMERIC(5,2) DEFAULT 100.00,
  validation_status TEXT DEFAULT 'passed' CHECK (validation_status IN ('passed', 'warning', 'failed', 'pending')),
  scanned_at TIMESTAMPTZ DEFAULT NOW()
);

-- E. DATASET STATISTICS TABLE
CREATE TABLE IF NOT EXISTS public.dataset_statistics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dataset_id UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE UNIQUE,
  total_rows BIGINT DEFAULT 0,
  total_columns INT DEFAULT 0,
  numeric_columns INT DEFAULT 0,
  categorical_columns INT DEFAULT 0,
  datetime_columns INT DEFAULT 0,
  memory_usage BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- F. DATASET TAGS TABLE
CREATE TABLE IF NOT EXISTS public.dataset_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dataset_id UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
  tag_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_dataset_tag UNIQUE (dataset_id, tag_name)
);

-- G. DATASET PROCESSING LOGS TABLE
CREATE TABLE IF NOT EXISTS public.dataset_processing_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dataset_id UUID REFERENCES public.datasets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  processing_stage TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'in_progress')),
  execution_time INT DEFAULT 0, -- Time in milliseconds
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ENABLE ROW LEVEL SECURITY (RLS) ON ALL 7 TABLES
ALTER TABLE public.datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dataset_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dataset_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dataset_quality ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dataset_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dataset_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dataset_processing_logs ENABLE ROW LEVEL SECURITY;

-- 4. CREATE STRICT RLS POLICIES

-- Datasets Policies
DROP POLICY IF EXISTS "Users can view own datasets" ON public.datasets;
CREATE POLICY "Users can view own datasets" ON public.datasets FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own datasets" ON public.datasets;
CREATE POLICY "Users can insert own datasets" ON public.datasets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own datasets" ON public.datasets;
CREATE POLICY "Users can update own datasets" ON public.datasets FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own datasets" ON public.datasets;
CREATE POLICY "Users can delete own datasets" ON public.datasets FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Dataset Versions Policies
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

-- Dataset Statistics Policies
DROP POLICY IF EXISTS "Users can view own dataset statistics" ON public.dataset_statistics;
CREATE POLICY "Users can view own dataset statistics" ON public.dataset_statistics FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.datasets d WHERE d.id = dataset_statistics.dataset_id AND d.user_id = auth.uid()));

-- Dataset Tags Policies
DROP POLICY IF EXISTS "Users can view own dataset tags" ON public.dataset_tags;
CREATE POLICY "Users can view own dataset tags" ON public.dataset_tags FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.datasets d WHERE d.id = dataset_tags.dataset_id AND d.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own dataset tags" ON public.dataset_tags;
CREATE POLICY "Users can insert own dataset tags" ON public.dataset_tags FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.datasets d WHERE d.id = dataset_tags.dataset_id AND d.user_id = auth.uid()));

-- Dataset Processing Logs Policies
DROP POLICY IF EXISTS "Users can view own processing logs" ON public.dataset_processing_logs;
CREATE POLICY "Users can view own processing logs" ON public.dataset_processing_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own processing logs" ON public.dataset_processing_logs;
CREATE POLICY "Users can insert own processing logs" ON public.dataset_processing_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 5. REUSABLE POSTGRESQL FUNCTIONS

-- Function 1: create_dataset
CREATE OR REPLACE FUNCTION public.create_dataset(
  p_user_id UUID,
  p_dataset_name TEXT,
  p_original_filename TEXT,
  p_storage_path TEXT,
  p_file_type TEXT,
  p_mime_type TEXT,
  p_file_size BIGINT,
  p_description TEXT DEFAULT NULL,
  p_storage_bucket TEXT DEFAULT 'datasets',
  p_upload_source TEXT DEFAULT 'manual_upload'
)
RETURNS UUID AS $$
DECLARE
  v_dataset_id UUID;
BEGIN
  INSERT INTO public.datasets (
    user_id, dataset_name, original_filename, storage_bucket, storage_path, 
    file_type, mime_type, file_size, description, upload_source, upload_status, processing_status
  )
  VALUES (
    p_user_id, p_dataset_name, p_original_filename, p_storage_bucket, p_storage_path, 
    UPPER(p_file_type), p_mime_type, p_file_size, p_description, p_upload_source, 'completed', 'ready'
  )
  RETURNING id INTO v_dataset_id;

  -- Create Initial Version 1
  INSERT INTO public.dataset_versions (dataset_id, version_number, storage_path, version_notes)
  VALUES (v_dataset_id, 1, p_storage_path, 'Initial dataset upload');

  -- Initialize Default Statistics Row
  INSERT INTO public.dataset_statistics (dataset_id, memory_usage)
  VALUES (v_dataset_id, p_file_size);

  -- Initialize Default Quality Row
  INSERT INTO public.dataset_quality (dataset_id, quality_score, validation_status)
  VALUES (v_dataset_id, 100.00, 'passed');

  RETURN v_dataset_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 2: update_dataset
CREATE OR REPLACE FUNCTION public.update_dataset(
  p_dataset_id UUID,
  p_dataset_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_processing_status TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.datasets
  SET 
    dataset_name = COALESCE(p_dataset_name, dataset_name),
    description = COALESCE(p_description, description),
    processing_status = COALESCE(p_processing_status, processing_status),
    updated_at = NOW()
  WHERE id = p_dataset_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 3: delete_dataset
CREATE OR REPLACE FUNCTION public.delete_dataset(p_dataset_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM public.datasets WHERE id = p_dataset_id;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 4: create_version
CREATE OR REPLACE FUNCTION public.create_version(
  p_dataset_id UUID,
  p_storage_path TEXT,
  p_version_notes TEXT DEFAULT 'New dataset version'
)
RETURNS INT AS $$
DECLARE
  v_next_version INT;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_next_version
  FROM public.dataset_versions
  WHERE dataset_id = p_dataset_id;

  INSERT INTO public.dataset_versions (dataset_id, version_number, storage_path, version_notes)
  VALUES (p_dataset_id, v_next_version, p_storage_path, p_version_notes);

  UPDATE public.datasets
  SET storage_path = p_storage_path, updated_at = NOW()
  WHERE id = p_dataset_id;

  RETURN v_next_version;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 5: log_processing
CREATE OR REPLACE FUNCTION public.log_processing(
  p_dataset_id UUID,
  p_user_id UUID,
  p_processing_stage TEXT,
  p_status TEXT,
  p_execution_time INT DEFAULT 0
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.dataset_processing_logs (dataset_id, user_id, processing_stage, status, execution_time)
  VALUES (p_dataset_id, p_user_id, p_processing_stage, p_status, p_execution_time)
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 6: get_dataset_statistics
CREATE OR REPLACE FUNCTION public.get_dataset_statistics(p_dataset_id UUID)
RETURNS TABLE (
  total_rows BIGINT,
  total_columns INT,
  numeric_columns INT,
  categorical_columns INT,
  datetime_columns INT,
  memory_usage BIGINT,
  quality_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.total_rows,
    s.total_columns,
    s.numeric_columns,
    s.categorical_columns,
    s.datetime_columns,
    s.memory_usage,
    COALESCE(q.quality_score, 100.00) AS quality_score
  FROM public.dataset_statistics s
  LEFT JOIN public.dataset_quality q ON q.dataset_id = s.dataset_id
  WHERE s.dataset_id = p_dataset_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. BIND TIMESTAMP TRIGGER
DROP TRIGGER IF EXISTS tr_datasets_updated_at ON public.datasets;
CREATE TRIGGER tr_datasets_updated_at
  BEFORE UPDATE ON public.datasets
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();
