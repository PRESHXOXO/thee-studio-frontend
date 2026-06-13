import React from 'react';
import { Icon } from './Icon.jsx';

export function Button({ children, variant = 'primary', size = 'md', icon, iconRight, full = false, disabled = false, loading = false, onClick, type = 'button', style }) {
  const sizes = {
    sm: { padding: '7px 14px', font: 'var(--text-sm)', gap: 6, icon: 15, radius: 'var(--radius-sm)' },
    md: { padding: '11px 20px', font: '600 0.9375rem/1 var(--font-ui)', gap: 8, icon: 18, radius: 'var(--radius-md)' },
    lg: { padding: '15px 28px', font: '600 1.0625rem/1 var(--font-ui)', gap: 9, icon: 20, radius: 'var(--radius-md)' },
  }[size];

  const variants = {
    primary: { background: 'var(--grad-coral)', color: 'var(--text-on-accent)', boxShadow: 'var(--shadow-coral)', border: '1px solid transparent' },
    secondary: { background: 'var(--white)', color: 'var(--accent-deep)', border: '1px solid var(--peach)', boxShadow: 'var(--shadow-xs)' },
    utility: { background: 'var(--cream-deep)', color: 'var(--text-body)', border: '1px solid var(--border)' },
    ghost: { background: 'transparent', color: 'var(--text-body)', border: '1px solid transparent' },
    dark: { background: 'var(--grad-plum)', color: 'var(--text-on-dark)', border: '1px solid transparent', boxShadow: 'var(--shadow-sm)' },
  };

  return (
    <button
      type={type}
      onClick={disabled || loading ? undefined : onClick}
      disabled={disabled || loading}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        gap: sizes.gap, padding: sizes.padding, font: sizes.font, letterSpacing: '0.01em',
        borderRadius: sizes.radius, cursor: disabled || loading ? 'not-allowed' : 'pointer',
        width: full ? '100%' : 'auto', opacity: disabled ? 0.5 : 1,
        transition: 'transform var(--t-fast), box-shadow var(--t-base), background var(--t-base)',
        whiteSpace: 'nowrap', userSelect: 'none',
        ...variants[variant], ...style,
      }}
    >
      {icon && !loading && <Icon name={icon} size={sizes.icon} strokeWidth={2} />}
      {loading && <Icon name="loader" size={sizes.icon} strokeWidth={2} />}
      {children}
      {iconRight && <Icon name={iconRight} size={sizes.icon} strokeWidth={2} />}
    </button>
  );
}
