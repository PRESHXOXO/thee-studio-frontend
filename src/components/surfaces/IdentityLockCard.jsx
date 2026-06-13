import React from 'react';
import { Switch } from '../core/Switch.jsx';

export function IdentityLockCard({ locked = true, onToggle, characterName, style }) {
  return (
    <div style={{
      background: locked
        ? 'radial-gradient(circle at 85% 30%, rgba(255,79,94,0.18), transparent 38%), linear-gradient(135deg, var(--plum) 0%, #34232F 100%)'
        : 'var(--surface-card)',
      border: `1px solid ${locked ? 'rgba(255,79,94,0.3)' : 'var(--border)'}`,
      borderRadius: 'var(--radius-lg)', padding: '20px 22px',
      boxShadow: locked ? 'var(--shadow-md)' : 'var(--shadow-xs)', ...style,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: locked ? 'rgba(255,209,199,0.7)' : 'var(--text-muted)' }}>
          Identity Lock
        </div>
        <Switch checked={locked} onChange={onToggle} />
      </div>
      <h3 style={{ font: 'var(--display-sm)', color: locked ? '#fff' : 'var(--text-strong)', marginBottom: 8 }}>
        {locked ? 'Locked' : 'Unlocked'}
      </h3>
      <p style={{ font: 'var(--text-sm)', color: locked ? 'rgba(252,239,233,0.7)' : 'var(--text-muted)', lineHeight: 1.5 }}>
        {locked
          ? `${characterName ? characterName + "'s" : 'Creator'} look, feel, and essence are protected across every generation.`
          : 'Protect the look, feel, and essence of your creator across every generation.'}
      </p>
      {locked && (
        <div style={{ marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 12px', borderRadius: 'var(--radius-pill)', background: 'rgba(255,79,94,0.2)', border: '1px solid rgba(255,79,94,0.3)' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--coral)', flex: 'none' }} />
          <span style={{ font: '600 0.6875rem/1 var(--font-ui)', color: 'var(--peach)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Active</span>
        </div>
      )}
    </div>
  );
}
