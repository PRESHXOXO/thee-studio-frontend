import React from 'react';
import { Button } from '../components/core/Button.jsx';
import { Icon } from '../components/core/Icon.jsx';
import { Card } from '../components/surfaces/Card.jsx';
import { EmptyState } from '../components/feedback/EmptyState.jsx';
import { useProduction } from '../context/ProductionContext.jsx';
import { MAX_GENERATION_ATTEMPTS } from '../production/PipelineService.js';

const terminal = status => ['succeeded', 'failed', 'cancelled'].includes(status);

function JobProgress({ run }) {
  const explicit = Number(run.progress || 0);
  const progress = run.status === 'succeeded' ? 100 : explicit;
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ height: 5, borderRadius: 999, overflow: 'hidden', background: 'var(--cream-deep)' }}>
        <div style={{
          height: '100%',
          width: `${Math.max(progress, run.status === 'running' ? 12 : 0)}%`,
          borderRadius: 999,
          background: run.status === 'failed' ? 'var(--cherry)' : 'var(--grad-coral)',
          transition: 'width .4s ease',
          animation: run.status === 'running' && explicit < 10 ? 'status-pulse 1.4s ease-in-out infinite' : 'none',
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, font: 'var(--text-xs)', color: 'var(--text-faint)' }}>
        <span>{run.status === 'running' ? 'Processing safely in the background' : run.error_message || run.status}</span>
        <span>{progress}%</span>
      </div>
    </div>
  );
}

export function ProductionRuns() {
  const { repository, pipeline, refreshUsage } = useProduction();
  const [history, setHistory] = React.useState({ runs: [], events: [] });
  const [open, setOpen] = React.useState(null);
  const [busy, setBusy] = React.useState(null);
  const [error, setError] = React.useState('');

  const load = React.useCallback(async () => {
    try {
      await repository.recoverInterruptedRuns?.();
      setHistory(await repository.listRunHistory());
      setError('');
      await refreshUsage();
    } catch (caught) {
      setError(caught.message || 'Unable to load generation jobs.');
    }
  }, [repository, refreshUsage]);

  React.useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 3000);
    return () => window.clearInterval(timer);
  }, [load]);

  const act = async (run, action) => {
    setBusy(run.id); setError('');
    try { await action(); await load(); }
    catch (caught) { setError(caught.message || 'Job action failed.'); }
    finally { setBusy(null); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 'var(--content-max)', margin: '0 auto' }}>
      <div>
        <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--accent-deep)', marginBottom: 9 }}>Reliable generation queue</div>
        <h1 style={{ font: 'var(--display-lg)', margin: '0 0 8px', color: 'var(--text-strong)' }}>Jobs</h1>
        <p style={{ font: 'var(--text-lg)', color: 'var(--text-muted)', margin: 0 }}>Track progress, recover interrupted work, cancel active jobs, and retry failures.</p>
      </div>
      {error && <Card variant="rose"><div role="alert" style={{ color: 'var(--cherry)' }}>{error}</div></Card>}
      {history.runs.length ? history.runs.map(run => (
        <Card key={run.id} style={{ padding: 0, overflow: 'hidden' }}>
          <div role="button" tabIndex={0} onClick={() => setOpen(open === run.id ? null : run.id)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') setOpen(open === run.id ? null : run.id); }} style={{ width: '100%', border: 0, background: 'transparent', display: 'grid', gridTemplateColumns: '40px 1fr auto 20px', gap: 12, alignItems: 'center', padding: 16, textAlign: 'left', cursor: 'pointer', color: 'var(--text-body)', boxSizing: 'border-box' }}>
            <span style={{ width: 36, height: 36, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'var(--accent-indigo-soft)', color: 'var(--accent-indigo)' }}><Icon name="activity" size={17} /></span>
            <span>
              <strong style={{ display: 'block', textTransform: 'capitalize' }}>{run.operation.replaceAll('_', ' ')}</strong>
              <small style={{ color: 'var(--text-muted)' }}>{new Date(run.created_at).toLocaleString()} · attempt {run.attempt || 1}</small>
              <JobProgress run={run} />
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              {['queued', 'running'].includes(run.status) && <Button variant="ghost" size="sm" loading={busy === run.id} onClick={event => { event.stopPropagation(); void act(run, () => repository.cancelProviderRun(run.id)); }}>Cancel</Button>}
              {['failed', 'cancelled'].includes(run.status) && Number(run.attempt || 1) < MAX_GENERATION_ATTEMPTS && <Button variant="secondary" size="sm" loading={busy === run.id} onClick={event => { event.stopPropagation(); void act(run, () => pipeline.retryRun(run)); }}>Retry</Button>}
              {['failed', 'cancelled'].includes(run.status) && Number(run.attempt || 1) >= MAX_GENERATION_ATTEMPTS && <span title="Configured retry maximum reached" style={{ font: 'var(--text-xs)', color: 'var(--text-faint)' }}>Retry limit</span>}
              <span style={{ textTransform: 'capitalize', font: 'var(--text-xs)', color: terminal(run.status) ? 'var(--text-muted)' : 'var(--accent-deep)' }}>{run.status}</span>
            </span>
            <Icon name="chevron-down" size={16} style={{ transform: open === run.id ? 'rotate(180deg)' : 'none' }} />
          </div>
          {open === run.id && (
            <div style={{ borderTop: '1px solid var(--border)', padding: '8px 20px 16px' }}>
              {history.events.filter(event => event.provider_run_id === run.id).map(event => (
                <div key={event.id} style={{ display: 'grid', gridTemplateColumns: '10px 1fr', gap: 10, paddingTop: 10 }}>
                  <span style={{ width: 6, height: 6, marginTop: 5, borderRadius: '50%', background: 'var(--accent-indigo)' }} />
                  <div>
                    <strong style={{ font: '600 var(--text-xs)', textTransform: 'capitalize' }}>{event.event_type}</strong>
                    <p style={{ margin: '3px 0', font: 'var(--text-xs)', color: 'var(--text-muted)' }}>{event.message}</p>
                    <small style={{ color: 'var(--text-faint)' }}>{new Date(event.created_at).toLocaleString()}</small>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )) : <Card><EmptyState icon="activity" title="No generation jobs yet" body="Image, video, and export work will appear here with progress and recovery controls." /></Card>}
    </div>
  );
}
