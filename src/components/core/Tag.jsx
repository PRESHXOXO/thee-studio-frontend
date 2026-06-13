import React from 'react';

const tones = {
  soft:  { background: 'var(--blush)',    color: 'var(--accent-deep)' },
  plain: { background: 'var(--cream-deep)', color: 'var(--text-muted)' },
  gold:  { background: '#FFF3CD',         color: '#A07A00' },
  coral: { background: 'var(--rose-deep)', color: 'var(--cherry)' },
};

export function Tag({ children, tone = 'soft', style }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '4px 10px', borderRadius: 'var(--radius-pill)',
      font: '500 0.75rem/1 var(--font-ui)', letterSpacing: '0.01em',
      ...tones[tone] || tones.soft, ...style,
    }}>
      {children}
    </span>
  );
}
