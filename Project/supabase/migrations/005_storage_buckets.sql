-- ============================================================================
-- Migration: 005_storage_buckets.sql
-- Description: Ensures Private Storage Buckets (avatars, datasets, reports, exports, models)
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('avatars', 'avatars', false),
  ('datasets', 'datasets', false),
  ('reports', 'reports', false),
  ('exports', 'exports', false),
  ('models', 'models', false)
ON CONFLICT (id) DO UPDATE SET 
  public = false;
