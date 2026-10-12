/**
 * InsightIQ AI - Business Intelligence Engine Contracts
 */

export type KPIMetricType = 'sum' | 'average' | 'count' | 'ratio' | 'growth' | 'percentage';

export type KPIAggregation = 'sum' | 'avg' | 'min' | 'max' | 'count' | 'distinct_count';

export type KPIVisualizationType = 'card' | 'gauge' | 'trend_line' | 'progress';

export type WidgetType = 'chart' | 'kpi_card' | 'table' | 'map' | 'funnel';

export type ChartType = 'bar' | 'line' | 'pie' | 'donut' | 'area' | 'scatter' | 'heatmap';

export type TrendType = 'linear' | 'exponential' | 'seasonal' | 'cyclical';

export type SeasonalityFrequency = 'none' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export type AnomalyType = 'outlier' | 'spike' | 'drop' | 'variance_shift' | 'pattern_break';

export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';

export type ForecastingAlgorithm = 'arima' | 'prophet' | 'exponential_smoothing' | 'linear_regression';

export type ForecastModelStatus = 'pending' | 'training' | 'completed' | 'failed';

export interface BusinessKPI {
  id: string;
  user_id: string;
  dataset_id: string;
  metric_name: string;
  metric_type: KPIMetricType;
  metric_value: number;
  aggregation: KPIAggregation;
  visualization_type: KPIVisualizationType;
  calculated_at: string;
}

export interface DashboardMetric {
  id: string;
  user_id: string;
  dataset_id: string;
  widget_name: string;
  widget_type: WidgetType;
  chart_type: ChartType;
  x_axis?: string | null;
  y_axis?: string | null;
  filters: Record<string, any>;
  refresh_interval: number;
  created_at: string;
}

export interface TrendAnalysis {
  id: string;
  user_id: string;
  dataset_id: string;
  trend_type: TrendType;
  confidence: number;
  slope: number;
  seasonality: SeasonalityFrequency;
  summary?: string | null;
  generated_at: string;
}

export interface AnomalyResult {
  id: string;
  user_id: string;
  dataset_id: string;
  anomaly_type: AnomalyType;
  severity: AnomalySeverity;
  affected_columns: string[];
  explanation?: string | null;
  detected_at: string;
}

export interface ForecastJob {
  id: string;
  user_id: string;
  dataset_id: string;
  forecasting_algorithm: ForecastingAlgorithm;
  prediction_horizon: number;
  model_status: ForecastModelStatus;
  metrics: Record<string, number>;
  created_at: string;
}

export interface BenchmarkResult {
  id: string;
  user_id: string;
  dataset_id: string;
  benchmark_name: string;
  benchmark_score: number;
  percentile: number;
  generated_at: string;
}

export interface ExecutiveReport {
  id: string;
  user_id: string;
  dataset_id: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  recommendations: string[];
  generated_at: string;
}

export interface BIFullAnalytics {
  kpis: BusinessKPI[];
  widgets: DashboardMetric[];
  trends: TrendAnalysis[];
  anomalies: AnomalyResult[];
  forecasts: ForecastJob[];
  benchmarks: BenchmarkResult[];
  executiveReport: ExecutiveReport | null;
}
