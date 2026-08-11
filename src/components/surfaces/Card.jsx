import React from 'react';

// Premier surface system: static panels read like studio architecture rather
// than floating dashboard cards. Interactive/media cards keep a restrained
// lift so there is still clear affordance where something can be opened.
export function Card({ children, variant = 'default', style, onClick, className }) {
  const interactive = Boolean(onClick);
  const variants = {
    default: {
      background: 'var(--surface-card)',
      border: '1px solid var(--border)',
      boxShadow: interactive ? 'var(--shadow-xs)' : 'none',
    },
    rose: {
      background: 'var(--surface-card-rose)',
      border: '1px solid color-mix(in srgb, var(--blush) 72%, var(--border))',
      boxShadow: interactive ? 'var(--shadow-xs)' : 'none',
    },
    dark: {
      background: 'var(--surface-dark)',
      border: '1px solid var(--border-on-dark)',
      boxShadow: 'var(--shadow-md)',
    },
    inset: {
      background: 'var(--surface-inset)',
      border: '1px solid var(--border)',
      boxShadow: 'none',
    },
  };
  const cls = [interactive ? 'ts-card' : 'ts-static-card', className].filter(Boolean).join(' ') || undefined;
  return (
    <div
      onClick={onClick}
      className={cls}
      style={{
        borderRadius: 'var(--radius-lg)',
        padding: 24,
        cursor: interactive ? 'pointer' : 'default',
        ...variants[variant] || variants.default,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
