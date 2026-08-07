import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Auth } from './Auth.jsx';

const state = vi.hoisted(() => ({ auth: {} }));
vi.mock('../context/AuthContext.jsx', () => ({ useAuth: () => state.auth }));

function baseAuth(overrides = {}) {
  return {
    loading: false, session: null, mode: 'cloud', googleEnabled: false,
    signIn: vi.fn().mockResolvedValue({}), signUp: vi.fn(), signOut: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('onboarding authentication screens', () => {
  beforeEach(() => { state.auth = baseAuth(); });

  it('shows the required choices when /login already has a session', async () => {
    state.auth = baseAuth({ session: { email: 'signed-in@example.invalid' } });
    render(<MemoryRouter><Auth mode="login" /></MemoryRouter>);
    expect(screen.getByText('Signed in as signed-in@example.invalid')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue to Studio' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sign out and use another account' }));
    await waitFor(() => expect(state.auth.signOut).toHaveBeenCalledTimes(1));
  });

  it('submits signup and explains email confirmation', async () => {
    state.auth.signUp.mockResolvedValue({ confirmationRequired: true });
    render(<MemoryRouter><Auth mode="signup" /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'New Customer' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new@example.invalid' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText(/confirmation link will continue to plan selection/i)).toBeInTheDocument();
    expect(state.auth.signUp).toHaveBeenCalledWith({ name: 'New Customer', email: 'new@example.invalid', password: 'password1' });
  });

  it('performs normal password login', async () => {
    render(<MemoryRouter><Auth mode="login" /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'user@example.invalid' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(state.auth.signIn).toHaveBeenCalledWith({ email: 'user@example.invalid', password: 'password1' }));
  });
});
