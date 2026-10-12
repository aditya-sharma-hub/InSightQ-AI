import { corsHeaders, buildJsonResponse, buildErrorResponse } from '../_shared/cors.ts';
import { verifyAuthUser, verifyDatasetOwnership } from '../_shared/auth.ts';
import { broadcastRealtimeEvent } from '../_shared/realtimeBroadcast.ts';
import { generateGeminiContent } from '../_shared/gemini.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const { auth, errorResponse } = await verifyAuthUser(req);
  if (errorResponse) return errorResponse;

  try {
    const payload = await req.json();
    const {
      dataset_id,
      benchmark_id,
      benchmark_type = 'user_defined',
      metric_name = 'churn_rate',
      actual_val,
      benchmark_val,
      unit: requestUnit,
      comparison_direction: requestDirection = 'higher_is_better'
    } = payload;

    if (!dataset_id) {
      return buildErrorResponse('dataset_id parameter is required', 400);
    }

    /* 1. Verify Dataset Ownership & Security */
    const isOwner = await verifyDatasetOwnership(auth!.supabaseClient, dataset_id, auth!.userId);
    if (!isOwner) {
      return buildErrorResponse('Dataset not found or unauthorized access.', 403);
    }

    /* 2. Broadcast Event: Benchmark Started */
    await broadcastRealtimeEvent(
      auth!.supabaseClient,
      auth!.userId,
      `Benchmark Analysis Started [Type: ${benchmark_type}, Dataset: ${dataset_id}]`
    );

    let benchmarkName = 'Reference Benchmark';
    let refValue = benchmark_val !== undefined ? Number(benchmark_val) : 5.0;
    let unit = requestUnit || '%';
    let direction = requestDirection;
    let sourceText = 'Internal System Logic';
    let percentile = 50.0;
    let sampleSize = 1;
    let statisticalMethod = 'Deterministic Comparison';

    /* 3. Handle Benchmark Types & Source Retrieval */
    if (benchmark_type === 'user_defined') {
      if (benchmark_id) {
        const { data: userBench, error } = await auth!.supabaseClient
          .from('user_benchmarks')
          .select('*')
          .eq('id', benchmark_id)
          .eq('user_id', auth!.userId)
          .single();

        if (error || !userBench) {
          return buildErrorResponse('User defined benchmark not found or access denied.', 404);
        }

        benchmarkName = userBench.benchmark_name;
        refValue = Number(userBench.reference_value);
        unit = userBench.unit || unit;
        direction = userBench.comparison_direction || direction;
        sourceText = `User Defined (${userBench.benchmark_name})`;
      } else {
        benchmarkName = `User Target (${metric_name})`;
        sourceText = 'User Defined Custom Threshold';
      }
    } else if (benchmark_type === 'external') {
      const { data: extBench } = await auth!.supabaseClient
        .from('external_benchmarks')
        .select('*')
        .eq('metric_name', metric_name.trim().toLowerCase())
        .maybeSingle();

      if (extBench) {
        benchmarkName = extBench.benchmark_name;
        refValue = Number(extBench.reference_value);
        unit = extBench.unit || unit;
        sourceText = `${extBench.source}${extBench.source_date ? ' (' + extBench.source_date + ')' : ''}`;
      } else {
        /* Strictly handle missing external benchmark without fabricating data */
        await broadcastRealtimeEvent(
          auth!.supabaseClient,
          auth!.userId,
          `Benchmark Analysis Completed: No verified external benchmark available for '${metric_name}'`
        );

        return buildJsonResponse({
          success: false,
          status: 'not_applicable',
          metric_name,
          actual_value: actual_val !== undefined ? Number(actual_val) : 0,
          benchmark_value: 0,
          difference: 0,
          percentage_difference: 0,
          score: 0,
          percentile: 0,
          benchmark_type: 'external',
          unit,
          source: 'Verified External Registry',
          comparison_direction: direction,
          interpretation: 'No verified external benchmark available.',
          message: 'No verified external benchmark available.'
        });
      }
    } else if (benchmark_type === 'historical') {
      /* Compare against historical KPI calculate average/previous period */
      const { data: kpis } = await auth!.supabaseClient
        .from('business_kpis')
        .select('*')
        .eq('dataset_id', dataset_id)
        .eq('user_id', auth!.userId)
        .eq('metric_name', metric_name)
        .order('calculated_at', { ascending: false });

      if (kpis && kpis.length > 1) {
        benchmarkName = `Historical Baseline (${metric_name})`;
        refValue = Number(kpis[1].metric_value);
        sampleSize = kpis.length;
        sourceText = `Historical Dataset Logs (n=${sampleSize})`;
        statisticalMethod = 'Historical Percentile & Delta Rank';

        if (actual_val !== undefined) {
          const currentVal = Number(actual_val);
          const lowerCount = kpis.filter((k: any) => Number(k.metric_value) < currentVal).length;
          percentile = Number(((lowerCount / kpis.length) * 100).toFixed(1));
        }
      } else {
        benchmarkName = `Historical Baseline (${metric_name})`;
        refValue = kpis && kpis.length > 0 ? Number(kpis[0].metric_value) : refValue;
        sourceText = 'Historical Initial Run';
      }
    } else if (benchmark_type === 'model') {
      /* Compare ML Model performance against baseline version */
      const { data: modelMetrics } = await auth!.supabaseClient
        .from('ml_model_metrics')
        .select('*, ml_models!inner(*)')
        .eq('metric_name', metric_name)
        .eq('ml_models.user_id', auth!.userId)
        .order('created_at', { ascending: false });

      if (modelMetrics && modelMetrics.length > 0) {
        const baseline = modelMetrics[0];
        benchmarkName = `Model Baseline (${baseline.ml_models?.model_name || 'v1'})`;
        refValue = Number(baseline.metric_value);
        sourceText = `ML Model Registry (${baseline.ml_models?.model_name || 'Baseline'})`;
      } else {
        benchmarkName = `Model Metric Target (${metric_name})`;
        sourceText = 'ML Baseline Registry';
      }
    } else if (benchmark_type === 'internal') {
      /* Compare across user-owned datasets */
      const { data: userKPIs } = await auth!.supabaseClient
        .from('business_kpis')
        .select('*')
        .eq('user_id', auth!.userId)
        .eq('metric_name', metric_name)
        .order('calculated_at', { ascending: false });

      if (userKPIs && userKPIs.length > 0) {
        const avgVal = userKPIs.reduce((acc: number, curr: any) => acc + Number(curr.metric_value), 0) / userKPIs.length;
        benchmarkName = `Internal Portfolio Average (${metric_name})`;
        refValue = Number(avgVal.toFixed(4));
        sampleSize = userKPIs.length;
        sourceText = `User Portfolio Datasets (n=${sampleSize})`;
      }
    }

    /* 4. Enforce Data Validation Rules (Part 15) */
    const actual = actual_val !== undefined ? Number(actual_val) : 7.2;
    if (isNaN(actual) || !isFinite(actual) || isNaN(refValue) || !isFinite(refValue)) {
      return buildErrorResponse('Invalid numerical value for actual or benchmark value.', 400);
    }

    /* 5. Deterministic Benchmark Engine Math */
    const diff = Number((actual - refValue).toFixed(4));
    const pctDiff = refValue !== 0 ? Number(((diff / Math.abs(refValue)) * 100).toFixed(2)) : 0;

    let status = 'at_benchmark';
    if (direction === 'higher_is_better') {
      status = actual > refValue ? 'above_benchmark' : actual < refValue ? 'below_benchmark' : 'at_benchmark';
    } else {
      status = actual < refValue ? 'above_benchmark' : actual > refValue ? 'below_benchmark' : 'at_benchmark';
    }

    /* Calculate Reproducible Score (0 to 100) */
    const rawScore = direction === 'higher_is_better' ? 50 + pctDiff : 50 - pctDiff;
    const score = Math.max(0, Math.min(100, Number(rawScore.toFixed(2))));

    /* 6. Gemini AI Interpretation (Strictly from Pre-Calculated Deterministic Engine Outputs) */
    const prompt = `Interpret enterprise benchmark calculation:
Metric: ${metric_name}
Actual Value: ${actual}${unit}
Benchmark Reference: ${refValue}${unit} (${benchmarkName})
Source: ${sourceText}
Difference: ${diff > 0 ? '+' : ''}${diff}${unit} (${pctDiff > 0 ? '+' : ''}${pctDiff}%)
Comparison Direction: ${direction}
Status: ${status}
Score: ${score}/100

Provide a concise, professional 2-sentence executive summary of what this result means for business performance without making up numbers.`;

    const humanInterpretation = await generateGeminiContent(
      prompt,
      'You are an Enterprise Analytics Benchmarking Analyst. Synthesize the validated mathematical output into a crisp business insight.'
    );

    /* 7. Store Result in public.benchmark_results */
    const { data: resultRecord, error: insertError } = await auth!.supabaseClient
      .from('benchmark_results')
      .insert([{
        user_id: auth!.userId,
        dataset_id,
        benchmark_name: benchmarkName,
        metric_name,
        actual_value: actual,
        benchmark_value: refValue,
        difference: diff,
        percentage_difference: pctDiff,
        benchmark_score: score,
        percentile: Math.min(99, Math.max(1, percentile)),
        status,
        benchmark_type,
        source: sourceText,
        comparison_direction: direction,
        sample_size: sampleSize,
        statistical_method: statisticalMethod,
        generated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (insertError) {
      console.error('[Benchmark Analysis Edge Function] Error inserting record:', insertError);
    }

    /* 8. Broadcast Events: Benchmark Completed & Updated */
    await broadcastRealtimeEvent(
      auth!.supabaseClient,
      auth!.userId,
      `Benchmark Analysis Completed for metric '${metric_name}': Status ${status} (${pctDiff}%)`
    );

    return buildJsonResponse({
      success: true,
      dataset_id,
      metric_name,
      actual_value: actual,
      benchmark_value: refValue,
      difference: diff,
      percentage_difference: pctDiff,
      score,
      percentile,
      status,
      benchmark_type,
      unit,
      source: sourceText,
      comparison_direction: direction,
      interpretation: humanInterpretation || `Current ${metric_name} is ${actual}${unit}, compared with benchmark of ${refValue}${unit}. This is ${Math.abs(pctDiff)}% ${status.replace('_', ' ')}.`,
      record: resultRecord || undefined
    });
  } catch (err: any) {
    if (auth) {
      await broadcastRealtimeEvent(
        auth.supabaseClient,
        auth.userId,
        `Benchmark Analysis Failed: ${err.message}`
      );
    }
    return buildErrorResponse(err.message || 'Benchmarking analysis failed.', 500);
  }
});
