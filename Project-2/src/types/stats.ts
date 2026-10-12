/**
 * InsightIQ AI - Advanced Statistical Analysis Contracts
 */

export type StatisticalAnalysisType = 
  | 'descriptive'
  | 'correlation'
  | 'hypothesis_test'
  | 'confidence_interval'
  | 'regression'
  | 'outliers'
  | 'time_series';

export interface ColumnDescriptiveStats {
  sample_size: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  range: number;
  variance: number;
  std_dev: number;
  q1: number;
  q3: number;
  iqr: number;
}

export interface CorrelationPair {
  var_x: string;
  var_y: string;
  r: number;
  p_value: number;
  significant: boolean;
}

export interface OutlierVariableResult {
  method: 'IQR' | 'Z-Score';
  lower_bound: number;
  upper_bound: number;
  outlier_count: number;
  outliers: number[];
}

export interface StatisticalAnalysisRecord {
  id: string;
  user_id: string;
  dataset_id: string;
  analysis_type: StatisticalAnalysisType;
  variables: string[];
  method: string;
  result: any;
  confidence_level: number;
  p_value: number | null;
  effect_size: number | null;
  sample_size: number;
  interpretation: string;
  created_at: string;
}
