import React from 'react';
import { Icon } from '../core/Icon.jsx';
import { buildActivityFeed, timeAgo } from '../../lib/activity.js';

const SEEN_KEY = 'ts_notif_seen_at';

export function NotificationsMenu({ onNav }) {
  const [open, setOpen] = React.useState(false);
  const [feed, setFeed] = React.useState([]);
  const [seenAt, setSeenAt] = React.useState(() => localStorage.getItem(SEEN_KEY) || '');
  const ref = React.useRef(null);

  React.useEffect(() => {
    setFeed(buildActivityFeed());
  }, [open]);

  const unreadCount = feed.filter(i => !seenAt || new Date(i.at) > new Date(seenAt)).length;

  React.useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const toggle = () => {
    setOpen(o => {
      const next = !o;
      if (next) {
        const now = new Date().toISOString();
        localStorage.setItem(SEEN_KEY, now);
        setSeenAt(now);
      }
      return next;
    });
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={toggle}
        title="Notifications"
        style={{
          position: 'relative', width: 36, height: 36, borderRadius: '50%', border: '1px solid var(--border)',
          background: 'var(--cream-deep)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Icon name="bell" size={16} strokeWidth={1.75} style={{ color: 'var(--text-muted)' }} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: 3, right: 4, width: 8, height: 8, borderRadius: '50%',
            background: 'var(--cherry)', border: '1.5px solid var(--surface, #fff)',
          }} />
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 46, right: 0, width: 320, maxHeight: 400, overflowY: 'auto',
          background: 'var(--surface-raised, var(--cream))', border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', zIndex: 200,
        }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', font: '600 0.8125rem/1 var(--font-ui)', color: 'var(--text-strong)' }}>
            Activity
          </div>
          {feed.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', font: 'var(--text-sm)', color: 'var(--text-faint)' }}>
              Nothing yet — generate a shot or start a campaign.
            </div>
          ) : feed.map(item => (
            <div
              key={item.id}
              onClick={() => { onNav?.(item.navId); setOpen(false); }}
              style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '11px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
            >
              <Icon name={item.icon} size={14} strokeWidth={1.75} style={{ color: 'var(--accent-deep)', flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: '600 0.8rem/1.3 var(--font-ui)', color: 'var(--text-strong)' }}>{item.title}</div>
                <div style={{ font: '500 0.75rem/1.3 var(--font-ui)', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.subtitle}</div>
              </div>
              <span style={{ font: '500 0.68rem/1 var(--font-ui)', color: 'var(--text-faint)', flexShrink: 0 }}>{timeAgo(item.at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
