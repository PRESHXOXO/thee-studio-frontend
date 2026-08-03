import React from 'react';

// Interactive cards (onClick) get the tactile treatment — a real resting
// shadow that lifts on hover and settles on press (.ts-card in styles.css).
// Static cards (forms, panels) stay put; only clickable surfaces feel
// pressable, so the whole app doesn't jump around.
export function Card({ children, variant = 'default', style, onClick, className }) {
  const variants = {
    default: { background: 'var(--surface-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' },
    rose:    { background: 'var(--surface-card-rose)', border: '1px solid var(--blush)', boxShadow: 'var(--shadow-sm)' },
    dark:    { background: 'var(--surface-dark)', border: '1px solid var(--border-on-dark)', boxShadow: 'var(--shadow-md)' },
    inset:   { background: 'var(--surface-inset)', border: '1px solid var(--border)', boxShadow: 'none' },
  };
  const cls = [onClick ? 'ts-card' : null, className].filter(Boolean).join(' ') || undefined;
  return (
    <div
      onClick={onClick}
      className={cls}
      style={{
        borderRadius: 'var(--radius-lg)', padding: 20,
        cursor: onClick ? 'pointer' : 'default',
        ...variants[variant] || variants.default, ...style,
      }}
    >
      {children}
    </div>
  );
}
