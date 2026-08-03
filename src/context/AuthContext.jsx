import React from 'react';
import { getSupabase, hasSupabaseConfig, normalizeSupabaseSession } from '../lib/supabase.js';
import {
  bootstrapCloudStore,
  installGlobalErrorTelemetry,
  reportStudioError,
  resetCloudStore,
} from '../lib/cloudStore.js';

const AuthContext = React.createContext(null);

export function safeAuthMessage(error) {
  const message = String(error?.message || '').toLowerCase();
  if (message.includes('invalid login credentials')) return 'Email or password is incorrect.';
  if (message.includes('email not confirmed')) return 'Confirm your email before signing in.';
  if (message.includes('network') || message.includes('fetch')) return 'Unable to reach the sign-in service.';
  return 'Sign-in failed. Check your details and try again.';
}

export function AuthProvider({ children, client = hasSupabaseConfig() ? getSupabase() : null }) {
  const [session, setSession] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [syncError, setSyncError] = React.useState('');

  React.useEffect(() => installGlobalErrorTelemetry(), []);
  React.useEffect(() => {
    const onError = event => setSyncError(event.detail?.message || 'Cloud sync is unavailable.');
    const onSuccess = () => setSyncError('');
    window.addEventListener('thee:cloud-sync-error', onError);
    window.addEventListener('thee:cloud-sync-ok', onSuccess);
    return () => {
      window.removeEventListener('thee:cloud-sync-error', onError);
      window.removeEventListener('thee:cloud-sync-ok', onSuccess);
    };
  }, []);

  React.useEffect(() => {
    if (!client) {
      setError('Staging connection is not configured.');
      setLoading(false);
      return undefined;
    }
    let active = true;
    const applySession = async nextSession => {
      if (!active) return;
      const normalized = normalizeSupabaseSession(nextSession);
      if (normalized) {
        try {
          await bootstrapCloudStore(client, normalized.id);
          setSyncError('');
        } catch (bootstrapError) {
          setSyncError('Cloud sync is unavailable.');
          await reportStudioError(bootstrapError, { code: 'cloud_bootstrap_failed' });
        }
      } else {
        resetCloudStore();
      }
      if (active) setSession(normalized);
    };

    client.auth.getSession().then(async ({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError) setError('Your session could not be restored. Sign in again.');
      await applySession(data?.session ?? null);
      if (active) setLoading(false);
    });
    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      setError('');
      void applySession(nextSession);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [client]);

  const signIn = React.useCallback(async ({ email, password }) => {
    if (!client) throw new Error('Staging connection is not configured.');
    setError('');
    const { data, error: signInError } = await client.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (signInError) {
      const safe = safeAuthMessage(signInError);
      setError(safe);
      throw new Error(safe);
    }
    const next = normalizeSupabaseSession(data.session);
    if (next) await bootstrapCloudStore(client, next.id);
    setSession(next);
    return next;
  }, [client]);

  const signOut = React.useCallback(async () => {
    if (client) await client.auth.signOut();
    setSession(null);
    resetCloudStore();
  }, [client]);

  const value = React.useMemo(() => ({
    client,
    session,
    loading,
    error,
    syncError,
    mode: client ? 'cloud' : 'misconfigured',
    signIn,
    signOut,
  }), [client, session, loading, error, syncError, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = React.useContext(AuthContext);
  if (!value) throw new Error('Authentication context is unavailable.');
  return value;
}
