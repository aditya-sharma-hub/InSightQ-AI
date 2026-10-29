-- Migration: extend dataset_columns for canonical metadata schema contract
-- Created: 2026-08-09T13:24:00

ALTER TABLE public.dataset_columns
  ADD COLUMN IF NOT EXISTS canonical_type TEXT,
  ADD COLUMN IF NOT EXISTS source_type TEXT,
  ADD COLUMN IF NOT EXISTS is_numeric BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_temporal BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_identifier BOOLEAN DEFAULT false;

-- Add comment to explain columns
COMMENT ON COLUMN public.dataset_columns.canonical_type IS 'Canonical data type inferred (string, number, boolean, date, datetime)';
COMMENT ON COLUMN public.dataset_columns.source_type IS 'Original source data type from file metadata';
COMMENT ON COLUMN public.dataset_columns.is_numeric IS 'Flag indicating if the column is a valid analytical numeric column';
COMMENT ON COLUMN public.dataset_columns.is_temporal IS 'Flag indicating if the column represents a date/time column';
COMMENT ON COLUMN public.dataset_columns.is_identifier IS 'Flag indicating if the column is an identifier/categorical key';
