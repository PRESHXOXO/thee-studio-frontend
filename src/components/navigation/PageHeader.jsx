import React from 'react';

export function PageHeader({ eyebrow, title, subtitle, actions, style }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap', ...style }}>
      <div>
        {eyebrow && (
          <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--accent-deep)', marginBottom: 10 }}>
            {eyebrow}
          </div>
        )}
        <h1 style={{ font: 'var(--display-lg)', color: 'var(--text-strong)', letterSpacing: '-0.015em', margin: 0 }}>{title}</h1>
        {subtitle && <p style={{ font: 'var(--text-lg)', color: 'var(--text-muted)', marginTop: 8, maxWidth: 560 }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>{actions}</div>}
    </div>
  );
}
