-- ============================================================================
-- Migration: 013_indexes.sql
-- Description: High-Performance Lookup Indexes
-- Target Columns: user_id, dataset_id, created_at, processing_status
-- ============================================================================

-- Core Profiles Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles (created_at DESC);

-- User Activity Indexes
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON public.user_activity (user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON public.user_activity (created_at DESC);

-- Datasets Indexes
CREATE INDEX IF NOT EXISTS idx_datasets_user_id ON public.datasets (user_id);
CREATE INDEX IF NOT EXISTS idx_datasets_processing_status ON public.datasets (processing_status);
CREATE INDEX IF NOT EXISTS idx_datasets_created_at ON public.datasets (created_at DESC);

-- Dataset Versions Indexes
CREATE INDEX IF NOT EXISTS idx_dataset_versions_dataset_id ON public.dataset_versions (dataset_id);
CREATE INDEX IF NOT EXISTS idx_dataset_versions_version_number ON public.dataset_versions (dataset_id, version_number DESC);

-- Dataset Columns Indexes
CREATE INDEX IF NOT EXISTS idx_dataset_columns_dataset_id ON public.dataset_columns (dataset_id);

-- Dataset Processing Logs Indexes
CREATE INDEX IF NOT EXISTS idx_dataset_processing_logs_dataset_id ON public.dataset_processing_logs (dataset_id);
CREATE INDEX IF NOT EXISTS idx_dataset_processing_logs_user_id ON public.dataset_processing_logs (user_id);

-- Business Intelligence Indexes
CREATE INDEX IF NOT EXISTS idx_business_kpis_user_dataset ON public.business_kpis (user_id, dataset_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_metrics_user_dataset ON public.dashboard_metrics (user_id, dataset_id);
CREATE INDEX IF NOT EXISTS idx_trend_analysis_user_dataset ON public.trend_analysis (user_id, dataset_id);
CREATE INDEX IF NOT EXISTS idx_anomaly_results_user_dataset ON public.anomaly_results (user_id, dataset_id);
CREATE INDEX IF NOT EXISTS idx_forecast_jobs_user_dataset ON public.forecast_jobs (user_id, dataset_id);
CREATE INDEX IF NOT EXISTS idx_benchmark_results_user_dataset ON public.benchmark_results (user_id, dataset_id);
CREATE INDEX IF NOT EXISTS idx_executive_reports_user_dataset ON public.executive_reports (user_id, dataset_id);
