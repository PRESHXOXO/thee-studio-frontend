import React from 'react';
import { Icon } from '../core/Icon.jsx';

export function StatCard({ value, label, icon, accent = false, style }) {
  return (
    <div style={{
      background: accent ? 'var(--grad-coral)' : 'var(--white)',
      border: accent ? 'none' : '1px solid var(--border)',
      borderRadius: 'var(--radius-md)', padding: '16px 18px',
      boxShadow: accent ? 'var(--shadow-coral)' : 'var(--shadow-xs)',
      display: 'flex', flexDirection: 'column', gap: 6, ...style,
    }}>
      {icon && (
        <span style={{ color: accent ? 'rgba(255,255,255,0.8)' : 'var(--accent-deep)' }}>
          {typeof icon === 'string' ? <Icon name={icon} size={18} strokeWidth={1.75} /> : icon}
        </span>
      )}
      <span style={{ font: 'var(--display-sm)', color: accent ? '#fff' : 'var(--text-strong)', letterSpacing: '-0.02em' }}>{value}</span>
      <span style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: accent ? 'rgba(255,255,255,0.75)' : 'var(--text-muted)' }}>{label}</span>
    </div>
  );
}
