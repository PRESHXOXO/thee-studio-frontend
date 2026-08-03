import { createClient } from '@supabase/supabase-js';

export function readSupabaseConfig(env = import.meta.env) {
  const url = env?.VITE_SUPABASE_URL?.trim() || '';
  const publishableKey = env?.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
    || env?.VITE_SUPABASE_ANON_KEY?.trim()
    || '';
  return {
    url,
    publishableKey,
    configured: Boolean(url && publishableKey),
  };
}

export const supabaseConfig = readSupabaseConfig();

export const supabase = supabaseConfig.configured
  ? createClient(supabaseConfig.url, supabaseConfig.publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'thee-studio-auth',
      },
    })
  : null;
