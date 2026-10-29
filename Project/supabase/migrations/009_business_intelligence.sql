-- ============================================================================
-- Migration: 009_business_intelligence.sql
-- Description: Business Intelligence Schema (KPIs, Dashboards, Trends, Anomalies, Forecasts, Reports)
-- ============================================================================

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
  refresh_interval INT DEFAULT 3600,
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
  prediction_horizon INT DEFAULT 30,
  model_status TEXT DEFAULT 'completed' CHECK (model_status IN ('pending', 'training', 'completed', 'failed')),
  metrics JSONB DEFAULT '{}'::jsonb,
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
