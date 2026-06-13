import React from 'react';
import { Icon } from '../core/Icon.jsx';

export function Select({ value, onChange, options = [], placeholder, disabled, label, style }) {
  return (
    <div style={{ position: 'relative', ...style }}>
      {label && <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>}
      <div style={{ position: 'relative' }}>
        <select
          value={value || ''}
          onChange={e => onChange && onChange(e.target.value)}
          disabled={disabled}
          style={{
            width: '100%', appearance: 'none',
            font: 'var(--text-base)', color: value ? 'var(--text-body)' : 'var(--text-faint)',
            background: 'var(--white)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)', padding: '10px 36px 10px 13px',
            cursor: 'pointer', outline: 'none', boxSizing: 'border-box',
          }}
        >
          {placeholder && <option value="" disabled>{placeholder}</option>}
          {options.map(opt => (
            typeof opt === 'string'
              ? <option key={opt} value={opt}>{opt}</option>
              : <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <span style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }}>
          <Icon name="chevron-down" size={16} />
        </span>
      </div>
    </div>
  );
}
