import React from 'react';
import { Icon } from '../core/Icon.jsx';
import { SearchPalette } from './SearchPalette.jsx';
import { NotificationsMenu } from './NotificationsMenu.jsx';
import { ProfileMenu } from './ProfileMenu.jsx';

export function Topbar({
  context = 'Studio', actions, user = 'Thee Studio', userEmail, userSrc,
  onNav, onSignOut, allowedNavIds, showSettings = true, style,
  mobile = false, onMenuClick,
}) {
  const [searchOpen, setSearchOpen] = React.useState(false);
  const displayContext = context === 'Generation Settings' ? 'Usage & Credits' : context;

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
        height: mobile ? 'calc(var(--topbar-h) + env(safe-area-inset-top))' : 'var(--topbar-h)',
        paddingTop: mobile ? 'env(safe-area-inset-top)' : 0,
        flex: 'none', boxSizing: 'border-box',
        display: 'flex', alignItems: 'center', gap: mobile ? 8 : 18,
        paddingLeft: mobile ? 10 : 32, paddingRight: mobile ? 10 : 32,
        borderBottom: '1px solid rgba(125,111,102,0.12)', background: 'var(--surface-app-translucent)',
        backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
        position: 'fixed', top: 0, left: mobile ? 0 : 'var(--sidebar-w)', right: 0, zIndex: 99,
        ...style,
      }}>
        {mobile && (
          <button
            type="button"
            aria-label="Open navigation"
            onClick={onMenuClick}
            style={{
              width: 44, height: 44, flexShrink: 0, display: 'grid', placeItems: 'center',
              border: 0, borderRadius: 'var(--radius-md)', background: 'transparent',
              color: 'var(--text-body)', cursor: 'pointer',
            }}
          >
            <Icon name="menu" size={21} strokeWidth={1.9} />
          </button>
        )}

        <span style={{
          font: mobile ? '600 0.875rem/1 var(--font-ui)' : '600 0.72rem/1 var(--font-ui)',
          letterSpacing: mobile ? 0 : '0.08em', textTransform: mobile ? 'none' : 'uppercase',
          color: mobile ? 'var(--text-strong)' : 'var(--text-muted)',
          display: 'inline-flex', alignItems: 'center', gap: 8, flexShrink: 1,
          minWidth: 0, maxWidth: mobile ? '34vw' : undefined,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {!mobile && <span style={{ width: 20, height: 1, background: 'var(--accent-deep)', display: 'inline-block' }} />}
          {displayContext}
        </span>

        <button
          type="button"
          aria-label="Search Studio"
          onClick={() => setSearchOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: mobile ? 'center' : 'flex-start',
            gap: 8, padding: mobile ? 0 : '8px 11px',
            width: mobile ? 42 : 230, height: mobile ? 42 : 36,
            minWidth: mobile ? 42 : 180,
            marginLeft: mobile ? 'auto' : 12,
            borderRadius: 10,
            border: '1px solid rgba(125,111,102,0.16)', background: 'rgba(255,254,252,0.54)', cursor: 'pointer',
            color: 'var(--text-faint)', font: '500 0.77rem/1 var(--font-ui)', fontFamily: 'inherit',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.52)',
          }}
        >
          <Icon name="search" size={14} strokeWidth={1.7} />
          {!mobile && <span style={{ flex: 1, textAlign: 'left' }}>Search studio</span>}
          {!mobile && <span style={{ font: '600 0.62rem/1 var(--font-ui)', color: 'var(--text-faint)', letterSpacing: '0.04em' }}>⌘K</span>}
        </button>

        <div style={{ marginLeft: mobile ? 0 : 'auto', display: 'flex', alignItems: 'center', gap: mobile ? 4 : 9, minWidth: 0 }}>
          {!mobile && actions}
          <NotificationsMenu onNav={onNav} />
          <ProfileMenu user={user} userEmail={userEmail} userSrc={userSrc} onNav={onNav} onSignOut={onSignOut} showSettings={showSettings} />
        </div>
      </header>
      <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} onNav={onNav} allowedNavIds={allowedNavIds} />
    </>
  );
}
