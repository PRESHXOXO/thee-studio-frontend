import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();
  const initialMode = new URLSearchParams(location.search).get('mode') === 'login' ? 'login' : 'signup';
  const [mode, setMode] = React.useState(initialMode); // 'signup' | 'login'
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const isMisconfigured = auth.mode === 'misconfigured';

  React.useEffect(() => {
    if (auth.session) navigate('/studio', { replace: true });
  }, [auth.session, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      if (mode === 'signup') {
        const result = await auth.signUp({ name, email, password });
        if (result.confirmationRequired) {
          setMessage('Check your email to confirm your account, then sign in.');
          setMode('login');
          setPassword('');
          return;
        }
      } else {
        await auth.signIn({ email, password });
      }
      navigate(location.state?.from || '/studio', { replace: true });
    } catch (err) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(current => current === 'signup' ? 'login' : 'signup');
    setError('');
    setMessage('');
    setPassword('');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--cream)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      {/* Back to landing */}
      <button
        onClick={() => navigate('/')}
        style={{
          position: 'fixed', top: 24, left: 24,
          background: 'var(--white)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)', padding: '8px 16px',
          font: 'var(--text-sm)', color: 'var(--text-muted)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
        }}
      >
        ← Back
      </button>

      <div style={{
        width: '100%', maxWidth: 420,
        background: 'var(--white)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-lg)',
        padding: '48px 40px',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'var(--grad-plum)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <span style={{ font: '700 1.375rem/1 var(--font-display)', color: 'var(--champagne)' }}>T</span>
          </div>
          <h1 style={{ font: '600 1.5rem/1.2 var(--font-display)', color: 'var(--text-strong)', marginBottom: 6 }}>
            {mode === 'signup' ? 'Create your account' : 'Welcome back'}
          </h1>
          <p style={{ font: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            {mode === 'signup' ? 'Start building with Thee Studio' : 'Sign in to your studio'}
          </p>
        </div>

        <button type="button" disabled={isMisconfigured} style={{
          width: '100%', padding: '11px 16px',
          background: 'var(--white)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)', cursor: isMisconfigured ? 'not-allowed' : 'pointer',
          font: '500 0.9375rem/1 var(--font-ui)', color: 'var(--text-body)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          marginBottom: 20,
          transition: 'var(--t-fast)', opacity: isMisconfigured ? 0.55 : 1,
        }}
          onClick={async () => {
            setError('');
            try { await auth.signInWithGoogle(); }
            catch (err) { setError(err.message || 'Google sign-in failed.'); }
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-strong)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ font: 'var(--text-xs)', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>or</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        <div style={{ font: 'var(--text-xs)', color: 'var(--text-muted)', textAlign: 'center', margin: '-4px 0 18px' }}>
          {isMisconfigured ? 'Cloud account service is not configured for this deployment' : auth.mode === 'cloud'
            ? 'Secure cloud account · work syncs across devices'
            : 'Local development account · connect Supabase for cloud sync'}
        </div>

        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="auth-name" style={{ display: 'block', font: '500 0.8125rem/1 var(--font-ui)', color: 'var(--text-body)', marginBottom: 6 }}>
                Name
              </label>
              <input
                id="auth-name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
                required
                style={{
                  width: '100%', padding: '10px 14px', boxSizing: 'border-box',
                  background: 'var(--white)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  font: 'var(--text-base)', color: 'var(--text-body)',
                  outline: 'none', transition: 'var(--t-fast)',
                }}
                onFocus={e => e.target.style.boxShadow = 'var(--focus-ring)'}
                onBlur={e => e.target.style.boxShadow = 'none'}
              />
            </div>
          )}
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="auth-email" style={{ display: 'block', font: '500 0.8125rem/1 var(--font-ui)', color: 'var(--text-body)', marginBottom: 6 }}>
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
              style={{
                width: '100%', padding: '10px 14px', boxSizing: 'border-box',
                background: 'var(--white)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                font: 'var(--text-base)', color: 'var(--text-body)',
                outline: 'none', transition: 'var(--t-fast)',
              }}
              onFocus={e => e.target.style.boxShadow = 'var(--focus-ring)'}
              onBlur={e => e.target.style.boxShadow = 'none'}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label htmlFor="auth-password" style={{ display: 'block', font: '500 0.8125rem/1 var(--font-ui)', color: 'var(--text-body)', marginBottom: 6 }}>
              Password
            </label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              minLength={8}
              required
              style={{
                width: '100%', padding: '10px 14px', boxSizing: 'border-box',
                background: 'var(--white)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                font: 'var(--text-base)', color: 'var(--text-body)',
                outline: 'none', transition: 'var(--t-fast)',
              }}
              onFocus={e => e.target.style.boxShadow = 'var(--focus-ring)'}
              onBlur={e => e.target.style.boxShadow = 'none'}
            />
          </div>

          {(error || isMisconfigured) && (
            <div role="alert" style={{
              margin: '-8px 0 16px', padding: '10px 12px',
              borderRadius: 'var(--radius-md)', background: 'var(--status-locked-bg)',
              color: 'var(--cherry)', font: 'var(--text-sm)', lineHeight: 1.4,
            }}>
              {error || 'Thee Studio cannot sign you in until Supabase is configured. Add the public Supabase URL and anonymous key, then redeploy.'}
            </div>
          )}
          {message && (
            <div role="status" style={{
              margin: '-8px 0 16px', padding: '10px 12px',
              borderRadius: 'var(--radius-md)', background: 'var(--status-ready-bg)',
              color: 'var(--status-ready)', font: 'var(--text-sm)', lineHeight: 1.4,
            }}>
              {message}
            </div>
          )}

          <button type="submit" style={{
            width: '100%', padding: '12px',
            background: 'var(--grad-coral)', color: '#fff',
            border: 'none', borderRadius: 'var(--radius-md)',
            font: '600 0.9375rem/1 var(--font-ui)', cursor: loading ? 'wait' : 'pointer',
            boxShadow: 'var(--shadow-coral)',
            transition: 'var(--t-base)', opacity: loading || isMisconfigured ? 0.55 : 1,
          }}
            disabled={loading || isMisconfigured}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            {loading ? (mode === 'signup' ? 'Creating account…' : 'Signing in…') : (mode === 'signup' ? 'Create account' : 'Sign in')}
          </button>
        </form>

        <p style={{ textAlign: 'center', font: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 24 }}>
          {mode === 'signup' ? 'Already have an account? ' : "Don't have an account? "}
          <button
            type="button"
            onClick={switchMode}
            style={{ background: 'none', border: 'none', color: 'var(--coral)', fontWeight: 600, cursor: 'pointer', font: 'var(--text-sm)' }}
          >
            {mode === 'signup' ? 'Sign in' : 'Sign up'}
          </button>
        </p>
      </div>
    </div>
  );
}
