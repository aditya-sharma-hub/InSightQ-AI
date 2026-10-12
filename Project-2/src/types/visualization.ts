/**
 * InsightIQ AI - Enterprise Visualization Contracts
 */

export type ChartType = 
  | 'line'
  | 'area'
  | 'bar'
  | 'grouped_bar'
  | 'stacked_bar'
  | 'scatter'
  | 'histogram'
  | 'boxplot'
  | 'heatmap'
  | 'correlation_matrix'
  | 'roc_curve';

export type WidgetType = 
  | 'kpi_card'
  | 'chart'
  | 'forecast'
  | 'anomaly'
  | 'statistical'
  | 'ml_performance'
  | 'xai_importance';

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  grid_position: { x: number; y: number; w: number; h: number };
  config: Record<string, any>;
}

export interface DashboardLayout {
  id: string;
  user_id: string;
  dataset_id?: string | null;
  layout_name: string;
  widgets: DashboardWidget[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface DashboardFilter {
  column_name: string;
  filter_type: 'select' | 'range' | 'date_range';
  value: any;
}
