import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { AuthNotice, AuthShell, authInputStyle, authPrimaryButtonStyle } from '../components/auth/AuthShell.jsx';

export function Auth({ mode = 'login' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState('');
  const [message, setMessage] = React.useState(location.state?.message || '');
  const [loading, setLoading] = React.useState(false);
  const signup = mode === 'signup';
  const disabled = loading || auth.mode === 'misconfigured';

  const handleSubmit = async event => {
    event.preventDefault();
    if (disabled) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      if (signup) {
        const result = await auth.signUp({ name, email, password });
        if (result.confirmationRequired) {
          setMessage('Check your email and confirm your account. Your confirmation link will continue to plan selection.');
          setPassword('');
          return;
        }
        navigate('/plans', { replace: true });
      } else {
        await auth.signIn({ email, password });
        navigate(location.state?.from || '/studio', { replace: true });
      }
    } catch (failure) {
      setError(failure.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  if (auth.loading) return <AuthShell title="Opening Thee Studio" subtitle="Restoring your secure session…" />;

  if (auth.session) {
    return (
      <AuthShell title="You are already signed in" subtitle={`Signed in as ${auth.session.email}`}>
        <button type="button" style={authPrimaryButtonStyle} onClick={() => navigate('/studio')}>Continue to Studio</button>
        <button type="button" onClick={async () => { await auth.signOut(); setMessage('Signed out. You can now use another account.'); }} style={{ ...authPrimaryButtonStyle, marginTop: 12, background: 'transparent', color: 'var(--text-body)', border: '1px solid var(--border)', boxShadow: 'none' }}>
          Sign out and use another account
        </button>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={signup ? 'Create your account' : 'Welcome back'} subtitle={signup ? 'Start building with Thee Studio' : 'Sign in to your studio'}>
      {auth.googleEnabled && (
        <button type="button" disabled={disabled} onClick={() => auth.signInWithGoogle().catch(failure => setError(failure.message))} style={{ ...authPrimaryButtonStyle, marginBottom: 20, background: 'var(--white)', color: 'var(--text-body)', border: '1px solid var(--border)', boxShadow: 'none' }}>
          Continue with Google
        </button>
      )}
      {message && <AuthNotice>{message}</AuthNotice>}
      {(error || auth.mode === 'misconfigured') && <AuthNotice error>{error || 'Cloud account service is not configured.'}</AuthNotice>}
      <form onSubmit={handleSubmit}>
        {signup && <Field id="auth-name" label="Name"><input id="auth-name" value={name} onChange={event => setName(event.target.value)} autoComplete="name" required style={authInputStyle} /></Field>}
        <Field id="auth-email" label="Email"><input id="auth-email" type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" required style={authInputStyle} /></Field>
        <Field id="auth-password" label="Password">
          <div style={{ position: 'relative' }}>
            <input id="auth-password" type={showPassword ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} autoComplete={signup ? 'new-password' : 'current-password'} minLength={8} required style={{ ...authInputStyle, paddingRight: 70 }} />
            <button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} style={{ position: 'absolute', right: 8, top: 7, border: 0, background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', font: 'var(--text-xs)' }}>{showPassword ? 'Hide' : 'Show'}</button>
          </div>
        </Field>
        {!signup && <div style={{ textAlign: 'right', margin: '-8px 0 18px' }}><Link to="/forgot-password" style={{ color: 'var(--coral)', font: 'var(--text-sm)', textDecoration: 'none' }}>Forgot password?</Link></div>}
        <button type="submit" disabled={disabled} style={{ ...authPrimaryButtonStyle, opacity: disabled ? 0.55 : 1 }}>{loading ? 'Please wait…' : signup ? 'Create account' : 'Sign in'}</button>
      </form>
      <p style={{ textAlign: 'center', font: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 24 }}>
        {signup ? 'Already have an account? ' : "Don't have an account? "}
        <Link to={signup ? '/login' : '/signup'} style={{ color: 'var(--coral)', fontWeight: 600, textDecoration: 'none' }}>{signup ? 'Sign in' : 'Sign up'}</Link>
      </p>
    </AuthShell>
  );
}

function Field({ id, label, children }) {
  return <div style={{ marginBottom: 16 }}><label htmlFor={id} style={{ display: 'block', font: '500 0.8125rem/1 var(--font-ui)', color: 'var(--text-body)', marginBottom: 6 }}>{label}</label>{children}</div>;
}
