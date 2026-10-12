/**
 * InsightIQ AI - AI Intelligence & Predictive Analytics Contracts
 */

export interface StructuredAIAnalysisResponse {
  summary: string;
  key_findings: string[];
  trends: string[];
  anomalies: string[];
  predictions: string[];
  risks: string[];
  opportunities: string[];
  recommendations: string[];
  confidence: number;
}

export interface PredictionResult {
  success: boolean;
  dataset_id: string;
  target_column: string;
  feature_columns: string[];
  prediction_value?: number;
  confidence_score: number;
  validation_status: 'valid' | 'insufficient_data' | 'invalid_target';
  message?: string;
  generated_at: string;
}

export interface AnomalyExplanation {
  success: boolean;
  dataset_id: string;
  explanation: string;
  anomalies: any[];
}

export interface ForecastResult {
  success: boolean;
  job_id: string;
  algorithm: string;
  horizon: number;
  status: string;
  metrics: {
    mae: number;
    rmse: number;
    confidence_score: number;
  };
}

export interface AIExecutionLog {
  user_id: string;
  dataset_id: string;
  request_type: string;
  status: 'started' | 'completed' | 'failed';
  execution_time_ms: number;
  created_at: string;
}
