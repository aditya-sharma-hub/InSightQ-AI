-- ============================================================================
-- Migration: 010_business_intelligence_rls.sql
-- Description: Business Intelligence Row Level Security Policies
-- ============================================================================

ALTER TABLE public.business_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trend_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anomaly_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forecast_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benchmark_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.executive_reports ENABLE ROW LEVEL SECURITY;

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
