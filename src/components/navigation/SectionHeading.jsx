import React from 'react';

export function SectionHeading({ label, action, onAction, style }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, ...style }}>
      <span style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
        {label}
      </span>
      {action && (
        <button onClick={onAction} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, font: '600 0.75rem/1 var(--font-ui)', color: 'var(--accent-deep)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {action} →
        </button>
      )}
    </div>
  );
}
