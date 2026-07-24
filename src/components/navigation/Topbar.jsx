import React from 'react';
import { Icon } from '../core/Icon.jsx';
import { Avatar } from '../core/Avatar.jsx';

// search/notifications/profile-menu affordances were removed — none of them
// did anything (no results dropdown, no click handler, no menu). Real
// wiring is a Phase 5 item; showing a dead ⌘K hint and a dead bell icon
// until then is worse than showing nothing.
export function Topbar({ context = 'Studio', actions, user = 'Thee Studio', userSrc, style }) {
  return (
    <header style={{
      height: 'var(--topbar-h)', flex: 'none', boxSizing: 'border-box',
      display: 'flex', alignItems: 'center', gap: 16, padding: '0 28px',
      borderBottom: '1px solid var(--border)', background: 'rgba(15,10,34,0.82)',
      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      position: 'fixed', top: 0, left: 'var(--sidebar-w)', right: 0, zIndex: 99, ...style,
    }}>
      <span style={{ font: '500 0.8125rem/1 var(--font-ui)', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <Icon name="command" size={14} /> {context}
      </span>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
        {actions}
        <Avatar name={user} src={userSrc} size={38} ring />
      </div>
    </header>
  );
}
