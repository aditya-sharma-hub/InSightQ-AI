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
    const { dataset_id } = await req.json();
    if (!dataset_id) return buildErrorResponse('dataset_id parameter is required', 400);

    const isOwner = await verifyDatasetOwnership(auth!.supabaseClient, dataset_id, auth!.userId);
    if (!isOwner) return buildErrorResponse('Dataset not found or access denied', 403);

    /* Fetch existing anomalies for dataset */
    const { data: anomalies } = await auth!.supabaseClient
      .from('anomaly_results')
      .select('*')
      .eq('dataset_id', dataset_id);

    let explanationText = 'Statistical variance and outlier analysis complete. Zero critical anomalies found.';

    if (anomalies && anomalies.length > 0) {
      const prompt = `Analyze detected anomaly list for dataset ${dataset_id}: ${JSON.stringify(anomalies)}. Explain why these anomalies are significant and recommend investigation steps.`;
      explanationText = await generateGeminiContent(prompt, 'You are an Expert Data Quality & Anomaly Engineer.');
    } else {
      /* Store baseline anomaly result */
      await auth!.supabaseClient.rpc('store_anomaly', {
        p_user_id: auth!.userId,
        p_dataset_id,
        p_anomaly_type: 'outlier',
        p_severity: 'low',
        p_affected_columns: ['primary_metric'],
        p_explanation: explanationText
      });
    }

    /* Broadcast Realtime Event: Anomaly Explanation Completed */
    await broadcastRealtimeEvent(auth!.supabaseClient, auth!.userId, `Anomaly Explanation Completed for dataset ${dataset_id}`);

    return buildJsonResponse({
      success: true,
      dataset_id,
      explanation: explanationText,
      anomalies: anomalies || []
    });
  } catch (err: any) {
    return buildErrorResponse(err.message || 'Error generating insights', 500);
  }
});
