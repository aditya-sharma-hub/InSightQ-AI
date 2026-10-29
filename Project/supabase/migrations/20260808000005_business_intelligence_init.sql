-- ============================================================================
-- InsightIQ AI - Business Intelligence Engine Backend Migration
-- Tables: business_kpis, dashboard_metrics, trend_analysis, anomaly_results,
--         forecast_jobs, benchmark_results, executive_reports
-- RLS Policies & Reusable PostgreSQL Functions
-- ============================================================================

-- 1. PREREQUISITE TABLES & FUNCTIONS (Self-Contained Safeguards)
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

CREATE TABLE IF NOT EXISTS public.datasets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dataset_name TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  storage_bucket TEXT DEFAULT 'datasets',
  storage_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  upload_source TEXT DEFAULT 'manual_upload',
  upload_status TEXT DEFAULT 'completed',
  processing_status TEXT DEFAULT 'ready',
  description TEXT,
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

-- A. BUSINESS KPIS TABLE
CREATE TABLE IF NOT EXISTS public.business_kpis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dataset_id UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('sum', 'average', 'count', 'ratio', 'growth', 'percentage')),
  metric_value NUMERIC(15,4) NOT NULL,
  aggregation TEXT NOT NULL CHECK (aggregation IN ('sum', 'avg', 'min', 'max', 'count', 'distinct_count')),
  visualization_type TEXT DEFAULT 'card' CHECK (visualization_type IN ('card', 'gauge', 'trend_line', 'progress')),
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);

