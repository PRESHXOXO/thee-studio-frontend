import React from 'react';

export function Card({ children, variant = 'default', style, onClick }) {
  const variants = {
    default: { background: 'var(--surface-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' },
    rose:    { background: 'var(--surface-card-rose)', border: '1px solid var(--blush)', boxShadow: 'var(--shadow-sm)' },
    dark:    { background: 'var(--surface-dark)', border: '1px solid var(--border-on-dark)', boxShadow: 'var(--shadow-md)' },
    inset:   { background: 'var(--surface-inset)', border: '1px solid var(--border)', boxShadow: 'none' },
  };
  return (
    <div
      onClick={onClick}
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
