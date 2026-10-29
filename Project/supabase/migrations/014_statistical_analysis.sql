-- ============================================================================
-- Migration: 014_statistical_analysis.sql
-- Description: Advanced Statistical Analysis Engine Schema & RLS Policies
-- ============================================================================

-- 1. Create Statistical Analysis Results Table
CREATE TABLE IF NOT EXISTS public.statistical_analysis_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dataset_id UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
  analysis_type TEXT NOT NULL CHECK (analysis_type IN ('descriptive', 'correlation', 'hypothesis_test', 'confidence_interval', 'regression', 'outliers', 'time_series')),
  variables JSONB DEFAULT '[]'::jsonb,
  method TEXT NOT NULL,
  result JSONB NOT NULL,
  confidence_level NUMERIC(5,2) DEFAULT 95.00,
  p_value NUMERIC(12,8),
  effect_size NUMERIC(10,4),
  sample_size BIGINT NOT NULL,
  interpretation TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.statistical_analysis_results ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Security Policies
DROP POLICY IF EXISTS "Users can view own statistical results" ON public.statistical_analysis_results;
CREATE POLICY "Users can view own statistical results" ON public.statistical_analysis_results 
  FOR SELECT TO authenticated 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own statistical results" ON public.statistical_analysis_results;
CREATE POLICY "Users can insert own statistical results" ON public.statistical_analysis_results 
  FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own statistical results" ON public.statistical_analysis_results;
CREATE POLICY "Users can delete own statistical results" ON public.statistical_analysis_results 
  FOR DELETE TO authenticated 
  USING (auth.uid() = user_id);

-- 4. Enable Supabase Realtime Change Data Capture
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'statistical_analysis_results') THEN
    ALTER TABLE public.statistical_analysis_results REPLICA IDENTITY FULL;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.statistical_analysis_results; EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;
END $$;

-- 5. High-Performance Lookup Indexes
CREATE INDEX IF NOT EXISTS idx_stats_results_user_dataset ON public.statistical_analysis_results (user_id, dataset_id);
CREATE INDEX IF NOT EXISTS idx_stats_results_analysis_type ON public.statistical_analysis_results (analysis_type);
CREATE INDEX IF NOT EXISTS idx_stats_results_created_at ON public.statistical_analysis_results (created_at DESC);
