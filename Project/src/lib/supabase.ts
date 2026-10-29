import { createClient } from '@supabase/supabase-js';

/* Safe multi-environment variable resolver */
function getEnvVar(key: string): string {
  // 1. Browser window.__ENV__ (injected by /api/config.js)
  if (typeof window !== 'undefined' && (window as any).__ENV__?.[key]) {
    return String((window as any).__ENV__[key]).trim();
  }
  // 2. Node / process.env
  if (typeof (globalThis as any).process !== 'undefined' && (globalThis as any).process.env?.[key]) {
    return String((globalThis as any).process.env[key]).trim();
  }
  // 3. Bundler / ESM import.meta.env
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.[key]) {
      return String((import.meta as any).env[key]).trim();
    }
  } catch {
    // import.meta not available in this environment
  }
  // 4. LocalStorage fallback in browser
  if (typeof window !== 'undefined' && window.localStorage) {
    const lsKey = key.toLowerCase().includes('key') ? 'insightiq_supabase_key' : 'insightiq_supabase_url';
    const val = window.localStorage.getItem(lsKey);
    if (val) return val.trim();
  }
  return '';
}

export function resolveSupabaseConfig(): { url: string; key: string } {
  const url =
    getEnvVar('VITE_SUPABASE_URL') ||
    getEnvVar('NEXT_PUBLIC_SUPABASE_URL') ||
    getEnvVar('SUPABASE_URL') ||
    getEnvVar('REACT_APP_SUPABASE_URL') || CANONICAL_SUPABASE_URL;

  const rawKey =
    getEnvVar('VITE_SUPABASE_PUBLISHABLE_KEY') ||
    getEnvVar('VITE_SUPABASE_ANON_KEY') ||
    getEnvVar('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') ||
    getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY') ||
    getEnvVar('SUPABASE_PUBLISHABLE_KEY') ||
    getEnvVar('SUPABASE_ANON_KEY') ||
    getEnvVar('REACT_APP_SUPABASE_ANON_KEY') || CANONICAL_SUPABASE_PUBLISHABLE_KEY;

  // Guard against exposing service_role or secrets to the browser
  const key = (rawKey.startsWith('sb_secret_') || rawKey.includes('service_role')) ? (CANONICAL_SUPABASE_PUBLISHABLE_KEY || '') : rawKey;

  return { url, key };
}

/* Retrieve Environment Variables */
const { url: supabaseUrl, key: supabasePublishableKey } = resolveSupabaseConfig();
export const isConfigured = Boolean(supabaseUrl && supabasePublishableKey);

/* Safe Startup Configuration Check (logs presence without exposing secrets) */
console.log('[InsightIQ AI] Supabase Runtime Configuration Check:', {
  supabaseUrlConfigured: Boolean(supabaseUrl),
  supabaseKeyConfigured: Boolean(supabasePublishableKey),
  supportedPrefixes: ['VITE_*', 'NEXT_PUBLIC_*', 'SUPABASE_*']
});

if (!isConfigured) {
  console.warn(
    '[InsightIQ AI Warning] Authentication service is not configured. ' +
    'Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are available in your .env.local file.'
  );
}

/* Initialize Singleton Supabase Client (only when valid configuration is available) */
export const supabase = isConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'insightiq_supabase_auth_token'
      }
    })
  : null as any;

export function getSupabase() {
  if (!supabase) {
    throw new Error('Authentication service is not configured. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are available.');
  }
  return supabase;
}
