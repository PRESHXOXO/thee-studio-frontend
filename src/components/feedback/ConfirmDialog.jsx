import React from 'react';
import { Button } from '../core/Button.jsx';
import { Icon } from '../core/Icon.jsx';

export function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', onConfirm, onCancel }) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(30, 12, 8, 0.45)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--white)', borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-xl)', padding: '28px 28px 24px',
          maxWidth: 380, width: '100%',
          display: 'flex', flexDirection: 'column', gap: 20,
          animation: 'dialog-in 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {/* Icon + title */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 'var(--radius-md)', flexShrink: 0,
            background: 'var(--status-warn-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--status-warn)',
          }}>
            <Icon name="trash-2" size={18} strokeWidth={2} />
          </div>
          <div>
            <div style={{ font: '700 1rem/1.2 var(--font-ui)', color: 'var(--text-strong)', marginBottom: 6 }}>
              {title}
            </div>
            <div style={{ font: 'var(--text-sm)', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              {message}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
          <Button
            size="sm"
            onClick={onConfirm}
            style={{ background: 'var(--status-warn)', boxShadow: 'none', border: '1px solid transparent', color: '#fff' }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
