import React from 'react';
import { Card } from '../components/surfaces/Card.jsx';
import { Icon } from '../components/core/Icon.jsx';
import { useProduction } from '../context/ProductionContext.jsx';

export function Settings({ access = null }) {
  const { usage } = useProduction();
  const internalAccess = access?.account_type === 'internal' || access?.billing_exempt === true;
  const percentUsed = Math.min(100, (usage.used / Math.max(usage.included, 1)) * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 860, margin: '0 auto' }}>
      <div>
        <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--accent-deep)', marginBottom: 10 }}>Settings</div>
        <h1 style={{ font: 'var(--display-lg)', color: 'var(--text-strong)', letterSpacing: '-0.015em', margin: '0 0 10px' }}>Usage & credits</h1>
        <p style={{ font: 'var(--text-lg)', color: 'var(--text-muted)', margin: 0, maxWidth: 620 }}>
          Thee Studio manages generation automatically. There is no model or provider setup to configure.
        </p>
      </div>

      <Card variant="rose" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 28, flexWrap: 'wrap', padding: 28 }}>
        <div style={{ minWidth: 260, flex: '1 1 360px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'var(--white)', color: 'var(--accent-deep)', boxShadow: 'var(--shadow-xs)' }}>
              <Icon name="sparkles" size={16} strokeWidth={1.8} />
            </span>
            <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--accent-deep)' }}>Studio generation</div>
          </div>
          <div style={{ font: '600 1.4rem/1.2 var(--font-display)', color: 'var(--text-strong)' }}>
            {internalAccess ? 'Internal access · usage tracked' : `${usage.remaining} credits remaining`}
          </div>
          <p style={{ font: 'var(--text-sm)', color: 'var(--text-muted)', lineHeight: 1.6, margin: '8px 0 0', maxWidth: 560 }}>
            Create normally across Cast, Thee Director, Scene Flow, and Campaigns. Thee Studio routes each generation through the managed pipeline for you.
          </p>
        </div>

        {!internalAccess && (
          <div style={{ width: 'min(100%, 300px)', flex: '0 1 300px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, font: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 9 }}>
              <span>{usage.used} used</span>
              <span>{usage.included} included</span>
            </div>
            <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.72)', overflow: 'hidden' }}>
              <div style={{ width: `${percentUsed}%`, height: '100%', background: 'var(--grad-coral)', borderRadius: 'inherit' }} />
            </div>
          </div>
        )}
      </Card>

      <div style={{ padding: '18px 0 0', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <Icon name="check-circle" size={17} strokeWidth={1.8} style={{ color: 'var(--status-ready)', marginTop: 1 }} />
          <div>
            <div style={{ font: '600 0.9rem/1.2 var(--font-ui)', color: 'var(--text-strong)' }}>Managed automatically</div>
            <div style={{ font: 'var(--text-sm)', color: 'var(--text-muted)', lineHeight: 1.55, marginTop: 4 }}>
              Identity handling, reference routing, quality settings, and provider configuration are controlled by Thee Studio so creators never have to choose an engine.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
