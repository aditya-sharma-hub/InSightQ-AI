-- ============================================================================
-- InsightIQ AI - Universal Data Understanding, Cleaning & Quarantine Migration
-- Adds quarantined records, cleaning logs, document profiling,
-- and updates datasets.file_type check constraint.
-- ============================================================================

-- 1. Extend file_type check constraint on public.datasets
DO $$
BEGIN
  -- Drop existing check constraint if present
  ALTER TABLE public.datasets DROP CONSTRAINT IF EXISTS datasets_file_type_check;
  
  -- Add comprehensive check constraint
  ALTER TABLE public.datasets ADD CONSTRAINT datasets_file_type_check 
    CHECK (file_type IN ('CSV', 'TSV', 'XLS', 'XLSX', 'JSON', 'JSONL', 'TXT', 'MD', 'LOG', 'PDF', 'DOCX', 'PARQUET'));
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Skipped file_type constraint update: %', SQLERRM;
END $$;

-- 2. Quarantined Records Table (Preserves invalid/malformed records non-destructively)
CREATE TABLE IF NOT EXISTS public.dataset_quarantine_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
  original_line_number INT,
  raw_record JSONB NOT NULL,
  quarantine_reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quarantine_dataset_id ON public.dataset_quarantine_records(dataset_id);

ALTER TABLE public.dataset_quarantine_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view quarantined records for their datasets"
  ON public.dataset_quarantine_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.datasets d
      WHERE d.id = dataset_quarantine_records.dataset_id
      AND d.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert quarantined records for their datasets"
  ON public.dataset_quarantine_records FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.datasets d
      WHERE d.id = dataset_quarantine_records.dataset_id
      AND d.user_id = auth.uid()
    )
  );

-- 3. Dataset Cleaning Audit Logs Table (Reproducible transformation history)
CREATE TABLE IF NOT EXISTS public.dataset_cleaning_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
  version_from INT DEFAULT 1,
  version_to INT DEFAULT 2,
  operations_applied JSONB NOT NULL DEFAULT '[]'::jsonb,
  audit_trail JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cleaning_logs_dataset_id ON public.dataset_cleaning_logs(dataset_id);

ALTER TABLE public.dataset_cleaning_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cleaning logs for their datasets"
  ON public.dataset_cleaning_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.datasets d
      WHERE d.id = dataset_cleaning_logs.dataset_id
      AND d.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert cleaning logs for their datasets"
  ON public.dataset_cleaning_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.datasets d
      WHERE d.id = dataset_cleaning_logs.dataset_id
      AND d.user_id = auth.uid()
    )
  );

-- 4. Document Profiles Table (Unstructured and semi-structured extractions)
CREATE TABLE IF NOT EXISTS public.dataset_document_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE UNIQUE,
  detected_language TEXT DEFAULT 'english',
  word_count INT DEFAULT 0,
  character_count INT DEFAULT 0,
  page_count INT DEFAULT 1,
  extracted_entities JSONB DEFAULT '{}'::jsonb,
  top_keywords JSONB DEFAULT '[]'::jsonb,
  sections JSONB DEFAULT '[]'::jsonb,
  extracted_tables JSONB DEFAULT '[]'::jsonb,
  is_scanned BOOLEAN DEFAULT false,
  extraction_confidence NUMERIC(4,2) DEFAULT 1.00,
  scanned_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.dataset_document_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view document profiles for their datasets"
  ON public.dataset_document_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.datasets d
      WHERE d.id = dataset_document_profiles.dataset_id
      AND d.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage document profiles for their datasets"
  ON public.dataset_document_profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.datasets d
      WHERE d.id = dataset_document_profiles.dataset_id
      AND d.user_id = auth.uid()
    )
  );
