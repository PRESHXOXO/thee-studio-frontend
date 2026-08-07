import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createCheckoutSession } from '../api/checkout.js';
import { fetchBillingCatalog, selectFreePlan } from '../api/plans.js';
import { useStudioAccess } from '../api/access.js';
import { AuthNotice, AuthShell, authPrimaryButtonStyle } from '../components/auth/AuthShell.jsx';
import { useAuth } from '../context/AuthContext.jsx';

function priceLabel(version) {
  if (version.price_minor === 0) return '$0';
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
    fetchBillingCatalog(auth.client).then(value => { if (active) setPlans(value); }).catch(failure => { if (active) setError(failure.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [auth.client]);
  const internal = accessState.access?.account_type === 'internal' || accessState.access?.role === 'owner';
  const choose = async plan => {
    if (!auth.session) { navigate('/signup', { state: { from: '/plans' } }); return; }
    if (working) return;
    setWorking(plan.plan_key); setError('');
    try {
      if (plan.plan_key === 'free') {
        await selectFreePlan(auth.client);
        navigate('/studio', { replace: true });
      } else {
        const result = await createCheckoutSession(auth.client);
        window.location.assign(result.checkoutUrl);
      }
    } catch (failure) { setError(failure.message); setWorking(''); }
  };
  return <AuthShell wide title="Choose your studio plan" subtitle="Start free or unlock 1,000 monthly credits with Studio Pro.">
    {internal && <AuthNotice>Internal access is active. No customer plan or checkout is required.</AuthNotice>}
    {error && <AuthNotice error>{error}</AuthNotice>}
    {internal ? <button style={authPrimaryButtonStyle} onClick={() => navigate('/studio')}>Continue to Studio</button> : loading ? <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading plans…</p> : (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
        {plans.map(plan => <div key={plan.id} style={{ border: plan.plan_key === 'studio_pro' ? '1px solid var(--coral)' : '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: 28, background: plan.plan_key === 'studio_pro' ? 'var(--cream)' : 'var(--white)' }}>
          <div style={{ font: '600 0.75rem/1 var(--font-ui)', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--coral)' }}>{plan.display_name}</div>
          <div style={{ font: '600 2.75rem/1 var(--font-display)', color: 'var(--text-strong)', margin: '14px 0 8px' }}>{priceLabel(plan.version)}</div>
          <p style={{ color: 'var(--text-muted)', minHeight: 42 }}>{plan.version.billing_interval === 'none' ? 'No monthly charge' : `per ${plan.version.billing_interval} · ${plan.version.included_credits.toLocaleString()} credits`}</p>
          <button type="button" disabled={Boolean(working)} onClick={() => choose(plan)} style={{ ...authPrimaryButtonStyle, marginTop: 18, opacity: working ? .6 : 1 }}>{working === plan.plan_key ? 'Please wait…' : plan.plan_key === 'free' ? 'Choose Free' : 'Choose Studio Pro'}</button>
        </div>)}
      </div>
    )}
    {!auth.session && <p style={{ textAlign: 'center', marginTop: 24, font: 'var(--text-sm)', color: 'var(--text-muted)' }}>You will create or sign in to your account before selecting a plan.</p>}
  </AuthShell>;
}
