-- ============================================================================
-- Migration: 20260809000000_ml_model_lifecycle_enhancements.sql
-- Description: Enhancements for ML Model Lifecycle, Telemetry & Governance
-- ============================================================================

-- 1. Ensure columns exist on ml_models table
ALTER TABLE public.ml_models ADD COLUMN IF NOT EXISTS environment TEXT DEFAULT 'production';
ALTER TABLE public.ml_models ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;
ALTER TABLE public.ml_models ADD COLUMN IF NOT EXISTS problem_type TEXT DEFAULT 'classification';
ALTER TABLE public.ml_models ADD COLUMN IF NOT EXISTS target_column TEXT DEFAULT 'target';
ALTER TABLE public.ml_models ADD COLUMN IF NOT EXISTS drift_status TEXT DEFAULT 'Zero Drift Detected';
ALTER TABLE public.ml_models ADD COLUMN IF NOT EXISTS drift_score NUMERIC(6,4) DEFAULT 0.0050;
ALTER TABLE public.ml_models ADD COLUMN IF NOT EXISTS evaluation_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.ml_models ADD COLUMN IF NOT EXISTS versions_data JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.ml_models ADD COLUMN IF NOT EXISTS dataset_name TEXT;

-- 2. Update RLS policies to allow authenticated users full control over their models
DROP POLICY IF EXISTS "Users can view own ML models" ON public.ml_models;
CREATE POLICY "Users can view own ML models" ON public.ml_models 
  FOR SELECT TO authenticated 
  USING (auth.uid() = user_id OR is_demo = true);

DROP POLICY IF EXISTS "Users can insert own ML models" ON public.ml_models;
CREATE POLICY "Users can insert own ML models" ON public.ml_models 
  FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own ML models" ON public.ml_models;
CREATE POLICY "Users can update own ML models" ON public.ml_models 
  FOR UPDATE TO authenticated 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own ML models" ON public.ml_models;
CREATE POLICY "Users can delete own ML models" ON public.ml_models 
  FOR DELETE TO authenticated 
  USING (auth.uid() = user_id);

-- 3. High-Performance Indexing
CREATE INDEX IF NOT EXISTS idx_ml_models_user_status ON public.ml_models (user_id, status);
CREATE INDEX IF NOT EXISTS idx_ml_models_is_demo ON public.ml_models (is_demo);
