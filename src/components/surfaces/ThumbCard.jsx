import React from 'react';

const gradients = [
  'radial-gradient(circle at 55% 20%, rgba(33,24,33,0.62), transparent 32%), linear-gradient(135deg, #211821, #D91E46 62%, #FFE1DC)',
  'radial-gradient(circle at 40% 22%, rgba(255,209,199,0.7), transparent 31%), linear-gradient(135deg, #D91E46, #FF6B4A 48%, #211821)',
  'radial-gradient(circle at 52% 20%, rgba(255,247,242,0.64), transparent 30%), linear-gradient(135deg, #2A1024, #E83D52 52%, #FFD1C7)',
];

export function ThumbCard({ name, caption, meta, src, selected = false, locked = false, index = 0, onClick, style }) {
  const initials = name ? name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : 'TS';
  return (
    <div
      onClick={onClick}
      style={{
        borderRadius: 'var(--radius-md)', overflow: 'hidden', position: 'relative',
        minHeight: 150, cursor: onClick ? 'pointer' : 'default',
        background: src ? `center/cover url(${src})` : gradients[index % 3],
        border: selected ? '2px solid var(--coral)' : '2px solid transparent',
        boxShadow: selected ? 'var(--shadow-coral)' : 'var(--shadow-xs)',
        ...style,
      }}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 38%, rgba(33,24,33,0.7))', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          {!src && <span style={{ background: 'rgba(255,255,255,0.78)', color: 'var(--cherry)', font: '600 0.6875rem/1 var(--font-display)', padding: '3px 7px', borderRadius: 6 }}>{initials}</span>}
          {meta && <span style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.15)', color: '#fff', font: '600 0.625rem/1 var(--font-mono)', padding: '2px 6px', borderRadius: 4 }}>{meta}</span>}
        </div>
        <div>
          {name && <div style={{ font: '600 0.8125rem/1.2 var(--font-ui)', color: '#fff' }}>{name}</div>}
          {caption && <div style={{ font: '0.6875rem/1.3 var(--font-ui)', color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>{caption}</div>}
        </div>
      </div>
      {locked && (
        <div style={{ position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: '50%', background: 'var(--cherry)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(255,255,255,0.5)' }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
        </div>
      )}
    </div>
  );
}
