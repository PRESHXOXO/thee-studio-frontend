import React from 'react';
import { EmptyState } from '../components/feedback/EmptyState.jsx';
import { Button } from '../components/core/Button.jsx';
import { Icon } from '../components/core/Icon.jsx';
import { ConfirmDialog } from '../components/feedback/ConfirmDialog.jsx';
import { loadLibrary, deleteFromLibrary, updateLibraryEntry } from '../lib/library.js';

const SOURCE_LABELS = {
  generator:   { label: 'Creator Builder', icon: 'image' },
  quick_shoot: { label: 'Quick Shoot',     icon: 'zap' },
  scene_flow:  { label: 'Scene Flow',      icon: 'message-circle' },
};

// Review states — the production queue for generated media.
const STATUS_META = {
  unreviewed: { label: 'Needs Review', icon: 'eye',          color: 'var(--cobalt)',        bg: 'var(--cobalt-soft)' },
  approved:   { label: 'Approved',     icon: 'check-circle',  color: 'var(--status-ready)',  bg: 'var(--status-ready-bg)' },
  needs_fix:  { label: 'Needs Fix',    icon: 'wrench',        color: 'var(--status-warn)',   bg: 'var(--status-warn-bg)' },
  rejected:   { label: 'Rejected',     icon: 'x-circle',      color: 'var(--cherry)',        bg: 'var(--status-locked-bg)' },
};

const FILTERS = [
  { id: 'all',        label: 'All' },
  { id: 'unreviewed', label: 'Needs Review' },
  { id: 'approved',   label: 'Approved' },
  { id: 'needs_fix',  label: 'Needs Fix' },
  { id: 'rejected',   label: 'Rejected' },
];

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.unreviewed;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      font: '600 0.6875rem/1 var(--font-ui)', color: meta.color, background: meta.bg,
      padding: '4px 9px', borderRadius: 'var(--radius-pill)', border: `1px solid ${meta.color}33`,
    }}>
      <Icon name={meta.icon} size={11} strokeWidth={2.25} />
      {meta.label}
    </span>
  );
}

function ReviewActions({ entry, onSetStatus }) {
  const actions = [
    { status: 'approved',  icon: 'check', title: 'Approve' },
    { status: 'needs_fix', icon: 'wrench', title: 'Needs fix' },
    { status: 'rejected',  icon: 'x', title: 'Reject' },
  ];
  return (
    <div style={{ display: 'flex', gap: 5 }}>
      {actions.map(a => {
        const active = entry.status === a.status;
        const meta = STATUS_META[a.status];
        return (
          <button
            key={a.status}
            title={a.title}
            aria-label={a.title}
            onClick={(e) => { e.stopPropagation(); onSetStatus(entry.id, active ? 'unreviewed' : a.status); }}
            style={{
              width: 30, height: 30, borderRadius: 'var(--radius-md)', cursor: 'pointer',
              background: active ? meta.bg : 'rgba(10,10,13,0.72)',
              border: `1px solid ${active ? meta.color : 'rgba(255,255,255,0.14)'}`,
              color: active ? meta.color : 'rgba(255,255,255,0.85)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all var(--t-fast)',
            }}
          >
            <Icon name={a.icon} size={14} strokeWidth={2.25} />
          </button>
        );
      })}
    </div>
  );
}

