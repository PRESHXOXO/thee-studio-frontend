import React from 'react';
import { Icon } from '../core/Icon.jsx';

export function LoginScreen({ onSignIn, error = '', configured = true }) {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [localError, setLocalError] = React.useState('');
  const staging = import.meta.env.DEV || import.meta.env.MODE === 'staging' || import.meta.env.VITE_APP_ENV === 'staging';

  const submit = async event => {
    event.preventDefault();
    if (!configured || loading) return;
    setLoading(true);
    setLocalError('');
    try {
      await onSignIn(email.trim(), password);
    } catch (signInError) {
      setLocalError(signInError?.message || 'Sign-in failed.');
    } finally {
      setPassword('');
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card" aria-label="Thee Studio sign in">
        <div className="auth-brand-mark">T</div>
        <div className="auth-brand-name">Thee Studio</div>
        <div className="auth-brand-subtitle">Creative OS</div>
        {staging && <span className="auth-staging-badge">Staging</span>}
        <form onSubmit={submit} className="auth-form">
          <label className="auth-field">
            <span>Email</span>
            <input type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} required autoFocus />
          </label>
          <label className="auth-field">
            <span>Password</span>
            <div className="auth-password-wrap">
              <input type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required />
              <button type="button" className="auth-password-toggle" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                <Icon name={showPassword ? 'eye-off' : 'eye'} size={16} />
              </button>
            </div>
          </label>
          {(localError || error || !configured) && (
            <div className="auth-error" role="alert">{localError || error || 'Staging connection is not configured.'}</div>
          )}
          <button className="auth-submit" type="submit" disabled={loading || !configured || !email.trim() || !password}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </section>
    </main>
  );
}
