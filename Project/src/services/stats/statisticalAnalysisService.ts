import { supabase } from '../../lib/supabase.js';
import { StatisticalAnalysisRecord, StatisticalAnalysisType } from '../../types/stats.js';

export const StatisticalAnalysisService = {
  /**
   * Helper to invoke statistical-analysis Deno Edge Function
   */
  async invokeStatisticalEngine(datasetId: string, analysisType: StatisticalAnalysisType, options?: Record<string, any>) {
    const { data, error } = await supabase.functions.invoke('statistical-analysis', {
      body: { dataset_id: datasetId, analysis_type: analysisType, options }
    });

    if (error) throw error;
    return data;
  },

  /**
   * 1. runDescriptiveStatistics: Calculate Mean, Median, Variance, StdDev, IQR, Quartiles
   */
  async runDescriptiveStatistics(userId: string, datasetId: string) {
    return await this.invokeStatisticalEngine(datasetId, 'descriptive');
  },

  /**
   * 2. runCorrelationAnalysis: Calculate Pearson/Spearman matrix, r values, and P-values
   */
  async runCorrelationAnalysis(userId: string, datasetId: string, method: 'pearson' | 'spearman' = 'pearson') {
    return await this.invokeStatisticalEngine(datasetId, 'correlation', { method });
  },

  /**
   * 3. runHypothesisTest: Perform statistical hypothesis testing
   */
  async runHypothesisTest(userId: string, datasetId: string, options?: { testType?: string; targetColumn?: string }) {
    return await this.invokeStatisticalEngine(datasetId, 'hypothesis_test', options);
  },

  /**
   * 4. calculateConfidenceInterval: Compute 95% Confidence Intervals
   */
  async calculateConfidenceInterval(userId: string, datasetId: string, variable?: string, confidenceLevel: number = 95.0) {
    return await this.invokeStatisticalEngine(datasetId, 'confidence_interval', { variable, confidenceLevel });
  },

  /**
   * 5. runRegression: Linear Regression analysis
   */
  async runRegression(userId: string, datasetId: string, targetVar?: string, featureVars?: string[]) {
    return await this.invokeStatisticalEngine(datasetId, 'regression', { targetVar, featureVars });
  },

  /**
   * 6. detectStatisticalOutliers: Perform IQR / Z-score outlier detection
   */
  async detectStatisticalOutliers(userId: string, datasetId: string, method: 'iqr' | 'z_score' = 'iqr') {
    return await this.invokeStatisticalEngine(datasetId, 'outliers', { method });
  },

  /**
   * 7. analyzeTimeSeries: Perform temporal trend decomposition
   */
  async analyzeTimeSeries(userId: string, datasetId: string) {
    return await this.invokeStatisticalEngine(datasetId, 'time_series');
  },

  /**
   * 8. getStatisticalResults: Retrieve persisted statistical records for dataset
   */
  async getStatisticalResults(userId: string, datasetId: string): Promise<StatisticalAnalysisRecord[]> {
    const { data, error } = await supabase
      .from('statistical_analysis_results')
      .select('*')
      .eq('dataset_id', datasetId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
};
