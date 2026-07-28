import React from 'react';
import { Icon } from '../core/Icon.jsx';

// Full-screen, distraction-free review — one image at a time, same
// approve/needs-fix/reject vocabulary as the grid, arrow keys to move.
export function LibraryFocusMode({ entries, index, onIndexChange, onSetStatus, onDownload, onClose }) {
  const entry = entries[index];

  React.useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); onIndexChange(Math.min(index + 1, entries.length - 1)); return; }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); onIndexChange(Math.max(index - 1, 0)); return; }
      const key = e.key.toLowerCase();
      if (!entry) return;
      if (key === 'a') onSetStatus(entry.id, entry.status === 'approved' ? 'unreviewed' : 'approved');
      else if (key === 'f') onSetStatus(entry.id, entry.status === 'needs_fix' ? 'unreviewed' : 'needs_fix');
      else if (key === 'r') onSetStatus(entry.id, entry.status === 'rejected' ? 'unreviewed' : 'rejected');
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [index, entries.length, entry, onIndexChange, onSetStatus, onClose]);

  if (!entry) return null;

  const actions = [
    { status: 'approved',  icon: 'check',  label: 'Approve',   key: 'A' },
    { status: 'needs_fix', icon: 'wrench', label: 'Needs Fix', key: 'F' },
    { status: 'rejected',  icon: 'x',      label: 'Reject',    key: 'R' },
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(8,6,16,0.94)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32,
    }}>
      <button
        onClick={onClose}
        title="Close (Esc)"
        style={{
          position: 'absolute', top: 20, right: 24, width: 38, height: 38, borderRadius: '50%',
          background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
        }}
      >
        <Icon name="x" size={18} />
      </button>

      <div style={{ position: 'absolute', top: 24, left: 28, font: '600 0.8rem/1 var(--font-ui)', color: 'rgba(255,255,255,0.6)' }}>
        {index + 1} / {entries.length}
      </div>

      <button
        onClick={() => onIndexChange(Math.max(index - 1, 0))}
        disabled={index === 0}
        title="Previous (←)"
        style={{
          position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)',
          width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.16)', color: '#fff', cursor: index === 0 ? 'default' : 'pointer',
          opacity: index === 0 ? 0.35 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Icon name="chevron-left" size={22} />
      </button>
      <button
        onClick={() => onIndexChange(Math.min(index + 1, entries.length - 1))}
        disabled={index === entries.length - 1}
        title="Next (→)"
        style={{
          position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)',
          width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.16)', color: '#fff', cursor: index === entries.length - 1 ? 'default' : 'pointer',
          opacity: index === entries.length - 1 ? 0.35 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Icon name="chevron-right" size={22} />
      </button>

      <img
        src={entry.url}
        alt={entry.prompt?.slice(0, 80) || 'Generated'}
        style={{ maxWidth: 'min(560px, 78vw)', maxHeight: '68vh', objectFit: 'contain', borderRadius: 'var(--radius-lg)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
      />

      <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
        <button
          onClick={() => onDownload(entry)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 'var(--radius-pill)',
            cursor: 'pointer', font: '600 0.85rem/1 var(--font-ui)', fontFamily: 'inherit',
            background: 'rgba(255,255,255,0.95)', color: '#101014',
            border: '1px solid rgba(255,255,255,0.2)',
          }}
        >
          <Icon name="download" size={14} /> Download Original
        </button>
        {actions.map(a => {
          const active = entry.status === a.status;
          return (
            <button
              key={a.status}
              onClick={() => onSetStatus(entry.id, active ? 'unreviewed' : a.status)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 'var(--radius-pill)',
                cursor: 'pointer', font: '600 0.85rem/1 var(--font-ui)', fontFamily: 'inherit',
                background: active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.08)',
                color: active ? '#101014' : '#fff',
                border: '1px solid rgba(255,255,255,0.18)',
              }}
            >
              <Icon name={a.icon} size={14} strokeWidth={2.25} /> {a.label}
              <span style={{ font: '500 0.68rem/1 var(--font-mono)', opacity: 0.6 }}>{a.key}</span>
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 14, font: 'var(--text-xs)', color: 'rgba(255,255,255,0.4)' }}>
        ← → navigate · A approve · F needs fix · R reject · Esc close
      </div>
    </div>
  );
}
