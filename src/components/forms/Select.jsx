import React from 'react';
import ReactDOM from 'react-dom';
import { Icon } from '../core/Icon.jsx';

// Custom combobox replacing the native <select>. Drop-in: same
// {value,onChange,options,placeholder,disabled,label,style} interface every
// caller already uses, so New Creator's fields, the Fine-Tune Appearance
// panel, and the Scene selector (Cast + Thee Director, both via ShootBuilder)
// all pick this up with no import changes.
//
// Why hand-rolled instead of Radix/Headless: this codebase has zero UI-lib
// deps and styles everything inline; an unstyled primitive would still need
// all the styling below plus a network install. Built accessible here —
// keyboard nav, ARIA listbox roles, a document.body portal so the menu is
// never clipped by a card's overflow, and viewport collision detection so it
// flips upward / caps its height rather than running off-screen.

function normalize(options) {
  return options.map(o => (typeof o === 'string' ? { value: o, label: o } : o));
}

const MENU_MAX_HEIGHT = 280;
const MENU_GAP = 6;

export function Select({ value, onChange, options = [], placeholder, disabled, label, style }) {
  const opts = React.useMemo(() => normalize(options), [options]);
  const [open, setOpen] = React.useState(false);
  const [highlight, setHighlight] = React.useState(-1);
  const [menuRect, setMenuRect] = React.useState(null); // { left, top, width, maxHeight, dropUp }
  const triggerRef = React.useRef(null);
  const menuRef = React.useRef(null);
  const listRef = React.useRef(null);
  const typeahead = React.useRef({ str: '', at: 0 });

  const selected = opts.find(o => o.value === value) || null;
  const selectedIdx = opts.findIndex(o => o.value === value);

  const position = React.useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom - MENU_GAP;
    const spaceAbove = r.top - MENU_GAP;
    const dropUp = spaceBelow < Math.min(MENU_MAX_HEIGHT, 200) && spaceAbove > spaceBelow;
    const maxHeight = Math.max(140, Math.min(MENU_MAX_HEIGHT, dropUp ? spaceAbove : spaceBelow));
    setMenuRect({
      left: r.left,
      width: r.width,
      top: dropUp ? undefined : r.bottom + MENU_GAP,
      bottom: dropUp ? window.innerHeight - r.top + MENU_GAP : undefined,
      maxHeight,
      dropUp,
    });
  }, []);

  const openMenu = () => {
    if (disabled) return;
    position();
    setHighlight(selectedIdx >= 0 ? selectedIdx : 0);
    setOpen(true);
  };
  const closeMenu = () => { setOpen(false); setHighlight(-1); };

  // Reposition on scroll/resize while open (portal is position:fixed, so it
  // must track the trigger). Capture-phase scroll catches scrolling ancestors.
  React.useEffect(() => {
    if (!open) return;
    position();
    const onScroll = () => position();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open, position]);

  // Click-outside closes.
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (triggerRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      closeMenu();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Keep the highlighted row scrolled into view.
  React.useEffect(() => {
    if (!open || highlight < 0 || !listRef.current) return;
    const row = listRef.current.children[highlight];
    if (row) row.scrollIntoView({ block: 'nearest' });
  }, [highlight, open]);

  const commit = (idx) => {
    const o = opts[idx];
    if (!o) return;
    onChange?.(o.value);
    closeMenu();
    triggerRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (!open) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) { e.preventDefault(); openMenu(); }
      return;
    }
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); setHighlight(h => Math.min(h + 1, opts.length - 1)); break;
      case 'ArrowUp':   e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)); break;
      case 'Home':      e.preventDefault(); setHighlight(0); break;
      case 'End':       e.preventDefault(); setHighlight(opts.length - 1); break;
      case 'Enter':
      case ' ':         e.preventDefault(); commit(highlight); break;
      case 'Escape':    e.preventDefault(); closeMenu(); triggerRef.current?.focus(); break;
      case 'Tab':       closeMenu(); break;
      default:
        // Type-ahead: jump to the first option starting with typed chars.
        if (e.key.length === 1) {
          const now = Date.now();
          typeahead.current.str = (now - typeahead.current.at < 700 ? typeahead.current.str : '') + e.key.toLowerCase();
          typeahead.current.at = now;
          const match = opts.findIndex(o => o.label.toLowerCase().startsWith(typeahead.current.str));
          if (match >= 0) setHighlight(match);
        }
    }
  };

  return (
    <div style={{ position: 'relative', ...style }}>
      {label && <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>}
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={handleKeyDown}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          font: 'var(--text-base)', textAlign: 'left',
          color: selected ? 'var(--text-body)' : 'var(--text-faint)',
          background: 'var(--white)',
          border: `1px solid ${open ? 'var(--accent-deep)' : 'var(--border)'}`,
          borderRadius: 'var(--radius-sm)', padding: '10px 12px 10px 13px',
          cursor: disabled ? 'not-allowed' : 'pointer', outline: 'none', boxSizing: 'border-box',
          opacity: disabled ? 0.55 : 1, fontFamily: 'inherit',
          transition: 'border-color var(--t-fast)',
        }}
      >
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected ? selected.label : (placeholder || 'Select…')}
        </span>
        <Icon name="chevron-down" size={16} style={{ color: 'var(--text-muted)', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform var(--t-fast)' }} />
      </button>

      {open && menuRect && ReactDOM.createPortal(
        <div
          ref={menuRef}
          role="listbox"
          style={{
            position: 'fixed', left: menuRect.left, width: menuRect.width,
            ...(menuRect.dropUp ? { bottom: menuRect.bottom } : { top: menuRect.top }),
            zIndex: 1200,
            background: 'var(--white)', border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
            padding: 5, boxSizing: 'border-box',
            animation: 'select-menu-in 0.12s ease-out both',
          }}
        >
          <div
            ref={listRef}
            style={{ maxHeight: menuRect.maxHeight - 10, overflowY: 'auto', overflowX: 'hidden' }}
          >
            {opts.map((o, i) => {
              const isSelected = o.value === value;
              const isHi = i === highlight;
              return (
                <div
                  key={o.value}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setHighlight(i)}
                  onMouseDown={(e) => { e.preventDefault(); commit(i); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '9px 11px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                    font: `${isSelected ? 600 : 500} 0.85rem/1.2 var(--font-ui)`,
                    color: isSelected ? 'var(--accent-deep)' : 'var(--text-body)',
                    background: isHi ? 'var(--blush)' : (isSelected ? 'var(--rose-deep)' : 'transparent'),
                    transition: 'background var(--t-fast)',
                  }}
                >
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.label}</span>
                  {isSelected && <Icon name="check" size={14} strokeWidth={2.5} style={{ color: 'var(--accent-deep)', flexShrink: 0 }} />}
                </div>
              );
            })}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
