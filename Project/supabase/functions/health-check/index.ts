import { corsHeaders, buildJsonResponse } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const geminiConfigured = !!Deno.env.get('GEMINI_API_KEY');

  return buildJsonResponse({
    status: 'healthy',
    service: 'InsightIQ AI Edge Architecture',
    timestamp: new Date().toISOString(),
    geminiConfigured
  });
});
