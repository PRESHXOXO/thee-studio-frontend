import React from 'react';

const base = {
  width: '100%', font: 'var(--text-base)', color: 'var(--text-body)',
  background: 'var(--white)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)', padding: '10px 13px',
  boxSizing: 'border-box', outline: 'none', transition: 'border-color var(--t-fast), box-shadow var(--t-fast)',
};

export function Input({ value, onChange, placeholder, disabled, style, onFocus, onBlur }) {
  const [focused, setFocused] = React.useState(false);
  return (
    <input
      value={value}
      onChange={e => onChange && onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      onFocus={(e) => { setFocused(true); onFocus && onFocus(e); }}
      onBlur={(e) => { setFocused(false); onBlur && onBlur(e); }}
      style={{ ...base, borderColor: focused ? 'var(--hot-coral)' : 'var(--border)', boxShadow: focused ? '0 0 0 3px rgba(255,79,94,0.12)' : 'none', ...style }}
    />
  );
}

export function Textarea({ value, onChange, placeholder, disabled, rows = 4, style }) {
  const [focused, setFocused] = React.useState(false);
  return (
    <textarea
      value={value}
      onChange={e => onChange && onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      rows={rows}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{ ...base, resize: 'vertical', lineHeight: 1.55, borderColor: focused ? 'var(--hot-coral)' : 'var(--border)', boxShadow: focused ? '0 0 0 3px rgba(255,79,94,0.12)' : 'none', ...style }}
    />
  );
}
