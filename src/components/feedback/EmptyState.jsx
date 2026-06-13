import React from 'react';
import { Icon } from '../core/Icon.jsx';
import { Button } from '../core/Button.jsx';

export function EmptyState({ icon = 'inbox', title, body, cta, onCta, style }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', textAlign: 'center', gap: 16, ...style }}>
      <span style={{ width: 52, height: 52, borderRadius: 'var(--radius-lg)', background: 'var(--rose-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-deep)' }}>
        <Icon name={icon} size={24} strokeWidth={1.5} />
      </span>
      {title && <h3 style={{ font: 'var(--display-sm)', color: 'var(--text-strong)', margin: 0 }}>{title}</h3>}
      {body && <p style={{ font: 'var(--text-base)', color: 'var(--text-muted)', maxWidth: 360, margin: 0 }}>{body}</p>}
      {cta && <Button variant="primary" onClick={onCta}>{cta}</Button>}
    </div>
  );
}
