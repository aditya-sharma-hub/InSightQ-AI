-- ============================================================================
-- INSIGHTIQ AI — READ-ONLY PRODUCTION POSTGRESQL CATALOG AUDIT
-- File: Project/supabase/queries/inspect_catalog_state.sql
--
-- Purpose:
-- Completely inspects the live production PostgreSQL catalog to establish
-- ground truth for tables, columns, constraints, indexes, triggers,
-- functions, and RLS policies across workspaces, projects, datasets, and storage.
--
-- Invariants:
-- - 100% READ-ONLY: Contains only SELECT statements.
-- - No DDL, no DML, zero side-effects.
-- - Returns a structured JSON result.
-- ============================================================================
SELECT json_build_object(
    'timestamp',
    NOW(),
    'tables_and_views',
    (
      SELECT json_agg(
          json_build_object(
            'relname',
            c.relname,
            'relkind',
            c.relkind,
            'kind_desc',
            CASE
              c.relkind
              WHEN 'r' THEN 'ordinary table'
              WHEN 'v' THEN 'view'
              WHEN 'm' THEN 'materialized view'
              ELSE c.relkind::text
            END
          )
        )
      FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname IN (
          'workspaces',
          'projects',
          'datasets',
          'dataset_columns',
          'dataset_quality'
        )
    ),
    'workspaces_columns',
    (
      SELECT json_agg(
          json_build_object(
            'column_name',
            column_name,
            'data_type',
            data_type,
            'udt_name',
            udt_name,
            'is_nullable',
            is_nullable,
            'column_default',
            column_default
          )
          ORDER BY ordinal_position
        )
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'workspaces'
    ),
    'workspaces_constraints',
    (
      SELECT json_agg(
          json_build_object(
            'constraint_name',
            tc.constraint_name,
            'constraint_type',
            tc.constraint_type,
            'column_name',
            kcu.column_name,
            'delete_rule',
            rc.delete_rule
          )
        )
      FROM information_schema.table_constraints tc
        LEFT JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
        LEFT JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
        AND tc.table_schema = rc.constraint_schema
      WHERE tc.table_schema = 'public'
        AND tc.table_name = 'workspaces'
    ),
    'workspaces_indexes',
    (
      SELECT json_agg(
          json_build_object(
            'indexname',
            indexname,
            'indexdef',
            indexdef
          )
        )
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'workspaces'
    ),
    'datasets_columns',
    (
      SELECT json_agg(
          json_build_object(
            'column_name',
            column_name,
            'data_type',
            data_type,
            'is_nullable',
            is_nullable,
            'column_default',
            column_default
          )
          ORDER BY ordinal_position
        )
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'datasets'
    ),
    'rls_policies',
    (
      SELECT json_agg(
          json_build_object(
            'schemaname',
            schemaname,
            'tablename',
            tablename,
            'policyname',
            policyname,
            'permissive',
            permissive,
            'roles',
            roles,
            'cmd',
            cmd,
            'qual',
            qual,
            'with_check',
            with_check
          )
          ORDER BY schemaname,
            tablename,
            policyname
        )
      FROM pg_policies
      WHERE (
          schemaname = 'public'
          AND tablename IN (
            'workspaces',
            'datasets',
            'dataset_columns',
            'dataset_quality'
          )
        )
        OR (
          schemaname = 'storage'
          AND tablename = 'objects'
        )
    ),
    'triggers',
    (
      SELECT json_agg(
          json_build_object(
            'trigger_name',
            trigger_name,
            'event_object_table',
            event_object_table,
            'action_timing',
            action_timing,
            'event_manipulation',
            event_manipulation,
            'action_statement',
            action_statement
          )
        )
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
        AND event_object_table IN ('workspaces', 'projects', 'datasets')
    ),
    'functions',
    (
      SELECT json_agg(
          json_build_object(
            'proname',
            p.proname,
            'prosecdef',
            p.prosecdef,
            'proargnames',
            p.proargnames,
            'arguments',
            pg_get_function_arguments(p.oid),
            'proconfig',
            p.proconfig
          )
        )
      FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname IN (
          'upsert_workspace',
          'update_timestamp',
          'sync_workspace_name_columns',
          'validate_workspace_dataset_ownership',
          'projects_view_mutation_handler'
        )
    ),
    'storage_buckets',
    (
      SELECT json_agg(
          json_build_object(
            'id',
            id,
            'name',
            name,
            'public',
            public,
            'file_size_limit',
            file_size_limit,
            'allowed_mime_types',
            allowed_mime_types
          )
        )
      FROM storage.buckets
    )
  ) AS live_production_catalog_audit;