import React from 'react';
import { PageHeader } from '../components/navigation/PageHeader.jsx';
import { EmptyState } from '../components/feedback/EmptyState.jsx';
import { Button } from '../components/core/Button.jsx';
import { Icon } from '../components/core/Icon.jsx';

function loadHistory() {
  try { return JSON.parse(localStorage.getItem('ts_director_history') || '[]'); } catch { return []; }
}

const MODE_META = {
  openai: { label: 'OpenAI Direct', icon: 'zap',    color: 'var(--accent-deep)' },
  flux:   { label: 'FLUX Direct',   icon: 'flame',   color: '#f97316' },
  ai:     { label: 'AI Refine',     icon: 'wand-2',  color: '#8b5cf6' },
};

function HistoryCard({ entry, onCopy }) {
  const [expanded, setExpanded] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const meta = MODE_META[entry.mode] || MODE_META.openai;

  const handleCopy = () => {
    navigator.clipboard.writeText(entry.positivePrompt).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div style={{
      borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)',
      background: 'var(--surface-raised)', overflow: 'hidden',
    }}>
      <div
        style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 16px', cursor: 'pointer' }}
        onClick={() => setExpanded(e => !e)}
      >
        <div style={{
          width: 32, height: 32, borderRadius: 'var(--radius)', flexShrink: 0,
          background: 'var(--rose-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: meta.color,
        }}>
          <Icon name={meta.icon} size={15} strokeWidth={1.75} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ font: '600 0.8rem/1 var(--font-ui)', color: meta.color }}>{meta.label}</span>
            {entry.character && (
              <span style={{ font: '500 0.75rem/1 var(--font-ui)', color: 'var(--text-muted)', background: 'var(--rose-glass)', padding: '2px 7px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border)' }}>
                {entry.character}
              </span>
            )}
            {entry.recommendedEngine && (
              <span style={{ font: '500 0.72rem/1 var(--font-ui)', color: 'var(--text-faint)' }}>
                · {entry.recommendedEngine}
              </span>
            )}
          </div>
          <div style={{
            font: 'var(--text-sm)', color: 'var(--text-body)', lineHeight: 1.45,
            overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: expanded ? 'unset' : 2, WebkitBoxOrient: 'vertical',
          }}>
            {entry.positivePrompt}
          </div>
          <div style={{ font: 'var(--text-xs)', color: 'var(--text-faint)', marginTop: 6 }}>
            {new Date(entry.savedAt).toLocaleString()}
          </div>
        </div>
        <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={16} style={{ color: 'var(--text-faint)', flexShrink: 0, marginTop: 4 }} />
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {entry.negativePrompt && (
            <div>
              <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 6 }}>Negative Prompt</div>
              <div style={{ font: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.5 }}>{entry.negativePrompt}</div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" onClick={handleCopy} style={{ fontSize: '0.75rem' }}>
              <Icon name={copied ? 'check' : 'copy'} size={13} /> {copied ? 'Copied!' : 'Copy Prompt'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function History({ onNav }) {
  const [history, setHistory] = React.useState(loadHistory);

  const handleClear = () => {
    if (!window.confirm('Clear all prompt history? This cannot be undone.')) return;
    localStorage.removeItem('ts_director_history');
    setHistory([]);
  };

  React.useEffect(() => {
    const onFocus = () => setHistory(loadHistory());
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 'var(--content-max)', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
        <div>
          <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--accent-deep)', marginBottom: 10 }}>History</div>
          <h1 style={{ font: 'var(--display-lg)', color: 'var(--text-strong)', letterSpacing: '-0.015em', margin: '0 0 10px' }}>
            History
            {history.length > 0 && (
              <span style={{ font: '400 1rem/1 var(--font-ui)', color: 'var(--text-faint)', marginLeft: 12 }}>
                {history.length} build{history.length !== 1 ? 's' : ''}
              </span>
            )}
          </h1>
          <p style={{ font: 'var(--text-lg)', color: 'var(--text-muted)', margin: 0, maxWidth: 480 }}>
            Every prompt you've built in Thee Director.
          </p>
        </div>
        {history.length > 0 && (
          <Button variant="secondary" onClick={handleClear}>
            <Icon name="trash-2" size={14} /> Clear History
          </Button>
        )}
      </div>

      {history.length === 0 ? (
        <EmptyState
          icon="clock"
          title="No history yet"
          body="Every prompt you build in Thee Director is saved here automatically."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {history.map(entry => (
            <HistoryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
