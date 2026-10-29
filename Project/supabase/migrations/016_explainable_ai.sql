-- ============================================================================
-- Migration: 016_explainable_ai.sql
-- Description: Explainable AI (XAI) Schema, Feature Contributions & RLS Policies
-- ============================================================================

-- 1. ML EXPLANATIONS TABLE
CREATE TABLE IF NOT EXISTS public.ml_explanations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES public.ml_models(id) ON DELETE CASCADE,
  prediction_id UUID REFERENCES public.ml_predictions(id) ON DELETE CASCADE,
  explanation_method TEXT NOT NULL CHECK (explanation_method IN ('SHAP', 'LIME', 'TreeInterpreter', 'FeaturePermutation')),
  explanation_type TEXT NOT NULL CHECK (explanation_type IN ('global', 'local', 'what_if', 'counterfactual')),
  explanation_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ML EXPLANATION FEATURES TABLE
CREATE TABLE IF NOT EXISTS public.ml_explanation_features (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  explanation_id UUID NOT NULL REFERENCES public.ml_explanations(id) ON DELETE CASCADE,
  feature_name TEXT NOT NULL,
  feature_value TEXT,
  contribution NUMERIC(10,6) NOT NULL,
  importance_rank INT NOT NULL,
  direction TEXT DEFAULT 'neutral' CHECK (direction IN ('positive', 'negative', 'neutral')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.ml_explanations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_explanation_features ENABLE ROW LEVEL SECURITY;

-- 4. CREATE RLS POLICIES
DROP POLICY IF EXISTS "Users can view own explanations" ON public.ml_explanations;
CREATE POLICY "Users can view own explanations" ON public.ml_explanations FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own explanations" ON public.ml_explanations;
CREATE POLICY "Users can insert own explanations" ON public.ml_explanations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view features of own explanations" ON public.ml_explanation_features;
CREATE POLICY "Users can view features of own explanations" ON public.ml_explanation_features FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ml_explanations e WHERE e.id = ml_explanation_features.explanation_id AND e.user_id = auth.uid()));

-- 5. REALTIME PUBLICATION SETUP
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ml_explanations') THEN
    ALTER TABLE public.ml_explanations REPLICA IDENTITY FULL;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.ml_explanations; EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;
END $$;

-- 6. HIGH-PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_ml_explanations_user ON public.ml_explanations (user_id);
CREATE INDEX IF NOT EXISTS idx_ml_explanations_model ON public.ml_explanations (model_id);
CREATE INDEX IF NOT EXISTS idx_ml_explanations_prediction ON public.ml_explanations (prediction_id);
