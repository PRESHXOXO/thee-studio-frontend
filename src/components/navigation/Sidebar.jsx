import React from 'react';
import { Icon } from '../core/Icon.jsx';

function CreatorChip({ activeCharacter, onNavigate }) {
  return (
    <div
      onClick={() => onNavigate && onNavigate('characters')}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
        borderRadius: 'var(--radius-md)', background: 'var(--cream-deep)',
        border: '1px solid var(--border)', cursor: 'pointer',
        transition: 'background var(--t-fast)',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--blush)'}
      onMouseLeave={e => e.currentTarget.style.background = 'var(--cream-deep)'}
    >
      <div style={{
        width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
        background: 'var(--grad-portrait)',
        boxShadow: '0 0 0 2px var(--champagne)',
        overflow: 'hidden',
      }}>
        {activeCharacter?.image && (
          <img src={activeCharacter.image} alt={activeCharacter.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ font: '600 0.8125rem/1 var(--font-ui)', color: 'var(--text-strong)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Active Creator</div>
        <div style={{ font: '500 0.6875rem/1 var(--font-ui)', color: activeCharacter ? 'var(--accent-deep)' : 'var(--text-faint)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {activeCharacter?.name || 'None selected'}
        </div>
      </div>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: activeCharacter ? 'var(--status-ready)' : 'var(--border)', flexShrink: 0 }} />
    </div>
  );
}

export function Sidebar({ items = [], active, onNavigate, footer, activeCharacter, style }) {
  return (
    <nav style={{
      width: 'var(--sidebar-w)', flex: 'none', height: '100vh',
      position: 'fixed', left: 0, top: 0, boxSizing: 'border-box',
      background: 'var(--surface-sidebar)', borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', padding: '0 12px 16px', zIndex: 100, ...style,
    }}>
      {/* Logo — italic serif monogram, no app-icon box */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, padding: '22px 8px 22px', flexShrink: 0 }}>
        <span style={{
          font: '600 1.7rem/1 var(--font-display)', fontStyle: 'italic', color: 'var(--coral)',
        }}>T</span>
        <div style={{ lineHeight: 1 }}>
          <div style={{ font: '600 1.0625rem/1 var(--font-display)', color: 'var(--text-strong)', letterSpacing: '0.01em' }}>Thee Studio</div>
          <div style={{ font: '500 0.625rem/1 var(--font-ui)', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-faint)', marginTop: 4 }}>Creative OS</div>
        </div>
      </div>

      {/* Nav items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, overflowY: 'auto', flex: 1, paddingBottom: 8 }}>
        {items.map((it) => {
          if (it.section) {
            return (
              <div key={it.section} style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--text-faint)', padding: '14px 12px 6px' }}>
                {it.section}
              </div>
            );
          }
          const on = active === it.id;
          return (
            <button
              key={it.id}
              onClick={() => onNavigate && onNavigate(it.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
                padding: '9px 12px 9px 15px', borderRadius: 0, cursor: 'pointer', border: 'none',
                borderLeft: on ? '2px solid var(--coral)' : '2px solid transparent',
                font: `${on ? 600 : 500} 0.9375rem/1 var(--font-ui)`,
                color: on ? 'var(--text-strong)' : 'var(--text-body)',
                background: 'transparent',
                transition: 'border-color var(--t-fast), color var(--t-fast)', position: 'relative',
              }}
              onMouseEnter={(e) => { if (!on) e.currentTarget.style.color = 'var(--text-strong)'; }}
              onMouseLeave={(e) => { if (!on) e.currentTarget.style.color = 'var(--text-body)'; }}
            >
              <Icon name={it.icon} size={17} strokeWidth={on ? 2.1 : 1.75} color={on ? 'var(--coral)' : undefined} />
              <span style={{ flex: 1 }}>{it.label}</span>
              {it.badge && (
                <span style={{ font: '600 0.625rem/1 var(--font-mono)', color: 'var(--coral)', padding: '2px 0' }}>
                  {it.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Creator chip footer */}
      {footer !== null && (
        <div style={{ flexShrink: 0, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          {footer || <CreatorChip activeCharacter={activeCharacter} onNavigate={onNavigate} />}
        </div>
      )}
    </nav>
  );
}
