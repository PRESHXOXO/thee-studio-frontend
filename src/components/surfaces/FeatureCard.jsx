import React from 'react';
import { Button } from '../core/Button.jsx';

export function FeatureCard({ eyebrow, title, copy, cta, onCta, style }) {
  return (
    <div style={{
      background: 'radial-gradient(circle at 82% 36%, rgba(255,107,74,0.24), transparent 31%), linear-gradient(135deg, rgba(255,255,255,0.92), rgba(255,225,220,0.58))',
      border: '1px solid rgba(255,79,94,0.34)', borderRadius: 'var(--radius-xl)',
      padding: 30, position: 'relative', overflow: 'hidden', minHeight: 220, ...style,
    }}>
      <div style={{ position: 'absolute', right: -34, top: 30, width: 170, height: 170, borderRadius: '50%', background: 'rgba(255,255,255,0.42)', border: '1px solid rgba(255,79,94,0.28)' }} />
      <div style={{ position: 'absolute', right: 22, top: 44, width: 92, height: 92, borderRadius: '50%', background: 'var(--grad-rose)', border: '1px solid rgba(255,107,74,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ font: '600 3rem/1 var(--font-display)', color: 'var(--cherry)' }}>T</span>
      </div>
      {eyebrow && <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--accent-deep)', marginBottom: 12, position: 'relative', zIndex: 2 }}>{eyebrow}</div>}
      <h2 style={{ font: 'var(--display-sm)', color: 'var(--text-strong)', marginBottom: 10, maxWidth: 280, position: 'relative', zIndex: 2 }}>{title}</h2>
      <p style={{ font: 'var(--text-base)', color: 'var(--text-body)', marginBottom: 20, maxWidth: 280, position: 'relative', zIndex: 2 }}>{copy}</p>
      {cta && <Button variant="primary" onClick={onCta} style={{ position: 'relative', zIndex: 2 }}>{cta}</Button>}
    </div>
  );
}
