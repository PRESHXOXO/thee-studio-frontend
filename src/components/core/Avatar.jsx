import React from 'react';

export function Avatar({ name = 'Creator', src, size = 44, locked = false, ring = false, style }) {
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <span style={{ position: 'relative', display: 'inline-flex', flex: 'none' }}>
      <span style={{
        width: size, height: size, borderRadius: '50%',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: src ? `center/cover url(${src})` : 'var(--grad-portrait)',
        color: '#fff', font: `600 ${Math.round(size * 0.34)}px/1 var(--font-display)`,
        boxShadow: ring ? '0 0 0 2px var(--white), 0 0 0 4px var(--coral)' : 'var(--shadow-xs)',
        overflow: 'hidden', flex: 'none', ...style,
      }}>
        {!src && initials}
      </span>
      {locked && (
        <span style={{
          position: 'absolute', bottom: -2, right: -2,
          width: Math.max(16, size * 0.42), height: Math.max(16, size * 0.42),
          borderRadius: '50%', background: 'var(--cherry)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '2px solid var(--white)', color: '#fff',
        }}>
          <svg width={Math.max(8, size * 0.2)} height={Math.max(8, size * 0.2)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>
          </svg>
        </span>
      )}
    </span>
  );
}
