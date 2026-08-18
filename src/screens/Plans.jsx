import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createCheckoutSession } from '../api/checkout.js';
import { fetchBillingCatalog } from '../api/plans.js';
import { useStudioAccess } from '../api/access.js';
import { AuthNotice, AuthShell, authPrimaryButtonStyle } from '../components/auth/AuthShell.jsx';
import { useAuth } from '../context/AuthContext.jsx';

function priceLabel(version) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: version.currency.toUpperCase(), maximumFractionDigits: 0 }).format(version.price_minor / 100);
}

export function Plans() {
  const auth = useAuth();
  const navigate = useNavigate();
  const accessState = useStudioAccess(auth.session?.raw ?? null, auth.client);
  const [plans, setPlans] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [working, setWorking] = React.useState('');
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    let active = true;
    fetchBillingCatalog(auth.client)
      .then(value => {
        if (active) setPlans(value.filter(plan => plan.plan_key === 'studio_pro' && plan.checkout_enabled));
      })
      .catch(failure => { if (active) setError(failure.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [auth.client]);

  const internal = accessState.access?.account_type === 'internal' || accessState.access?.role === 'owner';

  const choose = async plan => {
    if (!auth.session) {
      navigate('/signup', { state: { from: '/plans' } });
      return;
    }
    if (working) return;
    setWorking(plan.plan_key);
    setError('');
    try {
      const result = await createCheckoutSession(auth.client);
      window.location.assign(result.checkoutUrl);
    } catch (failure) {
      setError(failure.message);
      setWorking('');
    }
  };

  return <AuthShell
    wide
    title="Unlock Thee Studio"
    subtitle="Studio Pro is $19/month and includes 1,000 Studio credits each month."
  >
    {internal && <AuthNotice>Internal access is active. No customer plan or checkout is required.</AuthNotice>}
    {error && <AuthNotice error>{error}</AuthNotice>}
    {internal ? (
      <button style={authPrimaryButtonStyle} onClick={() => navigate('/studio')}>Continue to Studio</button>
    ) : loading ? (
      <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading plan…</p>
    ) : plans.length === 0 ? (
      <AuthNotice error>Studio Pro is temporarily unavailable. Please try again shortly.</AuthNotice>
    ) : (
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 520px)', justifyContent: 'center', gap: 24 }}>
        {plans.map(plan => (
          <div
            key={plan.id}
            style={{
              border: '1px solid var(--coral)',
              borderRadius: 'var(--radius-xl)',
              padding: 32,
              background: 'var(--cream)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ font: '600 0.75rem/1 var(--font-ui)', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--coral)' }}>
              {plan.display_name}
            </div>
            <div style={{ font: '600 2.75rem/1 var(--font-display)', color: 'var(--text-strong)', margin: '14px 0 8px' }}>
              {priceLabel(plan.version)}
            </div>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>
              per {plan.version.billing_interval} · {plan.version.included_credits.toLocaleString()} Studio credits monthly
            </p>
            <button
              type="button"
              disabled={Boolean(working)}
              onClick={() => choose(plan)}
              style={{ ...authPrimaryButtonStyle, marginTop: 24, opacity: working ? .6 : 1 }}
            >
              {working === plan.plan_key ? 'Opening secure checkout…' : 'Subscribe to Studio Pro'}
            </button>
          </div>
        ))}
      </div>
    )}
    {!auth.session && (
      <p style={{ textAlign: 'center', marginTop: 24, font: 'var(--text-sm)', color: 'var(--text-muted)' }}>
        Create or sign in to your account, then subscribe to unlock Thee Studio.
      </p>
    )}
  </AuthShell>;
}
