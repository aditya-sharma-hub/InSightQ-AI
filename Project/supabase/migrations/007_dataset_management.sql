-- ============================================================================
-- Migration: 007_dataset_management.sql
-- Description: Dataset Management Schema (datasets, versions, columns, quality, stats, tags, logs)
-- ============================================================================

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

-- C. DATASET COLUMNS TABLE
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
  execution_time INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attach Updated At Trigger
DROP TRIGGER IF EXISTS tr_datasets_updated_at ON public.datasets;
CREATE TRIGGER tr_datasets_updated_at
  BEFORE UPDATE ON public.datasets
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();
