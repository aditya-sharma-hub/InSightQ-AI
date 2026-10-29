-- ============================================================================
-- Migration: 20260808000007_fix_dataset_functions.sql
-- Description: Align helper PostgreSQL functions with canonical database schema.
-- Fixes RPC functions (create_dataset, update_dataset, create_version) that
-- previously referenced obsolete columns (dataset_name, version_notes) instead of
-- canonical columns (name, description).
-- ============================================================================

-- 1. FIX create_dataset FUNCTION
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

-- 2. FIX update_dataset FUNCTION
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

-- 3. FIX create_version FUNCTION
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
