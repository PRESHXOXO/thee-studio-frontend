import React from 'react';
import { Input, Textarea } from './Input.jsx';

export function Field({ label, hint, error, children, style }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      {label && (
        <label style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: error ? 'var(--cherry)' : 'var(--text-muted)' }}>
          {label}
        </label>
      )}
      {children}
      {hint && !error && <span style={{ font: 'var(--text-sm)', color: 'var(--text-faint)' }}>{hint}</span>}
      {error && <span style={{ font: 'var(--text-sm)', color: 'var(--cherry)' }}>{error}</span>}
    </div>
  );
}
