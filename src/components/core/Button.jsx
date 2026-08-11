import React from 'react';
import { Icon } from './Icon.jsx';

function textContent(node) {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textContent).join(' ');
  return textContent(node?.props?.children);
}

// Premier studio controls: generation keeps the sunset signature, but the
// physical 3D/chunky treatment is gone. Buttons should feel precise and calm,
// like creative-suite controls, not playful dashboard tiles.
export function Button({ children, variant = 'primary', size = 'md', icon, iconRight, full = false, disabled = false, loading = false, onClick, type = 'button', style }) {
  const sizes = {
    sm: { padding: '8px 14px', font: '600 0.8125rem/1 var(--font-ui)', gap: 6, icon: 15, radius: 9 },
    md: { padding: '11px 18px', font: '600 0.9rem/1 var(--font-ui)', gap: 8, icon: 18, radius: 10 },
    lg: { padding: '15px 24px', font: '650 1rem/1 var(--font-ui)', gap: 9, icon: 20, radius: 11 },
  }[size];

  const variants = {
    primary:   { background: 'var(--grad-coral)', color: 'var(--text-on-accent)', border: '1px solid rgba(255,255,255,0.08)', '--btn-shadow': 'rgba(213, 73, 51, 0.20)' },
    accent:    { background: 'var(--plum)', color: 'var(--text-on-dark)', border: '1px solid var(--plum)', '--btn-shadow': 'rgba(23, 20, 27, 0.16)' },
    secondary: { background: 'rgba(255,254,252,0.78)', color: 'var(--text-strong)', border: '1px solid var(--border-strong)', '--btn-shadow': 'rgba(31,24,20,0.06)' },
    utility:   { background: 'var(--surface-inset)', color: 'var(--text-body)', border: '1px solid var(--border)', '--btn-shadow': 'rgba(31,24,20,0.05)' },
    ghost:     { background: 'transparent', color: 'var(--text-body)', border: '1px solid transparent', '--btn-shadow': 'transparent' },
    dark:      { background: 'var(--plum)', color: 'var(--text-on-dark)', border: '1px solid var(--border-on-dark)', '--btn-shadow': 'rgba(0,0,0,0.18)' },
  };

  const flat = variant === 'ghost';
  const stagingDebug = textContent(children).includes('Check References');

  return (
    <button
      type={type}
      title={stagingDebug ? 'Reference preflight — staging only' : undefined}
      aria-label={stagingDebug ? 'Reference preflight — staging only' : undefined}
      onClick={disabled || loading ? undefined : onClick}
      disabled={disabled || loading}
      className={stagingDebug ? 'ts-staging-debug-btn' : (flat ? undefined : 'ts-btn')}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        gap: sizes.gap, padding: sizes.padding, font: sizes.font, letterSpacing: '0.005em',
        borderRadius: sizes.radius, cursor: disabled || loading ? 'not-allowed' : 'pointer',
        width: full ? '100%' : 'auto', opacity: disabled ? 0.5 : 1,
        whiteSpace: 'nowrap', userSelect: 'none',
        ...variants[variant],
        ...(stagingDebug ? {
          width: 34, height: 34, minWidth: 34, padding: 0,
          borderRadius: 9, alignSelf: 'flex-end',
          background: 'rgba(255,255,255,0.045)',
          color: 'var(--text-faint)',
          border: '1px solid var(--border)',
          boxShadow: 'none',
        } : null),
        ...style,
      }}
    >
      {stagingDebug ? (
        loading
          ? <Icon name="loader" size={14} strokeWidth={2} style={{ animation: 'spin 1s linear infinite' }} />
          : <Icon name="activity" size={14} strokeWidth={1.9} />
      ) : (
        <>
          {icon && !loading && <Icon name={icon} size={sizes.icon} strokeWidth={2.1} />}
          {loading && <Icon name="loader" size={sizes.icon} strokeWidth={2.1} style={{ animation: 'spin 1s linear infinite' }} />}
          {children}
          {iconRight && <Icon name={iconRight} size={sizes.icon} strokeWidth={2.1} />}
        </>
      )}
    </button>
  );
}
