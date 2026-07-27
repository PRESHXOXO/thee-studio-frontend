import React from 'react';
import { Icon } from '../components/core/Icon.jsx';
import { Card } from '../components/surfaces/Card.jsx';
import { EmptyState } from '../components/feedback/EmptyState.jsx';
import { useProduction } from '../context/ProductionContext.jsx';

export function ProductionRuns() {
  const { repository } = useProduction();
  const [history, setHistory] = React.useState({ runs: [], events: [] });
  const [open, setOpen] = React.useState(null);
  const [error, setError] = React.useState('');
  React.useEffect(() => {
    repository.listRunHistory().then(setHistory).catch(caught => setError(caught.message || 'Unable to load provider history.'));
  }, [repository]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 'var(--content-max)', margin: '0 auto' }}>
      <div><div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--accent-deep)', marginBottom: 9 }}>Provider observability</div><h1 style={{ font: 'var(--display-lg)', margin: '0 0 8px', color: 'var(--text-strong)' }}>Provider Runs</h1><p style={{ font: 'var(--text-lg)', color: 'var(--text-muted)', margin: 0 }}>Trace every production generation, provider response, failure, and completion event.</p></div>
      {error && <Card variant="rose"><div role="alert" style={{ color: 'var(--cherry)' }}>{error}</div></Card>}
      {history.runs.length ? history.runs.map(run => <Card key={run.id} style={{ padding: 0, overflow: 'hidden' }}><button onClick={() => setOpen(open === run.id ? null : run.id)} style={{ width: '100%', border: 0, background: 'transparent', display: 'grid', gridTemplateColumns: '40px 1fr auto 20px', gap: 12, alignItems: 'center', padding: 16, textAlign: 'left', cursor: 'pointer', color: 'var(--text-body)' }}><span style={{ width: 36, height: 36, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'var(--accent-indigo-soft)', color: 'var(--accent-indigo)' }}><Icon name="activity" size={17} /></span><span><strong style={{ display: 'block', textTransform: 'capitalize' }}>{run.operation.replaceAll('_', ' ')}</strong><small style={{ color: 'var(--text-muted)' }}>{run.provider_type} · {run.provider_key} · {new Date(run.created_at).toLocaleString()}</small></span><span style={{ textTransform: 'capitalize', font: 'var(--text-xs)' }}>{run.status}</span><Icon name="chevron-down" size={16} style={{ transform: open === run.id ? 'rotate(180deg)' : 'none' }} /></button>{open === run.id && <div style={{ borderTop: '1px solid var(--border)', padding: '8px 20px 16px' }}>{history.events.filter(event => event.provider_run_id === run.id).map(event => <div key={event.id} style={{ display: 'grid', gridTemplateColumns: '10px 1fr', gap: 10, paddingTop: 10 }}><span style={{ width: 6, height: 6, marginTop: 5, borderRadius: '50%', background: 'var(--accent-indigo)' }} /><div><strong style={{ font: '600 var(--text-xs)', textTransform: 'capitalize' }}>{event.event_type}</strong><p style={{ margin: '3px 0', font: 'var(--text-xs)', color: 'var(--text-muted)' }}>{event.message}</p><small style={{ color: 'var(--text-faint)' }}>{new Date(event.created_at).toLocaleString()}</small></div></div>)}</div>}</Card>) : <Card><EmptyState icon="activity" title="No provider runs yet" body="Still, clip, and export operations will appear here with their full event history." /></Card>}
    </div>
  );
}
