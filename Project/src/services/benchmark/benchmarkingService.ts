import { supabase } from '../../lib/supabase.js';
import {
  UserBenchmark,
  ExternalBenchmark,
  BenchmarkResult,
  BenchmarkComparisonResponse,
  ComparisonDirection,
  BenchmarkType,
  ModelBenchmarkComparison,
  HistoricalBenchmarkComparison,
  BenchmarkValidationError
} from '../../types/benchmark.js';

export const BenchmarkingService = {
  /**
   * Data Validation Helper: Enforce Part 15 rules before performing comparison
   */
  validateComparison(
    actualMetric: string,
    benchmarkMetric: string,
    actualUnit: string = '%',
    benchmarkUnit: string = '%',
    actualValue?: number,
    benchmarkValue?: number
  ): BenchmarkValidationError | null {
    if (!actualMetric || !benchmarkMetric) {
      return {
        code: 'MISSING_DATA',
        message: 'Metric name is required for benchmark comparison.'
      };
    }

    const normActual = actualMetric.trim().toLowerCase();
    const normBench = benchmarkMetric.trim().toLowerCase();

    if (normActual !== normBench) {
      return {
        code: 'INCOMPATIBLE_METRIC',
        message: `Incompatible metric comparison: cannot compare '${actualMetric}' against '${benchmarkMetric}'.`
      };
    }

    if (actualUnit.trim().toLowerCase() !== benchmarkUnit.trim().toLowerCase()) {
      return {
        code: 'INCOMPATIBLE_UNIT',
        message: `Incompatible unit comparison: unit '${actualUnit}' does not match benchmark unit '${benchmarkUnit}'.`
      };
    }

    if (actualValue !== undefined && (isNaN(actualValue) || !isFinite(actualValue))) {
      return {
        code: 'INVALID_NUMERIC',
        message: `Invalid numerical value for actual metric: ${actualValue}.`
      };
    }

    if (benchmarkValue !== undefined && (isNaN(benchmarkValue) || !isFinite(benchmarkValue))) {
      return {
        code: 'INVALID_NUMERIC',
        message: `Invalid numerical value for benchmark reference: ${benchmarkValue}.`
      };
    }

    return null;
  },

  /**
   * 1. createBenchmark: Define User Reference Benchmark (Part 4)
   * User can only define benchmarks for themselves.
   */
  async createBenchmark(
    userId: string,
    benchmarkName: string,
    metricName: string,
    referenceValue: number,
    unit: string = '%',
    comparisonDirection: ComparisonDirection = 'higher_is_better'
  ): Promise<UserBenchmark> {
    if (!benchmarkName || !metricName) {
      throw new Error('Benchmark name and metric name are required.');
    }
    if (isNaN(referenceValue) || !isFinite(referenceValue)) {
      throw new Error('Reference value must be a valid finite number.');
    }

    const { data, error } = await supabase
      .from('user_benchmarks')
      .insert([{
        user_id: userId,
        benchmark_name: benchmarkName.trim(),
        metric_name: metricName.trim(),
        reference_value: referenceValue,
        unit: unit.trim(),
        comparison_direction: comparisonDirection
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * 2. updateBenchmark: Update reference value and metadata of user benchmark (Part 4)
   */
  async updateBenchmark(
    benchmarkId: string,
    referenceValue: number,
    comparisonDirection?: ComparisonDirection,
    unit?: string
  ): Promise<UserBenchmark> {
    if (isNaN(referenceValue) || !isFinite(referenceValue)) {
      throw new Error('Reference value must be a valid finite number.');
    }

    const updatePayload: Record<string, any> = { reference_value: referenceValue };
    if (comparisonDirection) updatePayload.comparison_direction = comparisonDirection;
    if (unit) updatePayload.unit = unit.trim();

    const { data, error } = await supabase
      .from('user_benchmarks')
      .update(updatePayload)
      .eq('id', benchmarkId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * 3. deleteBenchmark: Delete reference benchmark (Part 4)
   */
  async deleteBenchmark(benchmarkId: string): Promise<boolean> {
    const { error } = await supabase
      .from('user_benchmarks')
      .delete()
      .eq('id', benchmarkId);

    if (error) throw error;
    return true;
  },

  /**
   * 4. runBenchmark: Trigger server-side benchmark evaluation via Edge Function
   */
  async runBenchmark(
    userId: string,
    datasetId: string,
    benchmarkId?: string,
    benchmarkType: BenchmarkType = 'user_defined',
    metricName?: string,
    actualValue?: number
  ): Promise<BenchmarkComparisonResponse> {
    const { data, error } = await supabase.functions.invoke('benchmark-analysis', {
      body: {
        dataset_id: datasetId,
        benchmark_id: benchmarkId,
        benchmark_type: benchmarkType,
        metric_name: metricName,
        actual_val: actualValue
      }
    });

    if (error) throw error;
    return data;
  },

  /**
   * 5. compareHistoricalPerformance: Compare current dataset metric against historical versions/records (Part 1 & 2)
   */
  async compareHistoricalPerformance(
    userId: string,
    datasetId: string,
    metricName: string
  ): Promise<HistoricalBenchmarkComparison> {
    const { data: kpis, error } = await supabase
      .from('business_kpis')
      .select('*')
      .eq('dataset_id', datasetId)
      .eq('user_id', userId)
      .eq('metric_name', metricName)
      .order('calculated_at', { ascending: false });

    if (error) throw error;

    if (!kpis || kpis.length === 0) {
      return {
        metric_name: metricName,
        current_value: 0,
        historical_value: 0,
        difference: 0,
        percentage_difference: 0,
        direction: 'no_change',
        historical_percentile: 50.0,
        sample_size: 0,
        calculated_at: new Date().toISOString()
      };
    }

    const currentValue = Number(kpis[0].metric_value);
    const historicalValue = kpis.length > 1 ? Number(kpis[1].metric_value) : currentValue;
    const diff = Number((currentValue - historicalValue).toFixed(4));
    const pctDiff = historicalValue !== 0 ? Number(((diff / Math.abs(historicalValue)) * 100).toFixed(2)) : 0;

    // Calculate percentile rank if sample size >= 2
    let percentile = 50.0;
    if (kpis.length >= 2) {
      const lowerCount = kpis.filter(k => Number(k.metric_value) < currentValue).length;
      percentile = Number(((lowerCount / kpis.length) * 100).toFixed(1));
    }

    return {
      metric_name: metricName,
      current_value: currentValue,
      historical_value: historicalValue,
      difference: diff,
      percentage_difference: pctDiff,
      direction: diff > 0 ? 'improvement' : diff < 0 ? 'deterioration' : 'no_change',
      historical_percentile: percentile,
      sample_size: kpis.length,
      calculated_at: new Date().toISOString()
    };
  },

  /**
   * 6. compareModels: Compare ML models using existing ml_model_metrics and ml_models (Part 3)
   */
  async compareModels(projectIdOrDatasetId: string): Promise<ModelBenchmarkComparison[]> {
    const { data: models, error } = await supabase
      .from('ml_models')
      .select('*, ml_model_metrics(*)')
      .or(`project_id.eq.${projectIdOrDatasetId},dataset_id.eq.${projectIdOrDatasetId}`);

    if (error) throw error;
    if (!models || models.length === 0) return [];

    return models.map((m: any) => {
      const metricMap: Record<string, number> = {};
      (m.ml_model_metrics || []).forEach((met: any) => {
        metricMap[met.metric_name] = Number(met.metric_value);
      });

      return {
        model_id: m.id,
        model_name: m.model_name || 'Unnamed Model',
        version: m.version || 1,
        problem_type: m.problem_type || 'classification',
        status: m.status || 'trained',
        metrics: metricMap,
        is_baseline: m.is_baseline || false
      };
    });
  },

  /**
   * 7. getBenchmarkResults: Retrieve persisted benchmark records for dataset (Part 8)
   */
  async getBenchmarkResults(userId: string, datasetId?: string): Promise<BenchmarkResult[]> {
    let query = supabase
      .from('benchmark_results')
      .select('*')
      .eq('user_id', userId)
      .order('generated_at', { ascending: false });

    if (datasetId) {
      query = query.eq('dataset_id', datasetId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  /**
   * 8. getBenchmarkStatus: Get list of active user benchmark definitions (Part 4)
   */
  async getBenchmarkStatus(userId: string): Promise<UserBenchmark[]> {
    const { data, error } = await supabase
      .from('user_benchmarks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * 9. getVerifiedExternalBenchmark: Get verified external benchmark record (Part 5)
   * NEVER returns fabricated external metrics.
   */
  async getVerifiedExternalBenchmark(metricName: string): Promise<ExternalBenchmark | null> {
    const { data, error } = await supabase
      .from('external_benchmarks')
      .select('*')
      .eq('metric_name', metricName.trim().toLowerCase())
      .maybeSingle();

    if (error) throw error;
    return data;
  }
};
