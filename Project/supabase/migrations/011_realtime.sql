-- ============================================================================
-- Migration: 011_realtime.sql
-- Description: Supabase Realtime Publication Configuration
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'datasets') THEN
    ALTER TABLE public.datasets REPLICA IDENTITY FULL;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'business_kpis') THEN
    ALTER TABLE public.business_kpis REPLICA IDENTITY FULL;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'dashboard_metrics') THEN
    ALTER TABLE public.dashboard_metrics REPLICA IDENTITY FULL;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'trend_analysis') THEN
    ALTER TABLE public.trend_analysis REPLICA IDENTITY FULL;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'anomaly_results') THEN
    ALTER TABLE public.anomaly_results REPLICA IDENTITY FULL;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'forecast_jobs') THEN
    ALTER TABLE public.forecast_jobs REPLICA IDENTITY FULL;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'executive_reports') THEN
    ALTER TABLE public.executive_reports REPLICA IDENTITY FULL;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_activity') THEN
    ALTER TABLE public.user_activity REPLICA IDENTITY FULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'datasets') THEN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.datasets; EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'business_kpis') THEN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.business_kpis; EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'dashboard_metrics') THEN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.dashboard_metrics; EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'trend_analysis') THEN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.trend_analysis; EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'anomaly_results') THEN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.anomaly_results; EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'forecast_jobs') THEN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.forecast_jobs; EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'executive_reports') THEN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.executive_reports; EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_activity') THEN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.user_activity; EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;
END $$;
