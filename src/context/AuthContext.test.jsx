import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext.jsx';

vi.mock('../lib/cloudStore.js', () => ({
  bootstrapCloudStore: vi.fn().mockResolvedValue(undefined),
  installGlobalErrorTelemetry: vi.fn(() => vi.fn()),
  reportStudioError: vi.fn().mockResolvedValue(undefined),
  resetCloudStore: vi.fn(),
}));

function fakeClient(initialSession = null) {
  let listener;
  return {
    emit(event, session) { listener?.(event, session); },
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: initialSession }, error: null }),
      onAuthStateChange: vi.fn(callback => {
        listener = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
      signInWithPassword: vi.fn(),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  };
}

function session(id) {
  return { access_token: 'test-token', user: { id, email: `${id}@example.invalid` } };
}

function Probe() {
  const auth = useAuth();
  return (
    <div>
      <span>{auth.loading ? 'loading' : auth.session?.id || 'signed-out'}</span>
      <span>{auth.error}</span>
      <button onClick={() => auth.signIn({ email: 'owner@example.invalid', password: 'password' }).catch(() => {})}>login</button>
      <button onClick={auth.signOut}>logout</button>
    </div>
  );
}

describe('AuthProvider', () => {
  it('restores an existing session', async () => {
    const client = fakeClient(session('owner-1'));
    render(<AuthProvider client={client}><Probe /></AuthProvider>);
    expect(await screen.findByText('owner-1')).toBeInTheDocument();
  });

  it('signs in with password authentication', async () => {
    const client = fakeClient();
    client.auth.signInWithPassword.mockResolvedValue({ data: { session: session('owner-2') }, error: null });
    render(<AuthProvider client={client}><Probe /></AuthProvider>);
    await screen.findByText('signed-out');
    fireEvent.click(screen.getByText('login'));
    expect(await screen.findByText('owner-2')).toBeInTheDocument();
    expect(client.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'owner@example.invalid', password: 'password' });
  });

  it('shows a safe login failure', async () => {
    const client = fakeClient();
    client.auth.signInWithPassword.mockResolvedValue({ data: {}, error: new Error('Invalid login credentials') });
    render(<AuthProvider client={client}><Probe /></AuthProvider>);
    await screen.findByText('signed-out');
    fireEvent.click(screen.getByText('login'));
    expect(await screen.findByText('Email or password is incorrect.')).toBeInTheDocument();
  });

  it('signs out and clears local auth state', async () => {
    const client = fakeClient(session('owner-3'));
    render(<AuthProvider client={client}><Probe /></AuthProvider>);
    await screen.findByText('owner-3');
    fireEvent.click(screen.getByText('logout'));
    expect(await screen.findByText('signed-out')).toBeInTheDocument();
    expect(client.auth.signOut).toHaveBeenCalledTimes(1);
  });

  it('handles an expired session event', async () => {
    const client = fakeClient(session('owner-4'));
    render(<AuthProvider client={client}><Probe /></AuthProvider>);
    await screen.findByText('owner-4');
    await act(async () => client.emit('SIGNED_OUT', null));
    await waitFor(() => expect(screen.getByText('signed-out')).toBeInTheDocument());
  });
});
