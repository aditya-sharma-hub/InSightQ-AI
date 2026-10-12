-- ============================================================================
-- Migration: 015_machine_learning.sql
-- Description: Production Machine Learning Pipeline Schema, Model Registry & RLS Policies
-- ============================================================================

-- 1. ML PROJECTS TABLE
CREATE TABLE IF NOT EXISTS public.ml_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dataset_id UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
  dataset_version_id UUID REFERENCES public.dataset_versions(id) ON DELETE SET NULL,
  project_name TEXT NOT NULL,
  problem_type TEXT NOT NULL CHECK (problem_type IN ('classification', 'regression', 'clustering', 'time_series')),
  target_column TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ML FEATURES CONFIGURATION TABLE
CREATE TABLE IF NOT EXISTS public.ml_features (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.ml_projects(id) ON DELETE CASCADE,
  feature_name TEXT NOT NULL,
  feature_type TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'feature' CHECK (role IN ('feature', 'target', 'identifier', 'ignored')),
  transformation TEXT DEFAULT 'none',
  selected BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_project_feature UNIQUE (project_id, feature_name)
);

-- 3. ML TRAINING JOBS TABLE
CREATE TABLE IF NOT EXISTS public.ml_training_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.ml_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  algorithm TEXT NOT NULL,
  training_status TEXT DEFAULT 'queued' CHECK (training_status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  execution_time INT DEFAULT 0,
  error_message TEXT,
  configuration JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ML MODEL REGISTRY TABLE
CREATE TABLE IF NOT EXISTS public.ml_models (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.ml_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  training_job_id UUID REFERENCES public.ml_training_jobs(id) ON DELETE SET NULL,
  model_name TEXT NOT NULL,
  algorithm TEXT NOT NULL,
  version INT DEFAULT 1 NOT NULL,
  status TEXT DEFAULT 'candidate' CHECK (status IN ('development', 'candidate', 'production', 'archived')),
  artifact_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_project_model_version UNIQUE (project_id, version)
);

-- 5. ML MODEL METRICS TABLE
CREATE TABLE IF NOT EXISTS public.ml_model_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id UUID NOT NULL REFERENCES public.ml_models(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC(12,6) NOT NULL,
  evaluation_dataset TEXT DEFAULT 'test',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_model_metric UNIQUE (model_id, metric_name, evaluation_dataset)
);

-- 6. ML PREDICTIONS TABLE
CREATE TABLE IF NOT EXISTS public.ml_predictions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id UUID NOT NULL REFERENCES public.ml_models(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.ml_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  input_reference JSONB NOT NULL,
  prediction JSONB NOT NULL,
  confidence NUMERIC(5,2) DEFAULT 95.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. ML FEATURE IMPORTANCE TABLE
CREATE TABLE IF NOT EXISTS public.ml_feature_importance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id UUID NOT NULL REFERENCES public.ml_models(id) ON DELETE CASCADE,
  feature_name TEXT NOT NULL,
  importance NUMERIC(8,6) NOT NULL,
  method TEXT DEFAULT 'random_forest_gini',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_model_feature_importance UNIQUE (model_id, feature_name)
);

-- 8. ML MONITORING & DATA DRIFT TABLE
CREATE TABLE IF NOT EXISTS public.ml_monitoring_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id UUID NOT NULL REFERENCES public.ml_models(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.ml_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  prediction_volume INT DEFAULT 0,
  confidence_distribution JSONB DEFAULT '{}'::jsonb,
  error_metrics JSONB DEFAULT '{}'::jsonb,
  drift_indicators JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. ENABLE ROW LEVEL SECURITY (RLS) ON ALL 8 ML TABLES
ALTER TABLE public.ml_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_training_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_model_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_feature_importance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_monitoring_metrics ENABLE ROW LEVEL SECURITY;

-- 10. CREATE RLS POLICIES (Users access ONLY their own ML objects)

-- ml_projects
DROP POLICY IF EXISTS "Users can view own ML projects" ON public.ml_projects;
CREATE POLICY "Users can view own ML projects" ON public.ml_projects FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own ML projects" ON public.ml_projects;
CREATE POLICY "Users can insert own ML projects" ON public.ml_projects FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own ML projects" ON public.ml_projects;
CREATE POLICY "Users can update own ML projects" ON public.ml_projects FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ml_features
DROP POLICY IF EXISTS "Users can view features of own ML projects" ON public.ml_features;
CREATE POLICY "Users can view features of own ML projects" ON public.ml_features FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ml_projects p WHERE p.id = ml_features.project_id AND p.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert features into own ML projects" ON public.ml_features;
CREATE POLICY "Users can insert features into own ML projects" ON public.ml_features FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.ml_projects p WHERE p.id = ml_features.project_id AND p.user_id = auth.uid()));

-- ml_training_jobs
DROP POLICY IF EXISTS "Users can view own training jobs" ON public.ml_training_jobs;
CREATE POLICY "Users can view own training jobs" ON public.ml_training_jobs FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own training jobs" ON public.ml_training_jobs;
CREATE POLICY "Users can insert own training jobs" ON public.ml_training_jobs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ml_models
DROP POLICY IF EXISTS "Users can view own ML models" ON public.ml_models;
CREATE POLICY "Users can view own ML models" ON public.ml_models FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own ML models" ON public.ml_models;
CREATE POLICY "Users can insert own ML models" ON public.ml_models FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ml_model_metrics
DROP POLICY IF EXISTS "Users can view metrics of own ML models" ON public.ml_model_metrics;
CREATE POLICY "Users can view metrics of own ML models" ON public.ml_model_metrics FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ml_models m WHERE m.id = ml_model_metrics.model_id AND m.user_id = auth.uid()));

-- ml_predictions
DROP POLICY IF EXISTS "Users can view own ML predictions" ON public.ml_predictions;
CREATE POLICY "Users can view own ML predictions" ON public.ml_predictions FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own ML predictions" ON public.ml_predictions;
CREATE POLICY "Users can insert own ML predictions" ON public.ml_predictions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ml_feature_importance
DROP POLICY IF EXISTS "Users can view feature importance of own ML models" ON public.ml_feature_importance;
CREATE POLICY "Users can view feature importance of own ML models" ON public.ml_feature_importance FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ml_models m WHERE m.id = ml_feature_importance.model_id AND m.user_id = auth.uid()));

-- ml_monitoring_metrics
DROP POLICY IF EXISTS "Users can view monitoring metrics of own ML models" ON public.ml_monitoring_metrics;
CREATE POLICY "Users can view monitoring metrics of own ML models" ON public.ml_monitoring_metrics FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 11. REALTIME PUBLICATION SETUP
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ml_projects') THEN
    ALTER TABLE public.ml_projects REPLICA IDENTITY FULL;
    ALTER TABLE public.ml_training_jobs REPLICA IDENTITY FULL;
    ALTER TABLE public.ml_models REPLICA IDENTITY FULL;
    ALTER TABLE public.ml_predictions REPLICA IDENTITY FULL;

    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.ml_projects; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.ml_training_jobs; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.ml_models; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.ml_predictions; EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;
END $$;

-- 12. HIGH-PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_ml_projects_user ON public.ml_projects (user_id);
CREATE INDEX IF NOT EXISTS idx_ml_training_jobs_project ON public.ml_training_jobs (project_id);
CREATE INDEX IF NOT EXISTS idx_ml_models_project ON public.ml_models (project_id);
CREATE INDEX IF NOT EXISTS idx_ml_predictions_model ON public.ml_predictions (model_id);
