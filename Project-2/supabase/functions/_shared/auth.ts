import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { buildErrorResponse } from './cors.ts';

export interface AuthContext {
  userId: string;
  supabaseClient: any;
}

export async function verifyAuthUser(req: Request): Promise<{ auth?: AuthContext; errorResponse?: Response }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return { errorResponse: buildErrorResponse('Missing Authorization header', 401) };
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data: { user }, error } = await supabaseClient.auth.getUser();
  if (error || !user) {
    return { errorResponse: buildErrorResponse('Invalid or expired authentication token', 401) };
  }

  return { auth: { userId: user.id, supabaseClient } };
}

export async function verifyDatasetOwnership(supabaseClient: any, datasetId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabaseClient
    .from('datasets')
    .select('id')
    .eq('id', datasetId)
    .eq('user_id', userId)
    .maybeSingle();

  return !error && !!data;
}
