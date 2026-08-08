import React from 'react';
import { EmptyState } from '../components/feedback/EmptyState.jsx';
import { Button } from '../components/core/Button.jsx';
import { Icon } from '../components/core/Icon.jsx';
import { ImageLightbox } from '../components/feedback/ImageLightbox.jsx';
import { loadLibrary } from '../lib/library.js';
import { loadCharacters } from '../lib/creatorCache.js';
import { useAuth } from '../context/AuthContext.jsx';

// History is a chronological read of the same generations Library tracks —
// Library is the review/status workspace, this is the "what did I make and
// when" timeline, with a re-run action per entry. No destructive controls
// here (delete/status live on Library) to avoid two screens fighting over
// the same records.
const SOURCE_LABELS = {
  generator:    'New Creator',
  quick_shoot:  'Quick Shoot',
  scene_flow:   'Scene Flow',
  prompt_lab:   'Describe It',
  director:     'Thee Director',
};

function loadCharacterNames() {
  return new Map(loadCharacters().map(c => [String(c.id), c.name]));
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function HistoryCard({ entry, creatorName, onRerun, onOpenImage }) {
  const [expanded, setExpanded] = React.useState(false);
  const sourceLabel = SOURCE_LABELS[entry.source] || 'Generated';

  return (
    <div style={{
      display: 'flex', gap: 14, padding: 12, borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border)', background: 'var(--surface-raised)',
    }}>
      <div
        onClick={() => onOpenImage(entry.url)}
        style={{
          width: 76, height: 101, flexShrink: 0, borderRadius: 'var(--radius-md)', overflow: 'hidden',
          border: '1px solid var(--border)', cursor: 'zoom-in', background: 'var(--grad-portrait)',
        }}
      >
        {entry.url && <img src={entry.url} alt={entry.prompt?.slice(0, 60) || 'Generated'} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
      </div>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
          {creatorName && (
            <span style={{ font: '600 0.78rem/1 var(--font-ui)', color: 'var(--text-strong)' }}>{creatorName}</span>
          )}
          {entry.scene && (
            <span style={{ font: '500 0.72rem/1 var(--font-ui)', color: 'var(--accent-deep)', background: 'var(--rose-glass)', padding: '2px 8px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border)' }}>
              {entry.scene}
            </span>
          )}
          {entry.campaign && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, font: '500 0.72rem/1 var(--font-ui)', color: 'var(--text-faint)' }}>
              <Icon name="megaphone" size={11} strokeWidth={2} /> Campaign
            </span>
          )}
          <span style={{ font: '500 0.72rem/1 var(--font-ui)', color: 'var(--text-faint)' }}>· {sourceLabel}</span>
        </div>

        {entry.prompt && (
          <div
            onClick={() => setExpanded(e => !e)}
            style={{
              font: 'var(--text-sm)', color: 'var(--text-muted)', lineHeight: 1.45, cursor: 'pointer',
              overflow: 'hidden', display: '-webkit-box',
              WebkitLineClamp: expanded ? 'unset' : 1, WebkitBoxOrient: 'vertical',
            }}
          >
            {entry.prompt}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 'auto' }}>
          <span style={{ font: 'var(--text-xs)', color: 'var(--text-faint)' }}>{formatDate(entry.savedAt)}</span>
          <Button variant="secondary" size="sm" onClick={() => onRerun(entry)} style={{ fontSize: '0.75rem', flexShrink: 0 }}>
            <Icon name="refresh-cw" size={12} /> Re-run
          </Button>
        </div>
      </div>
    </div>
  );
}

export function History({ onNav }) {
  const { session } = useAuth();
  const [library, setLibrary] = React.useState(loadLibrary);
  const [lightboxSrc, setLightboxSrc] = React.useState(null);
  // Depends on session id too so switching accounts refreshes creator names
  // from the (already account-scoped) cache, not just when library changes.
  const characterNames = React.useMemo(loadCharacterNames, [library, session?.id]);

  React.useEffect(() => {
    const onFocus = () => setLibrary(loadLibrary());
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const handleRerun = (entry) => {
    // entry.character may be a numeric (Cast-saved) or string (wizard-saved)
    // id — pass it through as-is so the creator is actually pre-selected in
    // Thee Director. Dropping string ids left Guided on its "pick a creator"
    // gate, which hid the pre-filled prompt and read as a blank form.
    onNav?.('director', {
      vision: entry.prompt || '',
      scene: entry.scene || 'None',
      creatorId: entry.character ?? null,
      campaignId: entry.campaign ?? null,
      mode: entry.settings?.workflow || (
        entry.source === 'prompt_lab' ? 'describe'
          : entry.source === 'scene_flow' ? 'talk'
            : 'guided'
      ),
      settings: entry.settings || null,
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 'var(--content-max)', margin: '0 auto' }}>
      <div>
        <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--accent-deep)', marginBottom: 10 }}>History</div>
        <h1 style={{ font: 'var(--display-lg)', color: 'var(--text-strong)', letterSpacing: '-0.015em', margin: '0 0 10px' }}>
          History
          {library.length > 0 && (
            <span style={{ font: '400 1rem/1 var(--font-ui)', color: 'var(--text-faint)', marginLeft: 12 }}>
              {library.length} generation{library.length !== 1 ? 's' : ''}
            </span>
          )}
        </h1>
        <p style={{ font: 'var(--text-lg)', color: 'var(--text-muted)', margin: 0, maxWidth: 480 }}>
          Every image you've generated, in order. Re-run any of them from where you left off.
        </p>
      </div>

      {library.length === 0 ? (
        <EmptyState
          icon="clock"
          title="No generations yet"
          body="Every image you generate — from New Creator, Quick Shoot, or Thee Director — shows up here automatically."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {library.map(entry => (
            <HistoryCard
              key={entry.id}
              entry={entry}
              creatorName={characterNames.get(String(entry.character)) || null}
              onRerun={handleRerun}
              onOpenImage={setLightboxSrc}
            />
          ))}
        </div>
      )}

      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </div>
  );
}
