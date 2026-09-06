import React from 'react';
import { getSupabase, hasSupabaseConfig, isApiModeEnabled, isE2eAuthEnabled, normalizeSupabaseSession } from '../lib/supabase.js';
import {
  bootstrapCloudStore,
  reportStudioError,
  resetCloudStore,
} from '../lib/cloudStore.js';
import { refreshLibrary } from '../lib/library.js';

const AuthContext = React.createContext(null);

function installGlobalErrorTelemetry() {
  const onError = event => {
    reportStudioError(event.error || event.message, {
      code: 'window_error',
      filename: event.filename,
      line: event.lineno,
      column: event.colno,
    });
  };
  const onRejection = event => {
    reportStudioError(event.reason, { code: 'unhandled_rejection' });
  };
  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);
  return () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
  };
}

export function safeAuthMessage(error) {
  const message = String(error?.message || '').toLowerCase();
  // The replacement API deliberately uses the same security-safe message for
  // unknown accounts, malformed addresses, and wrong passwords. Do not turn
  // that generic credential response into a misleading email-format error.
  if (message.includes('invalid email or password') || message.includes('invalid login credentials')) {
    return 'Email or password is incorrect.';
  }
  if (message.includes('email not confirmed')) return 'Confirm your email before signing in.';
  if ((message.includes('email address') && message.includes('invalid'))
    || (message.includes('invalid email') && !message.includes('password'))) {
    return 'Enter a valid email address.';
  }
  if (message.includes('rate limit') || message.includes('too many requests')) return 'Too many email requests were sent recently. Wait a few minutes, then try again.';
  if (message.includes('network') || message.includes('fetch')) return 'Unable to reach the sign-in service.';
  if (message.includes('already registered')) return 'An account already exists for this email.';
  if (message.includes('password')) return 'Use a password with at least 8 characters.';
  return 'Sign-in failed. Check your details and try again.';
}

export function isRefreshableSessionError(error) {
  return String(error?.message || '').toLowerCase().includes('jwt issued at future');
}

export function AuthProvider({ children, client = (isApiModeEnabled() || hasSupabaseConfig() || isE2eAuthEnabled()) ? getSupabase() : null }) {
  const [session, setSession] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [syncError, setSyncError] = React.useState('');
  const transitionRef = React.useRef(0);

  const applySession = React.useCallback(async nextSession => {
    const transition = ++transitionRef.current;
    let normalized = normalizeSupabaseSession(nextSession);
    if (normalized) {
      try {
        if (!client?.__e2e) {
          try {
            await bootstrapCloudStore(client, normalized.id);
          } catch (bootstrapError) {
            if (!isRefreshableSessionError(bootstrapError) || typeof client?.auth?.refreshSession !== 'function') {
              throw bootstrapError;
            }
            const { data: refreshed, error: refreshError } = await client.auth.refreshSession();
            const refreshedSession = refreshed?.session;
            const refreshedNormalized = normalizeSupabaseSession(refreshedSession);
            if (refreshError || !refreshedNormalized) throw bootstrapError;
            normalized = refreshedNormalized;
            await bootstrapCloudStore(client, normalized.id);
          }
          await refreshLibrary();
        }
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
      setError('Production API connection is not configured.');
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
    if (!client) throw new Error('Production API connection is not configured.');
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
    if (!client) throw new Error('Production API connection is not configured.');
    setError('');
    resetCloudStore();
    setSession(null);
    const normalizedEmail = email.trim().toLowerCase();
    const { data, error: signUpError } = await client.auth.signUp({
      email: normalizedEmail,
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

    if (data.session) {
      const next = await applySession(data.session);
      return { session: next, confirmationRequired: false };
    }

    const { data: signInData, error: signInError } = await client.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    if (!signInError && signInData?.session) {
      const next = await applySession(signInData.session);
      return { session: next, confirmationRequired: false };
    }

    if (String(signInError?.message || '').toLowerCase().includes('email not confirmed')) {
      return { session: null, confirmationRequired: true };
    }

    if (signInError) {
      const safe = safeAuthMessage(signInError);
      setError(safe);
      throw new Error(safe);
    }

    return { session: null, confirmationRequired: true };
  }, [applySession, client]);

  const requestPasswordReset = React.useCallback(async email => {
    if (!client?.auth?.resetPasswordForEmail) throw new Error('Password reset is not available yet.');
    const { error: resetError } = await client.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: `${window.location.origin}/reset-password` },
    );
    if (resetError) throw new Error('Password reset email could not be sent. Try again.');
  }, [client]);

  const updatePassword = React.useCallback(async password => {
    if (!client?.auth?.updateUser) throw new Error('Password reset is not available yet.');
    const { error: updateError } = await client.auth.updateUser({ password });
    if (updateError) throw new Error('Password could not be updated. Request a new reset link.');
  }, [client]);

  const googleEnabled = !isApiModeEnabled() && import.meta.env.VITE_SUPABASE_GOOGLE_AUTH_ENABLED === 'true';
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
    mode: client?.__api ? 'api' : client?.__e2e ? 'local' : client ? 'cloud' : 'misconfigured',
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
