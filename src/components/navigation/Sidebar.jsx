import React from 'react';
import { Icon } from '../core/Icon.jsx';

function CreatorChip({ activeCharacter, onNavigate, destination = 'characters' }) {
  return (
    <button
      type="button"
      onClick={() => onNavigate && onNavigate(destination, destination === 'images' && activeCharacter?.id ? { creatorId: activeCharacter.id } : undefined)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 11px', width: '100%',
        borderRadius: 11, background: 'rgba(255,255,255,0.055)',
        border: '1px solid rgba(255,255,255,0.085)', cursor: 'pointer', textAlign: 'left', minHeight: 48,
        transition: 'background var(--t-fast), border-color var(--t-fast)',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.055)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.085)'; }}
    >
      <div style={{
        width: 31, height: 31, borderRadius: '50%', flexShrink: 0,
        background: 'var(--grad-portrait)', boxShadow: '0 0 0 1px rgba(255,255,255,0.18)', overflow: 'hidden',
      }}>
        {activeCharacter?.image && <img src={activeCharacter.image} alt={activeCharacter.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ font: '600 0.75rem/1 var(--font-ui)', color: 'rgba(255,255,255,0.92)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Active Creator</div>
        <div style={{ font: '600 0.66rem/1 var(--font-ui)', letterSpacing: '0.05em', textTransform: 'uppercase', color: activeCharacter ? '#F2A07F' : 'rgba(255,255,255,0.38)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {activeCharacter?.name || 'None selected'}
        </div>
      </div>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: activeCharacter ? 'var(--status-ready)' : 'rgba(255,255,255,0.20)', flexShrink: 0 }} />
    </button>
  );
}

export function Sidebar({
  items = [], active, onNavigate, footer, activeCharacter, creatorDestination, style,
  mobile = false, mobileOpen = false, onMobileClose,
}) {
  const navigate = (id, data) => {
    onNavigate?.(id, data);
    if (mobile) onMobileClose?.();
  };

  const panel = (
    <nav
      aria-label="Studio navigation"
      style={{
        width: mobile ? 'min(86vw, 320px)' : 'var(--sidebar-w)',
        flex: 'none', height: mobile ? '100dvh' : '100vh',
        position: 'fixed', left: 0, top: 0, boxSizing: 'border-box',
        background: 'var(--surface-sidebar)', borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column', padding: '0 12px max(16px, env(safe-area-inset-bottom))',
        zIndex: mobile ? 220 : 100,
        transform: mobile ? (mobileOpen ? 'translateX(0)' : 'translateX(-105%)') : 'none',
        transition: mobile ? 'transform 180ms ease' : undefined,
        boxShadow: mobile && mobileOpen ? '0 24px 70px rgba(13, 10, 16, 0.38)' : undefined,
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', minHeight: mobile ? 64 : 0, paddingTop: mobile ? 'env(safe-area-inset-top)' : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: mobile ? '16px 8px' : '24px 8px 24px', flex: 1, minWidth: 0 }}>
          <span style={{
            width: 28, height: 28, borderRadius: 8, display: 'grid', placeItems: 'center', flexShrink: 0,
            background: 'var(--grad-coral)', color: '#fff', font: '700 0.95rem/1 var(--font-display)', fontStyle: 'italic',
            boxShadow: '0 8px 22px rgba(233,74,114,0.18)',
          }}>T</span>
          <div style={{ lineHeight: 1, minWidth: 0 }}>
            <div style={{ font: '600 1rem/1 var(--font-display)', color: 'rgba(255,255,255,0.96)', letterSpacing: '-0.01em' }}>Thee Studio</div>
            <div style={{ font: '600 0.59rem/1 var(--font-ui)', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.34)', marginTop: 5 }}>Creative OS</div>
          </div>
        </div>
        {mobile && (
          <button
            type="button"
            aria-label="Close navigation"
            onClick={onMobileClose}
            style={{ width: 44, height: 44, display: 'grid', placeItems: 'center', border: 0, background: 'transparent', color: 'rgba(255,255,255,0.72)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
          >
            <Icon name="x" size={20} />
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, overflowY: 'auto', overscrollBehavior: 'contain', flex: 1, paddingBottom: 8 }}>
        {items.map(it => {
          if (it.section) {
            return <div key={it.section} style={{ font: '600 0.61rem/1 var(--font-ui)', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.30)', padding: '16px 11px 7px' }}>{it.section}</div>;
          }
          const on = active === it.id;
          const displayLabel = it.id === 'settings' ? 'Usage & Credits' : it.label;
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => navigate(it.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
                padding: mobile ? '12px 12px' : '9px 11px', minHeight: mobile ? 46 : 38,
                borderRadius: 10, cursor: 'pointer', border: '1px solid transparent',
                font: `${on ? 600 : 500} 0.875rem/1 var(--font-ui)`, color: on ? '#FFFFFF' : 'rgba(255,255,255,0.64)',
                background: on ? 'rgba(255,255,255,0.08)' : 'transparent', transition: 'background var(--t-fast), color var(--t-fast), border-color var(--t-fast)', position: 'relative',
              }}
              onMouseEnter={e => { if (!on) { e.currentTarget.style.color = 'rgba(255,255,255,0.90)'; e.currentTarget.style.background = 'rgba(255,255,255,0.045)'; } }}
              onMouseLeave={e => { if (!on) { e.currentTarget.style.color = 'rgba(255,255,255,0.64)'; e.currentTarget.style.background = 'transparent'; } }}
            >
              <Icon name={it.icon} size={16} strokeWidth={on ? 2 : 1.7} color={on ? '#FF8A68' : undefined} />
              <span style={{ flex: 1 }}>{displayLabel}</span>
              {it.badge && <span style={{ font: '700 0.6rem/1 var(--font-mono)', color: '#F08A6A', padding: '2px 0' }}>{it.badge}</span>}
              {on && <span aria-hidden="true" style={{ position: 'absolute', right: 7, width: 4, height: 4, borderRadius: '50%', background: '#FF8A68' }} />}
            </button>
          );
        })}
      </div>

      {footer !== null && (
        <div style={{ flexShrink: 0, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          {footer || <CreatorChip activeCharacter={activeCharacter} onNavigate={navigate} destination={creatorDestination} />}
        </div>
      )}
    </nav>
  );

  if (!mobile) return panel;
  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onMobileClose}
          style={{ position: 'fixed', inset: 0, border: 0, padding: 0, background: 'rgba(17, 14, 19, 0.48)', backdropFilter: 'blur(3px)', zIndex: 210, cursor: 'default' }}
        />
      )}
      {panel}
    </>
  );
}
