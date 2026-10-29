import { corsHeaders, buildJsonResponse, buildErrorResponse } from '../_shared/cors.ts';
import { verifyAuthUser, verifyDatasetOwnership } from '../_shared/auth.ts';
import { broadcastRealtimeEvent } from '../_shared/realtimeBroadcast.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const { auth, errorResponse } = await verifyAuthUser(req);
  if (errorResponse) return errorResponse;

  try {
    const { dataset_id, report_title } = await req.json();
    if (!dataset_id) return buildErrorResponse('dataset_id is required', 400);

    const isOwner = await verifyDatasetOwnership(auth!.supabaseClient, dataset_id, auth!.userId);
    if (!isOwner) return buildErrorResponse('Dataset access denied', 403);

    const title = report_title || 'InsightIQ Executive Analytics Report';
    const pdfFileName = `report_${Date.now()}.pdf`;
    const storagePath = `${auth!.userId}/${pdfFileName}`;

    /* Save PDF Document into private reports/{auth.uid()}/ storage bucket */
    const pdfContent = new TextEncoder().encode(`%PDF-1.4\n%InsightIQ AI Generated Executive Report\nTitle: ${title}\nDataset: ${dataset_id}\nGenerated: ${new Date().toISOString()}`);

    const { error: storageError } = await auth!.supabaseClient.storage
      .from('reports')
      .upload(storagePath, pdfContent, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (storageError) throw storageError;

    /* Generate 300s (5 min) short-lived signed URL for private download */
    const { data: signedData } = await auth!.supabaseClient.storage
      .from('reports')
      .createSignedUrl(storagePath, 300);

    /* Broadcast Realtime Event */
    await broadcastRealtimeEvent(auth!.supabaseClient, auth!.userId, `PDF ready: ${pdfFileName}`);

    return buildJsonResponse({
      success: true,
      dataset_id,
      storage_path: storagePath,
      bucket: 'reports',
      file_name: pdfFileName,
      signed_url: signedData?.signedUrl || null
    });
  } catch (err: any) {
    return buildErrorResponse(err.message || 'Error generating PDF report', 500);
  }
});
