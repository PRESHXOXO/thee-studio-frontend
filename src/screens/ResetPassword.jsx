import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { AuthNotice, AuthShell, authInputStyle, authPrimaryButtonStyle } from '../components/auth/AuthShell.jsx';

export function ResetPassword() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const submit = async event => {
    event.preventDefault();
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true); setError('');
    try {
      await auth.updatePassword(password);
      await auth.signOut();
      navigate('/login', { replace: true, state: { message: 'Password updated. Sign in with your new password.' } });
    } catch (failure) { setError(failure.message); setLoading(false); }
  };
  if (auth.loading) return <AuthShell title="Checking reset link" subtitle="One moment…" />;
  if (!auth.session) return <AuthShell title="Reset link expired" subtitle="Request a new secure link to continue."><Link to="/forgot-password" style={{ ...authPrimaryButtonStyle, display: 'block', boxSizing: 'border-box', textAlign: 'center', textDecoration: 'none' }}>Request another link</Link></AuthShell>;
  return <AuthShell title="Choose a new password" subtitle="Use at least 8 characters.">
    {error && <AuthNotice error>{error}</AuthNotice>}
    <form onSubmit={submit}>
      <input aria-label="New password" type="password" minLength={8} required autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} style={{ ...authInputStyle, marginBottom: 14 }} />
      <input aria-label="Confirm new password" type="password" minLength={8} required autoComplete="new-password" value={confirm} onChange={event => setConfirm(event.target.value)} style={{ ...authInputStyle, marginBottom: 20 }} />
      <button type="submit" disabled={loading} style={authPrimaryButtonStyle}>{loading ? 'Updating…' : 'Update password'}</button>
    </form>
  </AuthShell>;
}
