import React from 'react';
import {
  clearAuthSession,
  createTestAccount,
  loadAuthSession,
  signInTestAccount,
} from '../lib/auth.js';
import {
  getSupabase,
  hasSupabaseConfig,
  normalizeSupabaseSession,
} from '../lib/supabase.js';
import {
  bootstrapCloudStore,
  installGlobalErrorTelemetry,
  reportStudioError,
  resetCloudStore,
} from '../lib/cloudStore.js';

const AuthContext = React.createContext(null);

export function AuthProvider({ children }) {
  const cloud = hasSupabaseConfig();
  const allowLocal = import.meta.env.DEV || import.meta.env.VITE_ALLOW_LOCAL_MODE === 'true';
  const misconfigured = !cloud && !allowLocal;
  const [session, setSession] = React.useState(() => cloud || misconfigured ? null : loadAuthSession());
  const [loading, setLoading] = React.useState(cloud);
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
    if (!cloud) return undefined;
    let active = true;
    const db = getSupabase();
    const applySession = async nextSession => {
      if (!active) return;
      const normalized = normalizeSupabaseSession(nextSession);
      if (normalized) {
        try {
          await bootstrapCloudStore(db, normalized.id);
          setSyncError('');
        } catch (error) {
          setSyncError(error.message || 'Cloud sync is unavailable.');
          await reportStudioError(error, { code: 'cloud_bootstrap_failed' });
        }
      } else {
        resetCloudStore();
      }
      if (active) setSession(normalized);
    };
    db.auth.getSession().then(async ({ data, error }) => {
      if (error) setSyncError(error.message);
      await applySession(data.session);
      setLoading(false);
    });
    const { data } = db.auth.onAuthStateChange((_event, nextSession) => {
      void applySession(nextSession);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [cloud]);

  const signUp = React.useCallback(async ({ name, email, password }) => {
    if (misconfigured) throw new Error('Cloud authentication is not configured for this deployment.');
    if (!cloud) {
      const next = await createTestAccount({ name, email, password });
      setSession(next);
      return { session: next, confirmationRequired: false };
    }
    const { data, error } = await getSupabase().auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: { name: name.trim() } },
    });
    if (error) throw error;
    const next = normalizeSupabaseSession(data.session);
    if (next) {
      await bootstrapCloudStore(getSupabase(), next.id);
      setSession(next);
    }
    return { session: next, confirmationRequired: !next };
  }, [cloud, misconfigured]);

  const signIn = React.useCallback(async ({ email, password }) => {
    if (misconfigured) throw new Error('Cloud authentication is not configured for this deployment.');
    if (!cloud) {
      const next = await signInTestAccount({ email, password });
      setSession(next);
      return next;
    }
    const { data, error } = await getSupabase().auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) throw error;
    const next = normalizeSupabaseSession(data.session);
    if (next) await bootstrapCloudStore(getSupabase(), next.id);
    setSession(next);
    return next;
  }, [cloud, misconfigured]);

  const signInWithGoogle = React.useCallback(async () => {
    if (!cloud) throw new Error('Google sign-in requires Supabase configuration.');
    const { error } = await getSupabase().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/studio` },
    });
    if (error) throw error;
  }, [cloud]);

  const signOut = React.useCallback(async () => {
    if (cloud) await getSupabase().auth.signOut();
    else clearAuthSession();
    setSession(null);
    resetCloudStore();
  }, [cloud]);

  const value = React.useMemo(() => ({
    session,
    loading,
    syncError,
    mode: cloud ? 'cloud' : misconfigured ? 'misconfigured' : 'local',
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
  }), [session, loading, syncError, cloud, misconfigured, signUp, signIn, signInWithGoogle, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = React.useContext(AuthContext);
  if (!value) throw new Error('Authentication context is unavailable.');
  return value;
}
