import { createClient } from '@supabase/supabase-js';
import { createE2eAuthClient } from './e2eAuthClient.js';

const e2eAuthEnabled = import.meta.env.DEV && import.meta.env.VITE_E2E_AUTH === 'true';

export function readSupabaseConfig(env = import.meta.env) {
  const url = env?.VITE_SUPABASE_URL?.trim() || '';
  const publishableKey = env?.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
    || env?.VITE_SUPABASE_ANON_KEY?.trim()
    || '';
  return { url, publishableKey, configured: Boolean(url && publishableKey) };
}

export const supabaseConfig = readSupabaseConfig();

export const supabase = e2eAuthEnabled
  ? createE2eAuthClient()
  : supabaseConfig.configured
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

export function isE2eAuthEnabled() { return e2eAuthEnabled; }

// Staging project ref, extracted from the standard Supabase URL shape
// (https://<ref>.supabase.co). Used to gate staging-only diagnostic UI —
// stronger than a hostname check since it verifies which Supabase *backend*
// this build is actually wired to, not just where the page happens to be
// served from.
const STAGING_PROJECT_REF = 'qkrmkoixgznvxbcljmsx';

export function isStagingSupabaseProject(env = import.meta.env) {
  const { url } = readSupabaseConfig(env);
  return url.includes(`${STAGING_PROJECT_REF}.supabase.co`);
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
