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

const AuthContext = React.createContext(null);

export function AuthProvider({ children }) {
  const cloud = hasSupabaseConfig();
  const [session, setSession] = React.useState(() => cloud ? null : loadAuthSession());
  const [loading, setLoading] = React.useState(cloud);

  React.useEffect(() => {
    if (!cloud) return undefined;
    let active = true;
    const db = getSupabase();
    db.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(normalizeSupabaseSession(data.session));
      setLoading(false);
    });
    const { data } = db.auth.onAuthStateChange((_event, nextSession) => {
      if (active) setSession(normalizeSupabaseSession(nextSession));
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [cloud]);

  const signUp = React.useCallback(async ({ name, email, password }) => {
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
    if (next) setSession(next);
    return { session: next, confirmationRequired: !next };
  }, [cloud]);

  const signIn = React.useCallback(async ({ email, password }) => {
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
    setSession(next);
    return next;
  }, [cloud]);

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
  }, [cloud]);

  const value = React.useMemo(() => ({
    session,
    loading,
    mode: cloud ? 'cloud' : 'local',
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
  }), [session, loading, cloud, signUp, signIn, signInWithGoogle, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = React.useContext(AuthContext);
  if (!value) throw new Error('Authentication context is unavailable.');
  return value;
}
