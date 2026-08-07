import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { AuthNotice, AuthShell, authInputStyle, authPrimaryButtonStyle } from '../components/auth/AuthShell.jsx';

export function ForgotPassword() {
  const auth = useAuth();
  const [email, setEmail] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const submit = async event => {
    event.preventDefault();
    if (loading) return;
    setLoading(true); setError('');
    try {
      await auth.requestPasswordReset(email);
      setStatus('If an account exists for that email, a secure reset link is on its way.');
    } catch (failure) { setError(failure.message); }
    finally { setLoading(false); }
  };
  return <AuthShell title="Reset your password" subtitle="We will email you a secure reset link.">
    {status && <AuthNotice>{status}</AuthNotice>}{error && <AuthNotice error>{error}</AuthNotice>}
    <form onSubmit={submit}>
      <label htmlFor="recovery-email" style={{ display: 'block', font: '500 0.8125rem/1 var(--font-ui)', marginBottom: 6 }}>Email</label>
      <input id="recovery-email" type="email" required autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} style={{ ...authInputStyle, marginBottom: 20 }} />
      <button type="submit" disabled={loading} style={authPrimaryButtonStyle}>{loading ? 'Sending…' : 'Send reset link'}</button>
    </form>
    <p style={{ textAlign: 'center', marginTop: 24 }}><Link to="/login" style={{ color: 'var(--coral)', font: 'var(--text-sm)', textDecoration: 'none' }}>Back to sign in</Link></p>
  </AuthShell>;
}
