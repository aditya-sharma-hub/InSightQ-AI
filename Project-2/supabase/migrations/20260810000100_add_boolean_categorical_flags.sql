-- Migration: extend dataset_columns with boolean and categorical flags
-- Created: 2026-08-10

ALTER TABLE public.dataset_columns
  ADD COLUMN IF NOT EXISTS is_boolean BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_categorical BOOLEAN DEFAULT false;

-- Comment
COMMENT ON COLUMN public.dataset_columns.is_boolean IS 'Flag indicating if the column contains boolean/binary values (true/false, yes/no, 0/1)';
COMMENT ON COLUMN public.dataset_columns.is_categorical IS 'Flag indicating if the column is a categorical/string feature (not identifier, not numeric, not temporal)';

-- Backfill: For existing rows, set is_categorical=true where all other flags are false and canonical_type is string
UPDATE public.dataset_columns
SET is_categorical = true
WHERE is_numeric = false
  AND is_temporal = false
  AND is_identifier = false
  AND is_boolean = false
  AND (canonical_type = 'string' OR canonical_type IS NULL);
