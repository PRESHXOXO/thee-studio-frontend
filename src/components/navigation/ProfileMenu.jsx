import React from 'react';
import { Avatar } from '../core/Avatar.jsx';
import { Icon } from '../core/Icon.jsx';

// No real auth session exists yet (Auth.jsx doesn't store a token/session),
// so this menu stays to what's real: display name + a link to Settings.
// No Sign Out — faking one would mean touching auth surface.
export function ProfileMenu({ user = 'Thee Studio', userSrc, onNav }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}
        title={user}
      >
        <Avatar name={user} src={userSrc} size={38} ring />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 46, right: 0, width: 220,
          background: 'var(--surface-raised, var(--cream))', border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', zIndex: 200, overflow: 'hidden',
        }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ font: '600 0.85rem/1.2 var(--font-ui)', color: 'var(--text-strong)' }}>{user}</div>
          </div>
          <button
            onClick={() => { onNav?.('settings'); setOpen(false); }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
              background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
              font: '500 0.8125rem/1 var(--font-ui)', color: 'var(--text-body)', fontFamily: 'inherit',
            }}
          >
            <Icon name="settings" size={14} strokeWidth={1.75} /> Settings
          </button>
        </div>
      )}
    </div>
  );
}
