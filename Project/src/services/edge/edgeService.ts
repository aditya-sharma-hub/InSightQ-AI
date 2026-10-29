import { supabase } from '../../lib/supabase.js';
import { 
  HealthCheckResponse, AIReportResponse, PDFReportResponse, 
  ForecastResponse, BenchmarkResponse 
} from '../../types/edge.js';

export const EdgeService = {
  /**
   * 1. healthCheck: Query Edge Function runtime health
   */
  async healthCheck(): Promise<HealthCheckResponse> {
    const { data, error } = await supabase.functions.invoke('health-check');
    if (error) throw error;
    return data;
  },

  /**
   * 2. generateAIReport: Execute Gemini AI report analysis
   */
  async generateAIReport(datasetId: string, analysisType: string = 'full_audit'): Promise<AIReportResponse> {
    const { data, error } = await supabase.functions.invoke('generate-ai-report', {
      body: { dataset_id: datasetId, analysis_type: analysisType }
    });

    if (error) throw error;
    return data;
  },

  /**
   * 3. generateSummary: Generate executive summary & SWOT analysis
   */
  async generateSummary(datasetId: string) {
    const { data, error } = await supabase.functions.invoke('generate-summary', {
      body: { dataset_id: datasetId }
    });

    if (error) throw error;
    return data;
  },

  /**
   * 4. generateInsights: Detect dataset anomalies & insights
   */
  async generateInsights(datasetId: string) {
    const { data, error } = await supabase.functions.invoke('generate-insights', {
      body: { dataset_id: datasetId }
    });

    if (error) throw error;
    return data;
  },

  /**
   * 5. forecastData: Execute forecasting job
   */
  async forecastData(datasetId: string, algorithm: string = 'prophet', predictionHorizon: number = 30): Promise<ForecastResponse> {
    const { data, error } = await supabase.functions.invoke('forecast-data', {
      body: { dataset_id: datasetId, algorithm, prediction_horizon: predictionHorizon }
    });

    if (error) throw error;
    return data;
  },

  /**
   * 6. benchmarkAnalysis: Execute benchmark analysis
   */
  async benchmarkAnalysis(datasetId: string, benchmarkName?: string): Promise<BenchmarkResponse> {
    const { data, error } = await supabase.functions.invoke('benchmark-analysis', {
      body: { dataset_id: datasetId, benchmark_name: benchmarkName }
    });

    if (error) throw error;
    return data;
  },

  /**
   * 7. generatePDF: Generate Executive PDF report and save to private storage
   */
  async generatePDF(datasetId: string, reportTitle?: string): Promise<PDFReportResponse> {
    const { data, error } = await supabase.functions.invoke('generate-pdf', {
      body: { dataset_id: datasetId, report_title: reportTitle }
    });

    if (error) throw error;
    return data;
  },

  /**
   * 8. processDataset: Trigger server-side dataset profiling
   */
  async processDataset(datasetId: string) {
    const { data, error } = await supabase.functions.invoke('process-dataset', {
      body: { dataset_id: datasetId }
    });

    if (error) throw error;
    return data;
  }
};
