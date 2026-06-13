import React from 'react';

export function Switch({ checked = false, onChange, label, disabled = false }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 10, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}>
      <span
        onClick={() => !disabled && onChange && onChange(!checked)}
        style={{
          display: 'inline-flex', alignItems: 'center',
          width: 42, height: 24, borderRadius: 999,
          background: checked ? 'var(--grad-coral)' : 'var(--border-strong)',
          padding: 2, boxSizing: 'border-box',
          transition: 'background var(--t-base)', flex: 'none', cursor: 'pointer',
        }}
      >
        <span style={{
          width: 20, height: 20, borderRadius: '50%', background: '#fff',
          transform: checked ? 'translateX(18px)' : 'translateX(0)',
          transition: 'transform var(--t-base)',
          boxShadow: 'var(--shadow-xs)',
        }} />
      </span>
      {label && <span style={{ font: 'var(--text-sm)', color: 'var(--text-body)' }}>{label}</span>}
    </label>
  );
}
