/**
 * InsightIQ AI - Machine Learning Pipeline Contracts
 */

export type MLProblemType = 'classification' | 'regression' | 'clustering' | 'time_series';

export type MLFeatureRole = 'feature' | 'target' | 'identifier' | 'ignored';

export type MLTrainingStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export type MLModelLifecycleStatus = 'development' | 'candidate' | 'production' | 'archived';

export interface MLProject {
  id: string;
  user_id: string;
  dataset_id: string;
  dataset_version_id?: string | null;
  project_name: string;
  problem_type: MLProblemType;
  target_column: string;
  status: 'active' | 'completed' | 'archived' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface MLFeature {
  id: string;
  project_id: string;
  feature_name: string;
  feature_type: string;
  role: MLFeatureRole;
  transformation: string;
  selected: boolean;
  created_at: string;
}

export interface MLTrainingJob {
  id: string;
  project_id: string;
  user_id: string;
  algorithm: string;
  training_status: MLTrainingStatus;
  started_at?: string | null;
  completed_at?: string | null;
  execution_time: number;
  error_message?: string | null;
  configuration: Record<string, any>;
  created_at: string;
}

export interface MLModel {
  id: string;
  project_id: string;
  user_id: string;
  training_job_id?: string | null;
  model_name: string;
  algorithm: string;
  version: number;
  status: MLModelLifecycleStatus;
  artifact_path: string;
  created_at: string;
  updated_at: string;
}

export interface MLModelMetric {
  id: string;
  model_id: string;
  metric_name: string;
  metric_value: number;
  evaluation_dataset: string;
  created_at: string;
}

export interface MLPrediction {
  id: string;
  model_id: string;
  project_id: string;
  user_id: string;
  input_reference: Record<string, any>;
  prediction: Record<string, any>;
  confidence: number;
  created_at: string;
}

export interface MLFeatureImportance {
  id: string;
  model_id: string;
  feature_name: string;
  importance: number;
  method: string;
  created_at: string;
}

export interface MLMonitoringMetric {
  id: string;
  model_id: string;
  project_id: string;
  user_id: string;
  prediction_volume: number;
  confidence_distribution: Record<string, any>;
  error_metrics: Record<string, any>;
  drift_indicators: any[];
  created_at: string;
}

export interface MLModelComparison {
  model_id: string;
  model_name: string;
  version: number;
  algorithm: string;
  status: MLModelLifecycleStatus;
  metrics: Record<string, number>;
  training_time_ms: number;
  is_selected: boolean;
}
