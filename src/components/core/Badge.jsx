import React from 'react';
import { Icon } from './Icon.jsx';

const statuses = {
  ready:  { bg: 'var(--status-ready-bg)',  color: 'var(--status-ready)',  dot: true },
  warn:   { bg: 'var(--status-warn-bg)',   color: 'var(--status-warn)',   dot: true },
  off:    { bg: 'var(--status-off-bg)',    color: 'var(--status-off)',    dot: true },
  locked: { bg: 'var(--status-locked-bg)', color: 'var(--status-locked)', dot: false },
};

export function Badge({ children, status = 'ready', icon }) {
  const s = statuses[status] || statuses.ready;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 'var(--radius-pill)',
      font: '600 0.6875rem/1 var(--font-ui)', letterSpacing: '0.06em',
      textTransform: 'uppercase', background: s.bg, color: s.color,
    }}>
      {s.dot && <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color, flex: 'none' }} />}
      {icon && <Icon name={icon} size={11} strokeWidth={2.5} />}
      {children}
    </span>
  );
}
