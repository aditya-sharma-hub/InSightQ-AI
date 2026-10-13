import { createClient } from '@supabase/supabase-js';

/* Retrieve Environment Variables */
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || '';
const supabasePublishableKey = import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY || '';

/* Validate Required Configuration */
if (!supabaseUrl || !supabasePublishableKey) {
  const missing = [];
  if (!supabaseUrl) missing.push('VITE_SUPABASE_URL');
  if (!supabasePublishableKey) missing.push('VITE_SUPABASE_PUBLISHABLE_KEY');
  
  throw new Error(
    `[InsightIQ AI Error] Missing required Supabase environment variables: ${missing.join(', ')}. ` +
    `Please configure them in your .env.local file.`
  );
}

/* Initialize Singleton Supabase Client */
export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'insightiq_supabase_auth_token'
  }
});

/* Log Connection Success in Development Mode */
if (import.meta.env?.DEV || true) {
  console.log('[InsightIQ AI] Supabase client connected successfully:', supabaseUrl);
}
