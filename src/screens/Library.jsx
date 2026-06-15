import React from 'react';
import { PageHeader } from '../components/navigation/PageHeader.jsx';
import { EmptyState } from '../components/feedback/EmptyState.jsx';
import { Button } from '../components/core/Button.jsx';
import { Icon } from '../components/core/Icon.jsx';
import { loadLibrary, deleteFromLibrary } from '../lib/library.js';

const SOURCE_LABELS = {
  generator:   { label: 'Image Generator', icon: 'image' },
  quick_shoot: { label: 'Quick Shoot',     icon: 'zap' },
};

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function LibraryCard({ entry, onDelete }) {
  const [hovered, setHovered] = React.useState(false);
  const source = SOURCE_LABELS[entry.source] || { label: 'Generated', icon: 'image' };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ display: 'flex', flexDirection: 'column', gap: 8, position: 'relative' }}
    >
      <div style={{
        borderRadius: 'var(--radius-xl)', overflow: 'hidden',
        border: '1px solid var(--border)',
        boxShadow: hovered ? 'var(--shadow-md)' : 'var(--shadow-xs)',
        transition: 'box-shadow var(--t-base)',
        background: 'var(--grad-portrait)',
        position: 'relative',
        aspectRatio: '3/4',
      }}>
        <img
          src={entry.url}
          alt="Generated"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />

        {/* Action overlay */}
        {hovered && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 50%)',
            display: 'flex', alignItems: 'flex-end', padding: 10, gap: 6,
          }}>
            <a
              href={entry.url}
              download={`thee-studio-${entry.id}.jpg`}
              style={{ flex: 1, textDecoration: 'none' }}
            >
              <button style={{
                width: '100%', padding: '6px 0', borderRadius: 'var(--radius-md)',
                background: 'rgba(255,255,255,0.92)', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                font: '500 0.75rem/1 var(--font-ui)', color: 'var(--text-strong)',
              }}>
                <Icon name="download" size={12} /> Download
              </button>
            </a>
            <button
              onClick={() => onDelete(entry.id)}
              style={{
                width: 30, height: 30, borderRadius: 'var(--radius-md)', flexShrink: 0,
                background: 'rgba(255,255,255,0.92)', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--cherry)',
              }}
            >
              <Icon name="trash-2" size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Meta */}
      <div style={{ paddingLeft: 2 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          font: '500 0.72rem/1 var(--font-ui)', color: 'var(--accent-deep)', marginBottom: 3,
        }}>
          <Icon name={source.icon} size={11} strokeWidth={2} />
          {source.label}
          {entry.character && ` · ${entry.character}`}
        </div>
        <div style={{ font: 'var(--text-xs)', color: 'var(--text-faint)' }}>
          {formatDate(entry.savedAt)}
          {entry.engine && ` · ${entry.engine}`}
        </div>
        {entry.prompt && (
          <div style={{
            font: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 3,
            overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}>
            {entry.prompt}
          </div>
        )}
      </div>
    </div>
  );
}

export function Library() {
  const [library, setLibrary] = React.useState(loadLibrary);

  const handleDelete = (id) => {
    deleteFromLibrary(id);
    setLibrary(prev => prev.filter(e => e.id !== id));
  };

  const handleClearAll = () => {
    if (!window.confirm('Clear all saved images? This cannot be undone.')) return;
    localStorage.removeItem('ts_library');
    setLibrary([]);
  };

  // Reload from storage when window regains focus (other tabs may have saved)
  React.useEffect(() => {
    const onFocus = () => setLibrary(loadLibrary());
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 'var(--content-max)', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
        <div>
          <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--accent-deep)', marginBottom: 10 }}>Library</div>
          <h1 style={{ font: 'var(--display-lg)', color: 'var(--text-strong)', letterSpacing: '-0.015em', margin: '0 0 10px' }}>
            Library
            {library.length > 0 && (
              <span style={{ font: '400 1rem/1 var(--font-ui)', color: 'var(--text-faint)', marginLeft: 12 }}>
                {library.length} image{library.length !== 1 ? 's' : ''}
              </span>
            )}
          </h1>
          <p style={{ font: 'var(--text-lg)', color: 'var(--text-muted)', margin: 0, maxWidth: 480 }}>
            Every image you generate, saved automatically.
          </p>
        </div>
        {library.length > 0 && (
          <Button variant="secondary" onClick={handleClearAll}>
            <Icon name="trash-2" size={14} /> Clear All
          </Button>
        )}
      </div>

      {library.length === 0 ? (
        <EmptyState
          icon="images"
          title="Library is empty"
          body="Generated images are saved here automatically. Head to the Image Generator or Quick Shoot to create your first image."
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 20 }}>
          {library.map(entry => (
            <LibraryCard key={entry.id} entry={entry} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
