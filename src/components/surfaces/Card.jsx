import React from 'react';

// Premier surface system: static panels read like studio architecture rather
// than floating dashboard cards. Generation Canvas/Output cards become a dark
// proofing stage so imagery — not UI chrome — carries the visual hierarchy.
export function Card({ children, variant = 'default', style, onClick, className }) {
  const interactive = Boolean(onClick);
  const childArray = React.Children.toArray(children);
  const firstChildText = childArray[0]?.props?.children;
  const isProofStage = !interactive && (firstChildText === 'Canvas' || firstChildText === 'Output');

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

  const proofStageStyle = isProofStage ? {
    background: 'linear-gradient(155deg, #1D1921 0%, #121014 100%)',
    border: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 28px 70px rgba(27,20,28,0.18)',
    '--text-strong': '#FFFFFF',
    '--text-body': 'rgba(255,255,255,0.78)',
    '--text-muted': 'rgba(255,255,255,0.56)',
    '--text-faint': 'rgba(255,255,255,0.36)',
    '--border': 'rgba(255,255,255,0.11)',
    '--border-strong': 'rgba(255,255,255,0.18)',
    '--surface-sunken': 'rgba(255,255,255,0.055)',
    '--surface-inset': 'rgba(255,255,255,0.055)',
    '--white': 'rgba(255,255,255,0.06)',
  } : null;

  const cls = [interactive ? 'ts-card' : 'ts-static-card', isProofStage ? 'ts-proof-stage' : null, className].filter(Boolean).join(' ') || undefined;
  return (
    <div
      onClick={onClick}
      className={cls}
      style={{
        borderRadius: 'var(--radius-lg)',
        padding: 24,
        cursor: interactive ? 'pointer' : 'default',
        ...variants[variant] || variants.default,
        ...proofStageStyle,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
