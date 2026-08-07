import React from 'react';
import { adminTelemetryRequest, downloadTelemetryCsv } from '../api/adminTelemetry.js';
import { Button } from '../components/core/Button.jsx';
import { Card } from '../components/surfaces/Card.jsx';

const money = micros => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(micros || 0) / 1_000_000);
const integer = value => new Intl.NumberFormat('en-US').format(Number(value || 0));
const monthStart = () => {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`;
};

const METRIC = { padding: 18, display: 'flex', flexDirection: 'column', gap: 6 };
const HEAD = { textAlign: 'left', padding: '9px 10px', font: 'var(--label)', color: 'var(--text-faint)', borderBottom: '1px solid var(--border)' };
const CELL = { padding: '10px', font: 'var(--text-xs)', color: 'var(--text-body)', borderBottom: '1px solid var(--border)' };

export function AdminTelemetry({ authorized = false, accessChecked = true, adminRole = null }) {
  const [periodStart, setPeriodStart] = React.useState(monthStart);
  const [data, setData] = React.useState(null);
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    setBusy(true); setError('');
    try { setData(await adminTelemetryRequest('overview', { periodStart })); }
    catch (caught) { setError(caught.message || 'Unable to load internal telemetry.'); }
    finally { setBusy(false); }
  }, [periodStart]);

  React.useEffect(() => { if (authorized) void load(); }, [authorized, load]);
  const users = data?.users || [];
  const totals = users.reduce((sum, row) => ({
    revenue: sum.revenue + Number(row.net_revenue_micros || 0),
    cost: sum.cost + Number(row.actual_provider_cost_micros || 0) + Number(row.estimated_provider_cost_micros || 0) + Number(row.storage_cost_micros || 0),
    margin: sum.margin + Number(row.gross_margin_micros || 0),
    attempts: sum.attempts + Number(row.attempts || 0),
    retries: sum.retries + Number(row.retries || 0),
  }), { revenue: 0, cost: 0, margin: 0, attempts: 0, retries: 0 });

  const exportCsv = async type => {
    setBusy(true); setError('');
    try { await downloadTelemetryCsv(type, periodStart); }
    catch (caught) { setError(caught.message || 'CSV export failed.'); }
    finally { setBusy(false); }
  };

  if (!accessChecked) return <Card><div style={{ color: 'var(--text-muted)' }}>Checking admin access…</div></Card>;
  if (!authorized) return <Card variant="rose"><div role="alert" style={{ color: 'var(--cherry)' }}>Admin access required.</div></Card>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 'var(--content-max)', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 16 }}>
        <div>
          <div style={{ font: 'var(--label)', color: 'var(--accent-deep)', textTransform: 'uppercase', letterSpacing: 'var(--label-spacing)', marginBottom: 8 }}>Admin only</div>
          <h1 style={{ font: 'var(--display-lg)', margin: '0 0 8px', color: 'var(--text-strong)' }}>Cost & profitability</h1>
          <p style={{ margin: 0, color: 'var(--text-muted)', font: 'var(--text-base)' }}>Internal provider spend, retries, payment fees, and plan margin.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input aria-label="Profitability month" type="month" value={periodStart.slice(0, 7)} onChange={event => setPeriodStart(`${event.target.value}-01`)} style={{ padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8 }} />
          <Button variant="secondary" loading={busy} onClick={load}>Refresh</Button>
        </div>
      </div>
      {error && <Card variant="rose"><div role="alert" style={{ color: 'var(--cherry)' }}>{error}</div></Card>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(0,1fr))', gap: 12 }}>
        {[
          ['Net revenue', money(totals.revenue)],
          ['Total cost', money(totals.cost)],
          ['Gross margin', money(totals.margin)],
          ['Attempts', integer(totals.attempts)],
          ['Retry rate', totals.attempts ? `${((totals.retries / totals.attempts) * 100).toFixed(1)}%` : '0%'],
        ].map(([label, value]) => <Card key={label} style={METRIC}><span style={{ font: 'var(--label)', color: 'var(--text-faint)' }}>{label}</span><strong style={{ font: 'var(--display-sm)', color: 'var(--text-strong)' }}>{value}</strong></Card>)}
      </div>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: 16, borderBottom: '1px solid var(--border)' }}>
          <strong>Plan profitability</strong>
          {adminRole !== 'support_readonly' && <div style={{ display: 'flex', gap: 7 }}>
            <Button size="sm" variant="ghost" onClick={() => exportCsv('user_profitability')}>Users CSV</Button>
            <Button size="sm" variant="ghost" onClick={() => exportCsv('plan_profitability')}>Plans CSV</Button>
            <Button size="sm" variant="ghost" onClick={() => exportCsv('attempts')}>Attempts CSV</Button>
            <Button size="sm" variant="ghost" onClick={() => exportCsv('payments')}>Payments CSV</Button>
          </div>}
        </div>
        <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{['Plan', 'Subscribers', 'Net revenue', 'Provider cost', 'Margin', 'Attempts', 'Retries', 'Failures'].map(value => <th key={value} style={HEAD}>{value}</th>)}</tr></thead>
          <tbody>{(data?.plans || []).map(row => {
            const plan = row.billing_plan_versions?.billing_plans;
            const cost = Number(row.actual_provider_cost_micros || 0) + Number(row.estimated_provider_cost_micros || 0) + Number(row.storage_cost_micros || 0);
            return <tr key={row.plan_version_id}><td style={CELL}>{plan?.display_name || plan?.plan_key || row.plan_version_id}</td><td style={CELL}>{row.active_subscriptions}</td><td style={CELL}>{money(row.net_revenue_micros)}</td><td style={CELL}>{money(cost)}</td><td style={CELL}>{money(row.gross_margin_micros)}</td><td style={CELL}>{row.attempts}</td><td style={CELL}>{row.retries}</td><td style={CELL}>{row.failures}</td></tr>;
          })}</tbody>
        </table></div>
      </Card>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: 16, borderBottom: '1px solid var(--border)' }}><strong>Open alerts</strong></div>
        {(data?.alerts || []).length ? data.alerts.map(alert => <div key={alert.id} style={{ padding: 14, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', gap: 12 }}><div><strong>{alert.title}</strong><div style={{ font: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>{alert.severity} · {new Date(alert.detected_at).toLocaleString()}</div></div>{adminRole !== 'support_readonly' && <Button size="sm" variant="ghost" onClick={async () => { await adminTelemetryRequest('acknowledge_alert', { alertId: alert.id }); await load(); }}>Acknowledge</Button>}</div>) : <div style={{ padding: 18, color: 'var(--text-muted)' }}>No open cost or margin alerts.</div>}
      </Card>
    </div>
  );
}
