/**
 * InsightIQ AI - Edge Functions API Request/Response Contracts
 */

export interface HealthCheckResponse {
  status: string;
  service: string;
  timestamp: string;
  geminiConfigured: boolean;
}

export interface AIReportRequest {
  dataset_id: string;
  analysis_type?: string;
}

export interface AIReportResponse {
  success: boolean;
  dataset_id: string;
  analysis_type: string;
  output: string;
  generated_at: string;
}

export interface PDFReportRequest {
  dataset_id: string;
  report_title?: string;
}

export interface PDFReportResponse {
  success: boolean;
  dataset_id: string;
  storage_path: string;
  bucket: string;
  file_name: string;
  signed_url?: string | null;
}

export interface ForecastRequest {
  dataset_id: string;
  algorithm?: string;
  prediction_horizon?: number;
}

export interface ForecastResponse {
  success: boolean;
  job_id: string;
  algorithm: string;
  horizon: number;
  status: string;
}

export interface BenchmarkRequest {
  dataset_id: string;
  benchmark_name?: string;
}

export interface BenchmarkResponse {
  success: boolean;
  benchmark: any;
}
