import { createClient } from '@supabase/supabase-js';

export function readSupabaseConfig(env = import.meta.env) {
  const url = env?.VITE_SUPABASE_URL?.trim() || '';
  const publishableKey = env?.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
    || env?.VITE_SUPABASE_ANON_KEY?.trim()
    || '';
  return { url, publishableKey, configured: Boolean(url && publishableKey) };
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

export function hasSupabaseConfig() {
  return supabaseConfig.configured;
}

export function getSupabase() {
  if (!supabase) throw new Error('Missing browser-safe Supabase configuration.');
  return supabase;
}

export function normalizeSupabaseSession(session) {
  if (!session?.user) return null;
  return {
    id: session.user.id,
    name: session.user.user_metadata?.name
      || session.user.user_metadata?.full_name
      || session.user.email?.split('@')[0]
      || 'Thee Studio',
    email: session.user.email || '',
    provider: 'supabase',
    raw: session,
  };
}
