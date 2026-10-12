-- ============================================================================
-- Migration: 008_dataset_rls.sql
-- Description: Dataset Management Row Level Security Policies
-- ============================================================================

ALTER TABLE public.datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dataset_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dataset_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dataset_quality ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dataset_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dataset_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dataset_processing_logs ENABLE ROW LEVEL SECURITY;

-- Datasets RLS
DROP POLICY IF EXISTS "Users can view own datasets" ON public.datasets;
CREATE POLICY "Users can view own datasets" ON public.datasets FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own datasets" ON public.datasets;
CREATE POLICY "Users can insert own datasets" ON public.datasets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own datasets" ON public.datasets;
CREATE POLICY "Users can update own datasets" ON public.datasets FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own datasets" ON public.datasets;
CREATE POLICY "Users can delete own datasets" ON public.datasets FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Dataset Versions RLS
DROP POLICY IF EXISTS "Users can view own dataset versions" ON public.dataset_versions;
CREATE POLICY "Users can view own dataset versions" ON public.dataset_versions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.datasets d WHERE d.id = dataset_versions.dataset_id AND d.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own dataset versions" ON public.dataset_versions;
CREATE POLICY "Users can insert own dataset versions" ON public.dataset_versions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.datasets d WHERE d.id = dataset_versions.dataset_id AND d.user_id = auth.uid()));

-- Dataset Columns RLS
DROP POLICY IF EXISTS "Users can view own dataset columns" ON public.dataset_columns;
CREATE POLICY "Users can view own dataset columns" ON public.dataset_columns FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.datasets d WHERE d.id = dataset_columns.dataset_id AND d.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own dataset columns" ON public.dataset_columns;
CREATE POLICY "Users can insert own dataset columns" ON public.dataset_columns FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.datasets d WHERE d.id = dataset_columns.dataset_id AND d.user_id = auth.uid()));

-- Dataset Quality RLS
DROP POLICY IF EXISTS "Users can view own dataset quality" ON public.dataset_quality;
CREATE POLICY "Users can view own dataset quality" ON public.dataset_quality FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.datasets d WHERE d.id = dataset_quality.dataset_id AND d.user_id = auth.uid()));

-- Dataset Statistics RLS
DROP POLICY IF EXISTS "Users can view own dataset statistics" ON public.dataset_statistics;
CREATE POLICY "Users can view own dataset statistics" ON public.dataset_statistics FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.datasets d WHERE d.id = dataset_statistics.dataset_id AND d.user_id = auth.uid()));

-- Dataset Tags RLS
DROP POLICY IF EXISTS "Users can view own dataset tags" ON public.dataset_tags;
CREATE POLICY "Users can view own dataset tags" ON public.dataset_tags FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.datasets d WHERE d.id = dataset_tags.dataset_id AND d.user_id = auth.uid()));

-- Dataset Processing Logs RLS
DROP POLICY IF EXISTS "Users can view own processing logs" ON public.dataset_processing_logs;
CREATE POLICY "Users can view own processing logs" ON public.dataset_processing_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own processing logs" ON public.dataset_processing_logs;
CREATE POLICY "Users can insert own processing logs" ON public.dataset_processing_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
