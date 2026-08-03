import React from 'react';
import { Icon } from '../core/Icon.jsx';
import { SearchPalette } from './SearchPalette.jsx';
import { NotificationsMenu } from './NotificationsMenu.jsx';
import { ProfileMenu } from './ProfileMenu.jsx';

export function Topbar({ context = 'Studio', actions, user = 'Thee Studio', userEmail, userSrc, onNav, onSignOut, style }) {
  const [searchOpen, setSearchOpen] = React.useState(false);

  React.useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
    <header style={{
      height: 'var(--topbar-h)', flex: 'none', boxSizing: 'border-box',
      display: 'flex', alignItems: 'center', gap: 16, padding: '0 28px',
      borderBottom: '1px solid var(--border)', background: 'var(--surface-app-translucent)',
      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      position: 'fixed', top: 0, left: 'var(--sidebar-w)', right: 0, zIndex: 99, ...style,
    }}>
      <span style={{ font: '500 0.8125rem/1 var(--font-ui)', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <Icon name="command" size={14} /> {context}
      </span>

      <button
        onClick={() => setSearchOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 'var(--radius-pill)',
          border: '1px solid var(--border)', background: 'var(--surface-inset)', cursor: 'pointer',
          color: 'var(--text-faint)', font: '500 0.8rem/1 var(--font-ui)', fontFamily: 'inherit',
          maxWidth: 280, width: '100%', marginLeft: 12,
        }}
      >
        <Icon name="search" size={14} strokeWidth={1.75} />
        <span style={{ flex: 1, textAlign: 'left' }}>Search…</span>
        <span style={{ font: '500 0.68rem/1 var(--font-ui)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 5px' }}>⌘K</span>
      </button>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
        {actions}
        <NotificationsMenu onNav={onNav} />
        <ProfileMenu user={user} userEmail={userEmail} userSrc={userSrc} onNav={onNav} onSignOut={onSignOut} />
      </div>
    </header>
    <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} onNav={onNav} />
    </>
  );
}