-- B. DASHBOARD METRICS TABLE
CREATE TABLE IF NOT EXISTS public.dashboard_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dataset_id UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
  widget_name TEXT NOT NULL,
  widget_type TEXT NOT NULL CHECK (widget_type IN ('chart', 'kpi_card', 'table', 'map', 'funnel')),
  chart_type TEXT DEFAULT 'bar' CHECK (chart_type IN ('bar', 'line', 'pie', 'donut', 'area', 'scatter', 'heatmap')),
  x_axis TEXT,
  y_axis TEXT,
  filters JSONB DEFAULT '{}'::jsonb,
  refresh_interval INT DEFAULT 3600, -- seconds
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- C. TREND ANALYSIS TABLE
CREATE TABLE IF NOT EXISTS public.trend_analysis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dataset_id UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
  trend_type TEXT NOT NULL CHECK (trend_type IN ('linear', 'exponential', 'seasonal', 'cyclical')),
  confidence NUMERIC(5,2) DEFAULT 95.00,
  slope NUMERIC(12,6) DEFAULT 0.000000,
  seasonality TEXT DEFAULT 'none' CHECK (seasonality IN ('none', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  summary TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- D. ANOMALY RESULTS TABLE
CREATE TABLE IF NOT EXISTS public.anomaly_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dataset_id UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
  anomaly_type TEXT NOT NULL CHECK (anomaly_type IN ('outlier', 'spike', 'drop', 'variance_shift', 'pattern_break')),
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  affected_columns JSONB DEFAULT '[]'::jsonb,
  explanation TEXT,
  detected_at TIMESTAMPTZ DEFAULT NOW()
);

-- E. FORECAST JOBS TABLE
CREATE TABLE IF NOT EXISTS public.forecast_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dataset_id UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
  forecasting_algorithm TEXT NOT NULL CHECK (forecasting_algorithm IN ('arima', 'prophet', 'exponential_smoothing', 'linear_regression')),
  prediction_horizon INT DEFAULT 30, -- periods/days
  model_status TEXT DEFAULT 'completed' CHECK (model_status IN ('pending', 'training', 'completed', 'failed')),
  metrics JSONB DEFAULT '{}'::jsonb, -- MAE, RMSE, MAPE
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- F. BENCHMARK RESULTS TABLE
CREATE TABLE IF NOT EXISTS public.benchmark_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dataset_id UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
  benchmark_name TEXT NOT NULL,
  benchmark_score NUMERIC(7,2) DEFAULT 0.00,
  percentile NUMERIC(5,2) DEFAULT 50.00,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- G. EXECUTIVE REPORTS TABLE
CREATE TABLE IF NOT EXISTS public.executive_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dataset_id UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  strengths JSONB DEFAULT '[]'::jsonb,
  weaknesses JSONB DEFAULT '[]'::jsonb,
  opportunities JSONB DEFAULT '[]'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ENABLE ROW LEVEL SECURITY (RLS) ON ALL 7 TABLES
ALTER TABLE public.business_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trend_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anomaly_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forecast_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benchmark_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.executive_reports ENABLE ROW LEVEL SECURITY;

-- 4. CREATE STRICT RLS POLICIES (Users access ONLY their own analytics)

-- Business KPIs Policies
DROP POLICY IF EXISTS "Users can view own KPIs" ON public.business_kpis;
CREATE POLICY "Users can view own KPIs" ON public.business_kpis FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own KPIs" ON public.business_kpis;
CREATE POLICY "Users can insert own KPIs" ON public.business_kpis FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Dashboard Metrics Policies
DROP POLICY IF EXISTS "Users can view own dashboard metrics" ON public.dashboard_metrics;
CREATE POLICY "Users can view own dashboard metrics" ON public.dashboard_metrics FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own dashboard metrics" ON public.dashboard_metrics;
CREATE POLICY "Users can insert own dashboard metrics" ON public.dashboard_metrics FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Trend Analysis Policies
DROP POLICY IF EXISTS "Users can view own trend analysis" ON public.trend_analysis;
CREATE POLICY "Users can view own trend analysis" ON public.trend_analysis FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own trend analysis" ON public.trend_analysis;
CREATE POLICY "Users can insert own trend analysis" ON public.trend_analysis FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Anomaly Results Policies
DROP POLICY IF EXISTS "Users can view own anomalies" ON public.anomaly_results;
CREATE POLICY "Users can view own anomalies" ON public.anomaly_results FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own anomalies" ON public.anomaly_results;
CREATE POLICY "Users can insert own anomalies" ON public.anomaly_results FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Forecast Jobs Policies
DROP POLICY IF EXISTS "Users can view own forecast jobs" ON public.forecast_jobs;
CREATE POLICY "Users can view own forecast jobs" ON public.forecast_jobs FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own forecast jobs" ON public.forecast_jobs;
CREATE POLICY "Users can insert own forecast jobs" ON public.forecast_jobs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Benchmark Results Policies
DROP POLICY IF EXISTS "Users can view own benchmark results" ON public.benchmark_results;
CREATE POLICY "Users can view own benchmark results" ON public.benchmark_results FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own benchmark results" ON public.benchmark_results;
CREATE POLICY "Users can insert own benchmark results" ON public.benchmark_results FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Executive Reports Policies
DROP POLICY IF EXISTS "Users can view own executive reports" ON public.executive_reports;
CREATE POLICY "Users can view own executive reports" ON public.executive_reports FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own executive reports" ON public.executive_reports;
CREATE POLICY "Users can insert own executive reports" ON public.executive_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 5. REUSABLE POSTGRESQL FUNCTIONS

-- Function 1: calculate_kpis
CREATE OR REPLACE FUNCTION public.calculate_kpis(
  p_user_id UUID,
  p_dataset_id UUID,
  p_metric_name TEXT,
  p_metric_type TEXT,
  p_metric_value NUMERIC,
  p_aggregation TEXT,
  p_visualization_type TEXT DEFAULT 'card'
)
RETURNS UUID AS $$
DECLARE
  v_kpi_id UUID;
BEGIN
  INSERT INTO public.business_kpis (
    user_id, dataset_id, metric_name, metric_type, metric_value, aggregation, visualization_type
  )
  VALUES (
    p_user_id, p_dataset_id, p_metric_name, p_metric_type, p_metric_value, p_aggregation, p_visualization_type
  )
  RETURNING id INTO v_kpi_id;

  RETURN v_kpi_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 2: generate_dashboard
CREATE OR REPLACE FUNCTION public.generate_dashboard(
  p_user_id UUID,
  p_dataset_id UUID,
  p_widget_name TEXT,
  p_widget_type TEXT,
  p_chart_type TEXT DEFAULT 'bar',
  p_x_axis TEXT DEFAULT NULL,
  p_y_axis TEXT DEFAULT NULL,
  p_filters JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_widget_id UUID;
BEGIN
  INSERT INTO public.dashboard_metrics (
    user_id, dataset_id, widget_name, widget_type, chart_type, x_axis, y_axis, filters
  )
  VALUES (
    p_user_id, p_dataset_id, p_widget_name, p_widget_type, p_chart_type, p_x_axis, p_y_axis, p_filters
  )
  RETURNING id INTO v_widget_id;

  RETURN v_widget_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 3: store_anomaly
CREATE OR REPLACE FUNCTION public.store_anomaly(
  p_user_id UUID,
  p_dataset_id UUID,
  p_anomaly_type TEXT,
  p_severity TEXT DEFAULT 'medium',
  p_affected_columns JSONB DEFAULT '[]'::jsonb,
  p_explanation TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_anomaly_id UUID;
BEGIN
  INSERT INTO public.anomaly_results (
    user_id, dataset_id, anomaly_type, severity, affected_columns, explanation
  )
  VALUES (
    p_user_id, p_dataset_id, p_anomaly_type, p_severity, p_affected_columns, p_explanation
  )
  RETURNING id INTO v_anomaly_id;

  RETURN v_anomaly_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 4: create_forecast_job
CREATE OR REPLACE FUNCTION public.create_forecast_job(
  p_user_id UUID,
  p_dataset_id UUID,
  p_forecasting_algorithm TEXT,
  p_prediction_horizon INT DEFAULT 30
)
RETURNS UUID AS $$
DECLARE
  v_job_id UUID;
BEGIN
  INSERT INTO public.forecast_jobs (
    user_id, dataset_id, forecasting_algorithm, prediction_horizon, model_status
  )
  VALUES (
    p_user_id, p_dataset_id, p_forecasting_algorithm, p_prediction_horizon, 'completed'
  )
  RETURNING id INTO v_job_id;

  RETURN v_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 5: generate_summary
CREATE OR REPLACE FUNCTION public.generate_summary(
  p_user_id UUID,
  p_dataset_id UUID,
  p_summary TEXT,
  p_strengths JSONB DEFAULT '[]'::jsonb,
  p_weaknesses JSONB DEFAULT '[]'::jsonb,
  p_opportunities JSONB DEFAULT '[]'::jsonb,
  p_recommendations JSONB DEFAULT '[]'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_report_id UUID;
BEGIN
  INSERT INTO public.executive_reports (
    user_id, dataset_id, summary, strengths, weaknesses, opportunities, recommendations
  )
  VALUES (
    p_user_id, p_dataset_id, p_summary, p_strengths, p_weaknesses, p_opportunities, p_recommendations
  )
  RETURNING id INTO v_report_id;

  RETURN v_report_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
