import { createClient } from '@supabase/supabase-js';
import { createApiSupabaseClient } from './apiSupabase.js';
import { createE2eAuthClient } from './e2eAuthClient.js';

const apiModeEnabled = import.meta.env.VITE_API_MODE === 'true';
const e2eAuthEnabled = import.meta.env.DEV && import.meta.env.VITE_E2E_AUTH === 'true';

export function readSupabaseConfig(env = import.meta.env) {
  const url = env?.VITE_SUPABASE_URL?.trim() || '';
  const publishableKey = env?.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
    || env?.VITE_SUPABASE_ANON_KEY?.trim()
    || '';
  return { url, publishableKey, configured: Boolean(url && publishableKey) };
}

export const supabaseConfig = readSupabaseConfig();

const apiClient = apiModeEnabled
  ? createApiSupabaseClient(import.meta.env.VITE_API_BASE || '/api')
  : null;

export const supabase = apiClient
  || (e2eAuthEnabled
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
      : null);

export function hasSupabaseConfig() {
  return supabaseConfig.configured;
}

export function isApiModeEnabled() { return apiModeEnabled; }
export function isE2eAuthEnabled() { return e2eAuthEnabled; }

// Staging project ref, extracted from the standard Supabase URL shape.
// This remains available only for staging-only diagnostics; production API
// mode does not configure or contact a Supabase project.
const STAGING_PROJECT_REF = 'qkrmkoixgznvxbcljmsx';

export function isStagingSupabaseProject(env = import.meta.env) {
  const { url } = readSupabaseConfig(env);
  return url.includes(`${STAGING_PROJECT_REF}.supabase.co`);
}

export function getSupabase() {
  if (!supabase) throw new Error('Missing browser API configuration.');
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
    provider: session.access_token === 'api-session' ? 'api' : 'supabase',
    raw: session,
  };
}
