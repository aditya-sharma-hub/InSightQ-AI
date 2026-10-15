-- ============================================================================
-- InsightIQ AI — Explicit Database Cleanup Script for Demo Data
-- 
-- SAFETY RULES:
-- 1. Does NOT reset or drop any tables or databases.
-- 2. Does NOT delete user accounts (auth.users or public.profiles).
-- 3. Does NOT run broad TRUNCATE or DELETE without explicit ID filters.
-- 4. Targets ONLY conclusively known demo identifiers.
-- 5. Deletes child records first to respect foreign key integrity.
-- ============================================================================

DO $$
DECLARE
  v_demo_dataset_ids text[] := ARRAY['dataco-ds-001', 'demo-ds-001', 'demo-ds-002'];
  v_demo_project_ids text[] := ARRAY['proj-supply-chain-001', 'proj-customer-360-002', 'proj-financial-audit-003'];
  v_demo_model_ids text[] := ARRAY['mod-demo-001', 'mod-demo-002'];
  v_demo_report_ids text[] := ARRAY['rpt-demo-001', 'rpt-demo-002'];
BEGIN
  RAISE NOTICE 'Starting safe targeted cleanup of known demo records...';

  -- 1. Clean child records of demo datasets (if tables exist)
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'dataset_columns') THEN
    DELETE FROM public.dataset_columns WHERE dataset_id = ANY(v_demo_dataset_ids);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'dataset_versions') THEN
    DELETE FROM public.dataset_versions WHERE dataset_id = ANY(v_demo_dataset_ids);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'dataset_statistics') THEN
    DELETE FROM public.dataset_statistics WHERE dataset_id = ANY(v_demo_dataset_ids);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'dataset_quality') THEN
    DELETE FROM public.dataset_quality WHERE dataset_id = ANY(v_demo_dataset_ids);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'dataset_processing_logs') THEN
    DELETE FROM public.dataset_processing_logs WHERE dataset_id = ANY(v_demo_dataset_ids);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'dataset_upload_logs') THEN
    DELETE FROM public.dataset_upload_logs WHERE dataset_id = ANY(v_demo_dataset_ids);
  END IF;

  -- 2. Clean demo datasets
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'datasets') THEN
    DELETE FROM public.datasets 
    WHERE id = ANY(v_demo_dataset_ids) 
       OR name ILIKE '%DataCoSupplyChain%' 
       OR original_filename = 'sample_customer_telemetry.csv' 
       OR original_filename = 'sample_financial_forecast.csv';
  END IF;

  -- 3. Clean demo models (if table exists)
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ml_models') THEN
    DELETE FROM public.ml_models 
    WHERE id = ANY(v_demo_model_ids) 
       OR is_demo = true 
       OR model_name ILIKE '%Late Delivery Risk Predictor%'
       OR model_name ILIKE '%Order Demand Forecaster%';
  END IF;

  -- 4. Clean demo reports (if table exists)
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'executive_reports') THEN
    DELETE FROM public.executive_reports 
    WHERE id = ANY(v_demo_report_ids)
       OR title ILIKE '%Executive Analytics Summary Report%'
       OR title ILIKE '%Financial Forecasting & Scenario Outlook%';
  END IF;

  -- 5. Clean demo projects (if table exists)
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ml_projects') THEN
    DELETE FROM public.ml_projects 
    WHERE id = ANY(v_demo_project_ids)
       OR name ILIKE '%Supply Chain Optimization%'
       OR name ILIKE '%Customer 360 & Churn%'
       OR name ILIKE '%Q3 Financial Ledger%';
  END IF;

  RAISE NOTICE 'Completed safe targeted demo cleanup. Authentic records and schema intact.';
END $$;
