import { supabase } from '../../lib/supabase.js';
import { 
  BusinessKPI, DashboardMetric, TrendAnalysis, AnomalyResult, 
  ForecastJob, BenchmarkResult, ExecutiveReport, BIFullAnalytics,
  KPIMetricType, KPIAggregation, KPIVisualizationType, WidgetType, ChartType,
  TrendType, SeasonalityFrequency, AnomalyType, AnomalySeverity, ForecastingAlgorithm
} from '../../types/bi.js';

export const BusinessIntelligenceService = {
  /**
   * 1. generateKPIs: Calculate & Store KPI Metric
   */
  async generateKPIs(
    userId: string,
    datasetId: string,
    kpi: {
      metricName: string;
      metricType: KPIMetricType;
      metricValue: number;
      aggregation: KPIAggregation;
      visualizationType?: KPIVisualizationType;
    }
  ) {
    const { data: kpiId, error } = await supabase.rpc('calculate_kpis', {
      p_user_id: userId,
      p_dataset_id: datasetId,
      p_metric_name: kpi.metricName,
      p_metric_type: kpi.metricType,
      p_metric_value: kpi.metricValue,
      p_aggregation: kpi.aggregation,
      p_visualization_type: kpi.visualizationType || 'card'
    });

    if (error) throw error;
    return kpiId;
  },

  /**
   * 2. generateDashboard: Create Dashboard Widget Metric
   */
  async generateDashboard(
    userId: string,
    datasetId: string,
    widget: {
      widgetName: string;
      widgetType: WidgetType;
      chartType?: ChartType;
      xAxis?: string;
      yAxis?: string;
      filters?: Record<string, any>;
    }
  ) {
    const { data: widgetId, error } = await supabase.rpc('generate_dashboard', {
      p_user_id: userId,
      p_dataset_id: datasetId,
      p_widget_name: widget.widgetName,
      p_widget_type: widget.widgetType,
      p_chart_type: widget.chartType || 'bar',
      p_x_axis: widget.xAxis || null,
      p_y_axis: widget.yAxis || null,
      p_filters: widget.filters || {}
    });

    if (error) throw error;
    return widgetId;
  },

  /**
   * 3. runTrendAnalysis: Generate & Store Trend Analysis
   */
  async runTrendAnalysis(
    userId: string,
    datasetId: string,
    trend: {
      trendType: TrendType;
      confidence?: number;
      slope?: number;
      seasonality?: SeasonalityFrequency;
      summary?: string;
    }
  ) {
    const { data, error } = await supabase
      .from('trend_analysis')
      .insert([{
        user_id: userId,
        dataset_id: datasetId,
        trend_type: trend.trendType,
        confidence: trend.confidence || 95.00,
        slope: trend.slope || 0.00,
        seasonality: trend.seasonality || 'none',
        summary: trend.summary || null
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * 4. detectAnomalies: Store Anomaly Detection Result
   */
  async detectAnomalies(
    userId: string,
    datasetId: string,
    anomaly: {
      anomalyType: AnomalyType;
      severity?: AnomalySeverity;
      affectedColumns?: string[];
      explanation?: string;
    }
  ) {
    const { data: anomalyId, error } = await supabase.rpc('store_anomaly', {
      p_user_id: userId,
      p_dataset_id: datasetId,
      p_anomaly_type: anomaly.anomalyType,
      p_severity: anomaly.severity || 'medium',
      p_affected_columns: anomaly.affectedColumns || [],
      p_explanation: anomaly.explanation || null
    });

    if (error) throw error;
    return anomalyId;
  },

  /**
   * 5. createForecastJob: Create Forecast Training Job
   */
  async createForecastJob(
    userId: string,
    datasetId: string,
    algorithm: ForecastingAlgorithm,
    predictionHorizon: number = 30
  ) {
    const { data: jobId, error } = await supabase.rpc('create_forecast_job', {
      p_user_id: userId,
      p_dataset_id: datasetId,
      p_forecasting_algorithm: algorithm,
      p_prediction_horizon: predictionHorizon
    });

    if (error) throw error;
    return jobId;
  },

  /**
   * 6. generateExecutiveSummary: Create Executive Summary & Insights
   */
  async generateExecutiveSummary(
    userId: string,
    datasetId: string,
    report: {
      summary: string;
      strengths?: string[];
      weaknesses?: string[];
      opportunities?: string[];
      recommendations?: string[];
    }
  ) {
    const { data: reportId, error } = await supabase.rpc('generate_summary', {
      p_user_id: userId,
      p_dataset_id: datasetId,
      p_summary: report.summary,
      p_strengths: report.strengths || [],
      p_weaknesses: report.weaknesses || [],
      p_opportunities: report.opportunities || [],
      p_recommendations: report.recommendations || []
    });

    if (error) throw error;
    return reportId;
  },

  /**
   * 7. getBIFullAnalytics: Retrieve Complete Analytics Suite for Dataset
   */
  async getBIFullAnalytics(userId: string, datasetId: string): Promise<BIFullAnalytics> {
    const [
      { data: kpis },
      { data: widgets },
      { data: trends },
      { data: anomalies },
      { data: forecasts },
      { data: benchmarks },
      { data: executiveReport }
    ] = await Promise.all([
      supabase.from('business_kpis').select('*').eq('dataset_id', datasetId).eq('user_id', userId),
      supabase.from('dashboard_metrics').select('*').eq('dataset_id', datasetId).eq('user_id', userId),
      supabase.from('trend_analysis').select('*').eq('dataset_id', datasetId).eq('user_id', userId),
      supabase.from('anomaly_results').select('*').eq('dataset_id', datasetId).eq('user_id', userId),
      supabase.from('forecast_jobs').select('*').eq('dataset_id', datasetId).eq('user_id', userId),
      supabase.from('benchmark_results').select('*').eq('dataset_id', datasetId).eq('user_id', userId),
      supabase.from('executive_reports').select('*').eq('dataset_id', datasetId).eq('user_id', userId).maybeSingle()
    ]);

    return {
      kpis: kpis || [],
      widgets: widgets || [],
      trends: trends || [],
      anomalies: anomalies || [],
      forecasts: forecasts || [],
      benchmarks: benchmarks || [],
      executiveReport: executiveReport || null
    };
  }
};

export const BIService = BusinessIntelligenceService;
