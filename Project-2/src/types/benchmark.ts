/**
 * InsightIQ AI - Benchmarking Intelligence Contracts & Types
 */

export type BenchmarkType = 'internal' | 'historical' | 'model' | 'user_defined' | 'external';

export type ComparisonDirection = 'higher_is_better' | 'lower_is_better';

export type BenchmarkStatus = 'above_benchmark' | 'at_benchmark' | 'below_benchmark' | 'not_applicable';

export interface UserBenchmark {
  id: string;
  user_id: string;
  benchmark_name: string;
  metric_name: string;
  reference_value: number;
  unit: string;
  comparison_direction: ComparisonDirection;
  created_at: string;
}

export interface ExternalBenchmark {
  id: string;
  benchmark_name: string;
  metric_name: string;
  reference_value: number;
  unit: string;
  source: string;
  source_url?: string | null;
  source_date?: string | null;
  methodology?: string | null;
  created_at: string;
}

export interface BenchmarkResult {
  id: string;
  user_id: string;
  dataset_id?: string;
  benchmark_name: string;
  metric_name?: string;
  actual_value?: number;
  benchmark_value?: number;
  difference?: number;
  percentage_difference?: number;
  benchmark_score: number;
  percentile: number;
  status?: BenchmarkStatus;
  benchmark_type?: BenchmarkType;
  source?: string;
  comparison_direction?: ComparisonDirection;
  sample_size?: number;
  confidence_level?: number;
  statistical_method?: string;
  generated_at: string;
}

export interface ModelMetricsMap {
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1?: number;
  roc_auc?: number;
  mae?: number;
  rmse?: number;
  r2?: number;
  mape?: number;
  [key: string]: number | undefined;
}

export interface ModelBenchmarkComparison {
  model_id: string;
  model_name: string;
  version: number;
  problem_type: 'classification' | 'regression' | 'time_series';
  status: string;
  metrics: ModelMetricsMap;
  is_baseline?: boolean;
}

export interface HistoricalBenchmarkComparison {
  metric_name: string;
  current_value: number;
  historical_value: number;
  difference: number;
  percentage_difference: number;
  direction: 'improvement' | 'deterioration' | 'no_change';
  historical_percentile?: number;
  sample_size?: number;
  calculated_at: string;
}

export interface BenchmarkValidationError {
  code: 'INCOMPATIBLE_METRIC' | 'INCOMPATIBLE_UNIT' | 'INVALID_NUMERIC' | 'UNAUTHORIZED' | 'MISSING_DATA';
  message: string;
}

export interface BenchmarkComparisonResponse {
  success: boolean;
  dataset_id?: string;
  metric_name: string;
  actual_value: number;
  benchmark_value: number;
  difference: number;
  percentage_difference: number;
  score: number;
  percentile?: number;
  status: BenchmarkStatus;
  benchmark_type: BenchmarkType;
  unit: string;
  source: string;
  comparison_direction: ComparisonDirection;
  interpretation: string;
  validation_error?: BenchmarkValidationError;
  record?: BenchmarkResult;
}
