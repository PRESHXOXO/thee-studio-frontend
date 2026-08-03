import React from 'react';
import { Icon } from '../core/Icon.jsx';
import { searchIndex } from '../../lib/search.js';

export function SearchPalette({ open, onClose, onNav }) {
  const [query, setQuery] = React.useState('');
  const [activeIdx, setActiveIdx] = React.useState(0);
  const inputRef = React.useRef(null);
  const results = React.useMemo(() => searchIndex(query), [query]);

  React.useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  React.useEffect(() => { setActiveIdx(0); }, [query]);

  const select = React.useCallback((item) => {
    if (!item) return;
    onNav?.(item.navId, item.navData);
    onClose();
  }, [onNav, onClose]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); return; }
    if (e.key === 'Enter') { e.preventDefault(); select(results[activeIdx]); }
  };

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(15,10,34,0.55)',
        backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '14vh',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 560, background: 'var(--surface-raised, var(--cream))',
          borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-strong)',
          boxShadow: 'var(--shadow-lg)', overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
          <Icon name="search" size={16} strokeWidth={1.75} style={{ color: 'var(--text-faint)' }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search creators, campaigns, library, screens…"
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              font: 'var(--text-md, 0.9375rem)/1 var(--font-ui)', color: 'var(--text-strong)',
            }}
          />
          <span style={{ font: '500 0.7rem/1 var(--font-ui)', color: 'var(--text-faint)', border: '1px solid var(--border)', borderRadius: 5, padding: '2px 6px' }}>Esc</span>
        </div>

        <div style={{ maxHeight: 360, overflowY: 'auto' }}>
          {query.trim() === '' && (
            <div style={{ padding: '28px 18px', textAlign: 'center', font: 'var(--text-sm)', color: 'var(--text-faint)' }}>
              Start typing to search across the studio.
            </div>
          )}
          {query.trim() !== '' && results.length === 0 && (
            <div style={{ padding: '28px 18px', textAlign: 'center', font: 'var(--text-sm)', color: 'var(--text-faint)' }}>
              No matches for "{query}".
            </div>
          )}
          {results.map((item, i) => (
            <div
              key={item.id}
              onClick={() => select(item)}
              onMouseEnter={() => setActiveIdx(i)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '11px 18px', cursor: 'pointer',
                background: i === activeIdx ? 'var(--rose-glass)' : 'transparent',
              }}
            >
              <Icon name={item.icon} size={15} strokeWidth={1.75} style={{ color: 'var(--accent-deep)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: '600 0.85rem/1.2 var(--font-ui)', color: 'var(--text-strong)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</div>
                <div style={{ font: '500 0.72rem/1 var(--font-ui)', color: 'var(--text-faint)', marginTop: 2 }}>{item.sublabel}</div>
              </div>
              <span style={{ font: '500 0.68rem/1 var(--font-ui)', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.type}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
