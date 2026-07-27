import React from 'react';
import { Button } from '../components/core/Button.jsx';
import { Icon } from '../components/core/Icon.jsx';
import { Card } from '../components/surfaces/Card.jsx';
import { EmptyState } from '../components/feedback/EmptyState.jsx';
import { useProduction } from '../context/ProductionContext.jsx';

export function ProductionExports() {
  const { repository } = useProduction();
  const [jobs, setJobs] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const load = React.useCallback(async () => {
    setLoading(true);
    try { setJobs(await repository.listExports()); setError(''); }
    catch (caught) { setError(caught.message || 'Unable to load exports.'); }
    finally { setLoading(false); }
  }, [repository]);
  React.useEffect(() => { load(); }, [load]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 'var(--content-max)', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}><div><div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--accent-deep)', marginBottom: 9 }}>Delivery desk</div><h1 style={{ font: 'var(--display-lg)', margin: '0 0 8px', color: 'var(--text-strong)' }}>Exports</h1><p style={{ font: 'var(--text-lg)', color: 'var(--text-muted)', margin: 0 }}>Approved stills and clips with source metadata preserved.</p></div><Button variant="secondary" onClick={load}>Refresh</Button></div>
      {error && <Card variant="rose"><div role="alert" style={{ color: 'var(--cherry)' }}>{error}</div></Card>}
      {loading ? <EmptyState icon="loader" title="Loading exports…" /> : jobs.length ? <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr .6fr .8fr .8fr 50px', gap: 14, padding: '11px 18px', background: 'var(--cream-deep)', font: 'var(--label)', textTransform: 'uppercase', color: 'var(--text-faint)' }}><span>Asset</span><span>Format</span><span>Created</span><span>Status</span><span /></div>
        {jobs.map(job => <div key={job.id} style={{ display: 'grid', gridTemplateColumns: '2fr .6fr .8fr .8fr 50px', gap: 14, alignItems: 'center', padding: '14px 18px', borderTop: '1px solid var(--border)', font: 'var(--text-sm)' }}><div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><span style={{ width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'var(--accent-indigo-soft)', color: 'var(--accent-indigo)' }}><Icon name={job.asset_type.includes('clip') ? 'film' : 'image'} size={16} /></span><span style={{ textTransform: 'capitalize' }}>{job.asset_type.replaceAll('_', ' ')}</span></div><span>{job.aspect_ratio}</span><span>{new Date(job.created_at).toLocaleDateString()}</span><span style={{ textTransform: 'capitalize' }}>{job.status}</span><span>{job.status === 'ready' && job.signed_url ? <a href={job.signed_url} download target="_blank" rel="noreferrer" style={{ color: 'var(--accent-indigo)' }}><Icon name="download" /></a> : '—'}</span></div>)}
      </Card> : <Card><EmptyState icon="download" title="Nothing ready for delivery" body="Choose a hero still or complete a clip inside a campaign, then prepare it for export." /></Card>}
    </div>
  );
}
