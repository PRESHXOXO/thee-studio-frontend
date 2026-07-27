import { createClient } from '@supabase/supabase-js';

let client = null;

export function hasSupabaseConfig() {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}

export function getSupabase() {
  if (client) return client;
  if (!hasSupabaseConfig()) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.');
  }
  client = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    },
  );
  return client;
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
