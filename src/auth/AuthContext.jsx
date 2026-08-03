import React from 'react';
import { supabase } from '../lib/supabase.js';

const AuthContext = React.createContext(null);

export function safeAuthMessage(error) {
  const message = String(error?.message || '').toLowerCase();
  if (message.includes('invalid login credentials')) return 'Email or password is incorrect.';
  if (message.includes('email not confirmed')) return 'Confirm your email before signing in.';
  if (message.includes('network') || message.includes('fetch')) return 'Unable to reach the sign-in service.';
  return 'Sign-in failed. Check your details and try again.';
}

export function AuthProvider({ children, client = supabase }) {
  const [session, setSession] = React.useState(null);
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    let active = true;
    if (!client) {
      setLoading(false);
      setError('Staging connection is not configured.');
      return undefined;
    }

    client.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError) {
        setError('Your session could not be restored. Sign in again.');
        setSession(null);
        setUser(null);
      } else {
        setSession(data?.session ?? null);
        setUser(data?.session?.user ?? null);
      }
      setLoading(false);
    });

    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession ?? null);
      setUser(nextSession?.user ?? null);
      setError('');
      setLoading(false);
    });

    return () => {
      active = false;
      listener?.subscription?.unsubscribe();
    };
  }, [client]);

  const signIn = React.useCallback(async (email, password) => {
    if (!client) throw new Error('Staging connection is not configured.');
    setError('');
    const { data, error: signInError } = await client.auth.signInWithPassword({ email, password });
    if (signInError) {
      const safe = safeAuthMessage(signInError);
      setError(safe);
      throw new Error(safe);
    }
    setSession(data.session ?? null);
    setUser(data.user ?? data.session?.user ?? null);
    return data;
  }, [client]);

  const signOut = React.useCallback(async () => {
    if (!client) return;
    const { error: signOutError } = await client.auth.signOut();
    setSession(null);
    setUser(null);
    if (signOutError) setError('Sign-out did not complete cleanly. Please refresh.');
  }, [client]);

  const value = React.useMemo(() => ({
    client,
    session,
    user,
    loading,
    error,
    signIn,
    signOut,
  }), [client, session, user, loading, error, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = React.useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}
