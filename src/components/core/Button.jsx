import React from 'react';
import { Icon } from './Icon.jsx';

// Chunky & tactile: rounded-rect (not a pill), a hard offset bottom shadow
// that reads physical, lifts on hover and sinks onto its shadow on click.
// The press interaction lives in the .ts-btn CSS class (styles.css) since
// inline styles can't express :hover/:active; per-variant shadow color is
// passed down via the --btn-shadow custom property.
export function Button({ children, variant = 'primary', size = 'md', icon, iconRight, full = false, disabled = false, loading = false, onClick, type = 'button', style }) {
  const sizes = {
    sm: { padding: '8px 15px', font: '600 0.8125rem/1 var(--font-ui)', gap: 6, icon: 15, radius: 10 },
    md: { padding: '12px 22px', font: '600 0.9375rem/1 var(--font-ui)', gap: 8, icon: 18, radius: 13 },
    lg: { padding: '16px 30px', font: '700 1.0625rem/1 var(--font-ui)', gap: 9, icon: 20, radius: 15 },
  }[size];

  const variants = {
    // Reserved for the action that actually produces generated pixels
    // (Build + Generate, Generate Headshot, Generate with X) — the gradient
    // is a signal, not decoration, so it only fires there.
    primary:   { background: 'var(--grad-coral)', color: 'var(--text-on-accent)', border: 'none', '--btn-shadow': '#C24417' },
    // Solid-fill affirmative action that isn't itself a generation call —
    // data saves, launchers into another screen, approvals.
    accent:    { background: 'var(--accent-indigo)', color: '#fff', border: 'none', '--btn-shadow': '#2E227F' },
    secondary: { background: 'var(--white)', color: 'var(--accent-deep)', border: '1.5px solid var(--peach)', '--btn-shadow': '#E7BE9E' },
    utility:   { background: 'var(--cream-deep)', color: 'var(--text-body)', border: '1.5px solid var(--border-strong)', '--btn-shadow': '#D6D1E8' },
    ghost:     { background: 'transparent', color: 'var(--text-body)', border: '1.5px solid transparent', '--btn-shadow': 'transparent' },
    dark:      { background: 'var(--grad-plum)', color: 'var(--text-on-dark)', border: 'none', '--btn-shadow': '#0C0820' },
  };

  const flat = variant === 'ghost'; // ghost has no chunk — stays quiet

  return (
    <button
      type={type}
      onClick={disabled || loading ? undefined : onClick}
      disabled={disabled || loading}
      className={flat ? undefined : 'ts-btn'}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        gap: sizes.gap, padding: sizes.padding, font: sizes.font, letterSpacing: '0.01em',
        borderRadius: sizes.radius, cursor: disabled || loading ? 'not-allowed' : 'pointer',
        width: full ? '100%' : 'auto', opacity: disabled ? 0.5 : 1,
        whiteSpace: 'nowrap', userSelect: 'none',
        ...variants[variant], ...style,
      }}
    >
      {icon && !loading && <Icon name={icon} size={sizes.icon} strokeWidth={2.25} />}
      {loading && <Icon name="loader" size={sizes.icon} strokeWidth={2.25} style={{ animation: 'spin 1s linear infinite' }} />}
      {children}
      {iconRight && <Icon name={iconRight} size={sizes.icon} strokeWidth={2.25} />}
    </button>
  );
}
