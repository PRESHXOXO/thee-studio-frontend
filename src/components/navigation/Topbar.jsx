import React from 'react';
import { Icon } from '../core/Icon.jsx';
import { Avatar } from '../core/Avatar.jsx';

export function Topbar({ context = 'Studio', search = true, actions, user = 'Thee Studio', userSrc, style }) {
  return (
    <header style={{
      height: 'var(--topbar-h)', flex: 'none', boxSizing: 'border-box',
      display: 'flex', alignItems: 'center', gap: 16, padding: '0 28px',
      borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.88)',
      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      position: 'fixed', top: 0, left: 'var(--sidebar-w)', right: 0, zIndex: 99, ...style,
    }}>
      <span style={{ font: '500 0.8125rem/1 var(--font-ui)', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <Icon name="command" size={14} /> {context}
      </span>

      {search && (
        <div style={{
          marginLeft: 8, flex: 1, maxWidth: 380, display: 'flex', alignItems: 'center', gap: 9,
          padding: '9px 14px', borderRadius: 'var(--radius-pill)', background: 'var(--cream-deep)',
          border: '1px solid var(--border)',
        }}>
          <Icon name="search" size={15} color="var(--text-faint)" />
          <input
            placeholder="Search creators, prompts, scenes…"
            style={{
              flex: 1, border: 'none', background: 'transparent', outline: 'none',
              font: 'var(--text-sm)', color: 'var(--text-body)', fontFamily: 'inherit',
            }}
          />
          <span style={{ marginLeft: 'auto', font: '500 0.625rem/1 var(--font-mono)', color: 'var(--text-faint)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 7px', flexShrink: 0 }}>⌘K</span>
        </div>
      )}

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
        {actions}
        <button style={{ border: '1px solid var(--border)', background: 'var(--white)', width: 38, height: 38, borderRadius: 'var(--radius-md)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-body)' }}>
          <Icon name="bell" size={17} />
        </button>
        <Avatar name={user} src={userSrc} size={38} ring />
      </div>
    </header>
  );
}