function LibraryCard({ entry, onDelete, onSetStatus, onSaveNote }) {
  const [hovered, setHovered] = React.useState(false);
  const [noteOpen, setNoteOpen] = React.useState(false);
  const [note, setNote] = React.useState(entry.note || '');
  const source = SOURCE_LABELS[entry.source] || { label: 'Generated', icon: 'image' };
  const status = entry.status || 'unreviewed';

  const commitNote = () => {
    onSaveNote(entry.id, note.trim());
    setNoteOpen(false);
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ display: 'flex', flexDirection: 'column', gap: 8, position: 'relative' }}
    >
      <div style={{
        borderRadius: 'var(--radius-xl)', overflow: 'hidden',
        border: `1px solid ${status === 'approved' ? 'rgba(59,201,138,0.45)' : 'var(--border)'}`,
        boxShadow: hovered ? 'var(--shadow-md)' : 'var(--shadow-xs)',
        transition: 'box-shadow var(--t-base), border-color var(--t-base)',
        background: 'var(--grad-portrait)',
        position: 'relative',
        aspectRatio: '3/4',
      }}>
        <img
          src={entry.url}
          alt={entry.prompt ? entry.prompt.slice(0, 80) : 'Generated image'}
          style={{
            width: '100%', height: '100%', objectFit: 'cover', display: 'block',
            opacity: status === 'rejected' ? 0.45 : 1, transition: 'opacity var(--t-base)',
          }}
        />

        {/* Status badge — always visible */}
        <div style={{ position: 'absolute', top: 10, left: 10 }}>
          <StatusBadge status={status} />
        </div>

        {/* Action overlay */}
        {hovered && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 45%)',
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 10, gap: 8,
          }}>
            <ReviewActions entry={{ ...entry, status }} onSetStatus={onSetStatus} />
            <div style={{ display: 'flex', gap: 6 }}>
              <a href={entry.url} download={`thee-studio-${entry.id}.jpg`} style={{ flex: 1, textDecoration: 'none' }}>
                <button style={{
                  width: '100%', padding: '7px 0', borderRadius: 'var(--radius-md)',
                  background: 'rgba(255,255,255,0.92)', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  font: '500 0.75rem/1 var(--font-ui)', color: '#101014',
                }}>
                  <Icon name="download" size={12} /> Download
                </button>
              </a>
              <button
                title="Add note"
                onClick={() => setNoteOpen(o => !o)}
                style={{
                  width: 30, height: 30, borderRadius: 'var(--radius-md)', flexShrink: 0,
                  background: entry.note ? 'var(--accent-gold)' : 'rgba(255,255,255,0.92)',
                  border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#101014',
                }}
              >
                <Icon name="pencil" size={13} />
              </button>
              <button
                title="Delete"
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
          </div>
        )}
      </div>

      {/* Note editor */}
      {noteOpen && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Quality notes — what to fix, what works..."
            rows={2}
            autoFocus
            style={{
              width: '100%', boxSizing: 'border-box', resize: 'vertical',
              background: 'var(--surface-inset)', color: 'var(--text-body)',
              border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)',
              padding: '8px 10px', font: 'var(--text-sm)', fontFamily: 'inherit', outline: 'none',
            }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            <Button variant="primary" size="sm" onClick={commitNote}>Save note</Button>
            <Button variant="ghost" size="sm" onClick={() => setNoteOpen(false)}>Cancel</Button>
          </div>
        </div>
      )}

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
        {entry.note && !noteOpen && (
          <div style={{
            font: 'var(--text-xs)', color: 'var(--accent-gold)', marginTop: 3,
            display: 'flex', alignItems: 'flex-start', gap: 4,
          }}>
            <Icon name="sticky-note" size={11} style={{ marginTop: 1, flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{entry.note}</span>
          </div>
        )}
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
  const [confirm, setConfirm] = React.useState(null);
  const [filter, setFilter] = React.useState('all');

  const counts = React.useMemo(() => {
    const c = { all: library.length, unreviewed: 0, approved: 0, needs_fix: 0, rejected: 0 };
    for (const e of library) c[e.status || 'unreviewed'] = (c[e.status || 'unreviewed'] || 0) + 1;
    return c;
  }, [library]);

  const visible = filter === 'all'
    ? library
    : library.filter(e => (e.status || 'unreviewed') === filter);

  const handleSetStatus = (id, status) => {
    updateLibraryEntry(id, { status });
    setLibrary(prev => prev.map(e => (e.id === id ? { ...e, status } : e)));
  };

  const handleSaveNote = (id, note) => {
    updateLibraryEntry(id, { note });
    setLibrary(prev => prev.map(e => (e.id === id ? { ...e, note } : e)));
  };

  const handleDelete = (id) => {
    setConfirm({
      title: 'Delete Image?',
      message: 'This image will be permanently removed from your library.',
      onConfirm: () => {
        deleteFromLibrary(id);
        setLibrary(prev => prev.filter(e => e.id !== id));
        setConfirm(null);
      },
    });
  };

  const handleClearAll = () => {
    setConfirm({
      title: 'Clear Entire Library?',
      message: 'All saved images will be permanently removed. This cannot be undone.',
      confirmLabel: 'Clear All',
      onConfirm: () => {
        localStorage.removeItem('ts_library');
        setLibrary([]);
        setConfirm(null);
      },
    });
  };

  // Reload from storage when window regains focus (other tabs may have saved)
  React.useEffect(() => {
    const onFocus = () => setLibrary(loadLibrary());
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 'var(--content-max)', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
        <div>
          <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--accent-deep)', marginBottom: 10 }}>Media Review</div>
          <h1 style={{ font: 'var(--display-lg)', color: 'var(--text-strong)', letterSpacing: '-0.015em', margin: '0 0 10px' }}>
            Library
            {library.length > 0 && (
              <span style={{ font: '400 1rem/1 var(--font-ui)', color: 'var(--text-faint)', marginLeft: 12 }}>
                {library.length} image{library.length !== 1 ? 's' : ''}
              </span>
            )}
          </h1>
          <p style={{ font: 'var(--text-lg)', color: 'var(--text-muted)', margin: 0, maxWidth: 520 }}>
            Review drafts, approve keepers, flag fixes. Approved media is ready for publishing prep.
          </p>
        </div>
        {library.length > 0 && (
          <Button variant="secondary" onClick={handleClearAll}>
            <Icon name="trash-2" size={14} /> Clear All
          </Button>
        )}
      </div>

      {/* Review filter bar */}
      {library.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {FILTERS.map(f => {
            const on = filter === f.id;
            const meta = f.id !== 'all' ? STATUS_META[f.id] : null;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 'var(--radius-pill)', cursor: 'pointer',
                  font: `${on ? 600 : 500} 0.8125rem/1 var(--font-ui)`,
                  color: on ? (meta ? meta.color : 'var(--accent-deep)') : 'var(--text-muted)',
                  background: on ? (meta ? meta.bg : 'var(--rose-deep)') : 'var(--surface-card)',
                  border: `1px solid ${on ? (meta ? `${meta.color}55` : 'var(--border-strong)') : 'var(--border)'}`,
                  transition: 'all var(--t-fast)',
                }}
              >
                {meta && <Icon name={meta.icon} size={12} strokeWidth={2.25} />}
                {f.label}
                <span style={{ font: '600 0.6875rem/1 var(--font-mono)', opacity: 0.75 }}>{counts[f.id] ?? 0}</span>
              </button>
            );
          })}
        </div>
      )}

      {library.length === 0 ? (
        <EmptyState
          icon="images"
          title="Library is empty"
          body="Generated images are saved here automatically. Head to the Creator Builder or Quick Shoot to create your first image."
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={STATUS_META[filter]?.icon || 'filter'}
          title={`Nothing in ${FILTERS.find(f => f.id === filter)?.label ?? 'this filter'}`}
          body="Hover any image and use the review buttons to move it into this stage."
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 20 }}>
          {visible.map(entry => (
            <LibraryCard
              key={entry.id}
              entry={entry}
              onDelete={handleDelete}
              onSetStatus={handleSetStatus}
              onSaveNote={handleSaveNote}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel || 'Delete'}
        onConfirm={confirm?.onConfirm}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
