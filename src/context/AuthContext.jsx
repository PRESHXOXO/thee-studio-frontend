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
  if ((message.includes('email address') && message.includes('invalid')) || message.includes('invalid email')) return 'Enter a valid email address.';
  if (message.includes('rate limit') || message.includes('too many requests')) return 'Too many email requests were sent recently. Wait a few minutes, then try again.';
  if (message.includes('network') || message.includes('fetch')) return 'Unable to reach the sign-in service.';
  if (message.includes('already registered')) return 'An account already exists for this email.';
  if (message.includes('password')) return 'Use a password with at least 8 characters.';
  return 'Sign-in failed. Check your details and try again.';
}

export function AuthProvider({ children, client = hasSupabaseConfig() ? getSupabase() : null }) {
  const [session, setSession] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [syncError, setSyncError] = React.useState('');
  const transitionRef = React.useRef(0);

  const applySession = React.useCallback(async nextSession => {
    const transition = ++transitionRef.current;
    const normalized = normalizeSupabaseSession(nextSession);
    if (normalized) {
      try {
        await bootstrapCloudStore(client, normalized.id);
        if (transition === transitionRef.current) setSyncError('');
      } catch (bootstrapError) {
        if (transition === transitionRef.current) setSyncError('Cloud sync is unavailable.');
        await reportStudioError(bootstrapError, { code: 'cloud_bootstrap_failed' });
      }
    } else {
      resetCloudStore();
    }
    if (transition === transitionRef.current) {
      setSession(normalized);
      setLoading(false);
    }
    return transition === transitionRef.current ? normalized : null;
  }, [client]);

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
    client.auth.getSession().then(async ({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError) setError('Your session could not be restored. Sign in again.');
      await applySession(data?.session ?? null);
    });
    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      setError('');
      // Supabase holds its auth lock while notifying listeners. Defer cloud
      // queries so an account switch cannot deadlock the sign-in promise.
      window.setTimeout(() => {
        if (active) void applySession(nextSession);
      }, 0);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [applySession, client]);

  const signIn = React.useCallback(async ({ email, password }) => {
    if (!client) throw new Error('Staging connection is not configured.');
    setError('');
    resetCloudStore();
    setSession(null);
    const { data, error: signInError } = await client.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (signInError) {
      const safe = safeAuthMessage(signInError);
      setError(safe);
      throw new Error(safe);
    }
    return applySession(data.session);
  }, [applySession, client]);

  const signUp = React.useCallback(async ({ name, email, password }) => {
    if (!client) throw new Error('Staging connection is not configured.');
    setError('');
    resetCloudStore();
    setSession(null);
    const { data, error: signUpError } = await client.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { name: name.trim(), full_name: name.trim() },
        emailRedirectTo: `${window.location.origin}/plans?confirmed=true`,
      },
    });
    if (signUpError) {
      const safe = safeAuthMessage(signUpError);
      setError(safe);
      throw new Error(safe);
    }
    const next = data.session ? await applySession(data.session) : null;
    return { session: next, confirmationRequired: !next };
  }, [applySession, client]);

  const requestPasswordReset = React.useCallback(async email => {
    if (!client) throw new Error('Staging connection is not configured.');
    const { error: resetError } = await client.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: `${window.location.origin}/reset-password` },
    );
    if (resetError) throw new Error('Password reset email could not be sent. Try again.');
  }, [client]);

  const updatePassword = React.useCallback(async password => {
    if (!client) throw new Error('Staging connection is not configured.');
    const { error: updateError } = await client.auth.updateUser({ password });
    if (updateError) throw new Error('Password could not be updated. Request a new reset link.');
  }, [client]);

  const googleEnabled = import.meta.env.VITE_SUPABASE_GOOGLE_AUTH_ENABLED === 'true';
  const signInWithGoogle = React.useCallback(async () => {
    if (!client || !googleEnabled) throw new Error('Google sign-in is not available.');
    const { error: oauthError } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/plans` },
    });
    if (oauthError) throw new Error('Google sign-in could not be started.');
  }, [client, googleEnabled]);

  const signOut = React.useCallback(async () => {
    if (client) await client.auth.signOut();
    await applySession(null);
  }, [applySession, client]);

  const value = React.useMemo(() => ({
    client,
    session,
    loading,
    error,
    syncError,
    mode: client ? 'cloud' : 'misconfigured',
    googleEnabled,
    signIn,
    signUp,
    signInWithGoogle,
    requestPasswordReset,
    updatePassword,
    signOut,
  }), [client, session, loading, error, syncError, googleEnabled, signIn, signUp, signInWithGoogle, requestPasswordReset, updatePassword, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = React.useContext(AuthContext);
  if (!value) throw new Error('Authentication context is unavailable.');
  return value;
}
