-- ============================================================================
-- Migration: 012_functions_and_triggers.sql
-- Description: Reusable PostgreSQL Functions & Triggers Suite
-- ============================================================================

-- Function 1: create_dataset
CREATE OR REPLACE FUNCTION public.create_dataset(
  p_user_id UUID,
  p_dataset_name TEXT,
  p_original_filename TEXT,
  p_storage_path TEXT,
  p_file_type TEXT,
  p_mime_type TEXT,
  p_file_size BIGINT,
  p_description TEXT DEFAULT NULL,
  p_storage_bucket TEXT DEFAULT 'datasets',
  p_upload_source TEXT DEFAULT 'manual_upload'
)
RETURNS UUID AS $$
DECLARE
  v_dataset_id UUID;
BEGIN
  INSERT INTO public.datasets (
    user_id, name, original_filename, storage_path, 
    file_type, file_size, upload_source, status
  )
  VALUES (
    p_user_id, p_dataset_name, p_original_filename, p_storage_path, 
    UPPER(p_file_type), p_file_size, p_upload_source, 'processing'
  )
  RETURNING id INTO v_dataset_id;

  INSERT INTO public.dataset_versions (dataset_id, version_number, storage_path, description)
  VALUES (v_dataset_id, 1, p_storage_path, COALESCE(p_description, 'Initial dataset upload'));

  INSERT INTO public.dataset_statistics (dataset_id, memory_usage)
  VALUES (v_dataset_id, p_file_size)
  ON CONFLICT (dataset_id) DO NOTHING;

  INSERT INTO public.dataset_quality (dataset_id, quality_score)
  VALUES (v_dataset_id, 100.00)
  ON CONFLICT (dataset_id) DO NOTHING;

  RETURN v_dataset_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 2: update_dataset
CREATE OR REPLACE FUNCTION public.update_dataset(
  p_dataset_id UUID,
  p_dataset_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_processing_status TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.datasets
  SET 
    name = COALESCE(p_dataset_name, name),
    status = COALESCE(p_processing_status, status),
    updated_at = NOW()
  WHERE id = p_dataset_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 3: delete_dataset
CREATE OR REPLACE FUNCTION public.delete_dataset(p_dataset_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM public.datasets WHERE id = p_dataset_id;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 4: create_version
CREATE OR REPLACE FUNCTION public.create_version(
  p_dataset_id UUID,
  p_storage_path TEXT,
  p_version_notes TEXT DEFAULT 'New dataset version'
)
RETURNS INT AS $$
DECLARE
  v_next_version INT;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_next_version
  FROM public.dataset_versions
  WHERE dataset_id = p_dataset_id;

  INSERT INTO public.dataset_versions (dataset_id, version_number, storage_path, description)
  VALUES (p_dataset_id, v_next_version, p_storage_path, p_version_notes);

  UPDATE public.datasets
  SET storage_path = p_storage_path, updated_at = NOW()
  WHERE id = p_dataset_id;

  RETURN v_next_version;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 5: log_processing
CREATE OR REPLACE FUNCTION public.log_processing(
  p_dataset_id UUID,
  p_user_id UUID,
  p_processing_stage TEXT,
  p_status TEXT,
  p_execution_time INT DEFAULT 0
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.dataset_processing_logs (dataset_id, user_id, processing_stage, status, execution_time)
  VALUES (p_dataset_id, p_user_id, p_processing_stage, p_status, p_execution_time)
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 6: calculate_kpis
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

-- Function 7: generate_dashboard
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

-- Function 8: store_anomaly
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

-- Function 9: create_forecast_job
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

-- Function 10: generate_summary
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
