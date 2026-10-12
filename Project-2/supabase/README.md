# InsightIQ AI — Supabase Database Migration & Version Control Architecture

This directory contains the production-grade, version-controlled PostgreSQL migration suite for **InsightIQ AI**.

---

## 🗄️ Migration Execution Sequence (`supabase/migrations/`)

| File Name | Category | Description |
| :--- | :--- | :--- |
| **`001_core_profiles.sql`** | Core | Creates `public.profiles` schema and `update_timestamp()` trigger. |
| **`002_user_preferences.sql`** | Preferences | Creates `public.user_preferences` schema (`theme`, `timezone`, `currency`). |
| **`003_user_activity.sql`** | Audit Log | Creates `public.user_activity` audit logging schema. |
| **`004_auth_triggers.sql`** | Auth Provisioning | Defines `handle_new_user()` trigger for automated user provisioning on signup. |
| **`005_storage_buckets.sql`** | Storage | Configures private storage buckets (`avatars`, `datasets`, `reports`, `exports`, `models`). |
| **`006_storage_policies.sql`** | Storage RLS | Enforces storage RLS folder isolation `(storage.foldername(name))[1] = auth.uid()::text`. |
| **`007_dataset_management.sql`** | Dataset Engine | Creates `datasets`, `dataset_versions`, `dataset_columns`, `dataset_quality`, `dataset_statistics`, `dataset_tags`, `dataset_processing_logs`. |
| **`008_dataset_rls.sql`** | Dataset RLS | Enforces `auth.uid() = user_id` across all 7 dataset management tables. |
| **`009_business_intelligence.sql`** | BI Engine | Creates `business_kpis`, `dashboard_metrics`, `trend_analysis`, `anomaly_results`, `forecast_jobs`, `benchmark_results`, `executive_reports`. |
| **`010_business_intelligence_rls.sql`** | BI RLS | Enforces `auth.uid() = user_id` across all 7 BI tables. |
| **`011_realtime.sql`** | Realtime WS | Configures `supabase_realtime` publication for change data capture. |
| **`012_functions_and_triggers.sql`** | RPC Functions | Consolidates all PostgreSQL helper functions (`create_dataset`, `calculate_kpis`, `generate_summary`, etc.). |
| **`013_indexes.sql`** | Optimization | High-performance lookup indexes on `user_id`, `dataset_id`, `created_at`, `processing_status`. |

---

## 🛡️ Production Safety Rules

1. **Non-Destructive Execution**: All migration files use `CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS`, and `CREATE OR REPLACE FUNCTION` syntax to guarantee zero data loss.
2. **Never Execute `supabase db reset`**: Do NOT run destructive reset commands against production databases.
3. **TypeScript Contracts**: The database schema is codified in `src/types/database.types.ts`.

---

## 🌐 Execution Instructions

To execute these migrations in your Supabase SQL Editor:
1. Open your Supabase Dashboard at `https://app.supabase.com`.
2. Go to **SQL Editor** -> **New Query**.
3. Run migrations sequentially from `001_core_profiles.sql` to `013_indexes.sql`.
