/**
 * InsightIQ AI - Enterprise Dataset Management Contracts
 * Aligned with Canonical Supabase Database Schema
 */

export type DatasetFileType = 'CSV' | 'XLS' | 'XLSX' | 'JSON' | 'PARQUET';

export type DatasetUploadStatus = 'completed' | 'failed' | 'processing' | 'pending';

export type DatasetProcessingStatus = 'ready' | 'processing' | 'failed' | 'error';

export type ValidationStatus = 'passed' | 'warning' | 'failed' | 'pending';

export interface Dataset {
  id: string;
  user_id: string;
  name: string;
  dataset_name?: string; // Backward compatibility fallback
  original_filename: string;
  storage_path: string;
  file_type: DatasetFileType;
  file_size: number;
  row_count?: number;
  column_count?: number;
  upload_source?: string;
  status: string;
  storage_bucket?: string;
  mime_type?: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DatasetVersion {
  id: string;
  version_number: number;
  dataset_id: string;
  storage_path: string;
  description?: string | null;
  version_notes?: string | null;
  created_at: string;
}

export interface DatasetColumn {
  id: string;
  dataset_id: string;
  column_name: string;
  data_type: string;
  detected_data_type?: string;
  canonical_type?: string;
  semantic_type?: string;
  null_percentage: number;
  unique_values: number;
  unique_count?: number;
  missing_count?: number;
  sample_values: any[];
  is_target: boolean;
  is_target_column?: boolean;
  is_numeric?: boolean;
  is_categorical?: boolean;
  is_temporal?: boolean;
  is_identifier?: boolean;
  is_boolean?: boolean;
  is_geographic?: boolean;
  created_at?: string;
}

export interface DatasetQuality {
  id: string;
  dataset_id: string;
  duplicate_rows: number;
  missing_values: number;
  outlier_count: number;
  quality_score: number;
  last_scanned?: string;
  scanned_at?: string;
  validation_status?: ValidationStatus;
}

export interface DatasetStatistics {
  id: string;
  dataset_id: string;
  total_rows: number;
  total_columns: number;
  numeric_columns: number;
  categorical_columns: number;
  datetime_columns: number;
  memory_usage: number;
  mean?: number;
  median?: number;
  std_dev?: number;
  outlier_count?: number;
  unique_values?: number;
  created_at: string;
}

export interface TransformationOperation {
  type: string;
  affectedColumns?: string[];
  casing?: string;
  parameters?: Record<string, any>;
}

export interface TransformationEntry {
  operation: string;
  timestamp: string;
  affectedColumns: string[];
  details?: Record<string, any>;
}

export interface TransformResult {
  transformedColumns: DatasetColumn[];
  history: TransformationEntry[];
  message: string;
}

export interface DatasetTag {
  id: string;
  dataset_id: string;
  tag_name: string;
  created_at: string;
}

export interface DatasetProcessingLog {
  id: string;
  dataset_id?: string | null;
  user_id: string;
  processing_stage: string;
  status: 'started' | 'completed' | 'failed' | 'in_progress';
  execution_time: number; // in milliseconds
  created_at: string;
}

export interface DatasetFullDetails {
  dataset: Dataset;
  versions: DatasetVersion[];
  columns: DatasetColumn[];
  quality: DatasetQuality | null;
  statistics: DatasetStatistics | null;
  tags: DatasetTag[];
  logs: DatasetProcessingLog[];
}

/** Structured dataset profile for AI consumption */
export interface DatasetProfile {
  dataset_name: string;
  row_count: number;
  column_count: number;
  column_names: string[];
  data_types: Array<{ column_name: string; detected_type: string; semantic_type: string; is_numeric: boolean; is_categorical: boolean; is_temporal: boolean; is_identifier: boolean; is_geographic: boolean }>;
  missingness: number;
  cardinality: number;
  statistics: { mean?: number; median?: number; std_dev?: number; outlier_count?: number; unique_values?: number } | null;
  detected_date_columns: string[];
  detected_geo_columns: string[];
  identifiers: string[];
  quality_issues: { duplicate_rows: number; missing_values: number; outlier_count: number; quality_score: number } | null
}

export interface WorkspaceSummary {
  id: string;
  workspace_name: string;
  description: string | null;
  is_personal: boolean;
  created_at: string;
  updated_at: string;
  dataset_count: number;
}

export interface WorkspaceDetails {
  workspace: WorkspaceSummary;
  datasetCount: number;
  datasets: Dataset[];
}
