import React from 'react';
import { Button } from '../components/core/Button.jsx';
import { Card } from '../components/surfaces/Card.jsx';
import { Icon } from '../components/core/Icon.jsx';

const IDENTITY_MODULES = [
  { id: 'face',      icon: 'scan-face',    label: 'Face',          desc: 'Soft heart shape, high cheekbones, expressive almond eyes' },
  { id: 'hair',      icon: 'wind',         label: 'Hair',          desc: 'Silk press with body, deep espresso, side part' },
  { id: 'body',      icon: 'person-stand', label: 'Body',          desc: '5\'6", elegant posture, lithe and grounded' },
  { id: 'wardrobe',  icon: 'shirt',        label: 'Wardrobe',      desc: 'Warm corals, silk, tailored minimal, gold jewelry' },
  { id: 'tone',      icon: 'droplet',      label: 'Tone',          desc: 'Warm undertone, dewy luminous deep brown skin' },
  { id: 'personality',icon:'sparkles',     label: 'Personality',   desc: 'Confident, creative, sophisticated, warm' },
  { id: 'niche',     icon: 'camera',       label: 'Content Niche', desc: 'Beauty, fashion editorial, lifestyle' },
];

function IdentityModule({ mod }) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'var(--rose-glass)' : 'var(--white)',
        border: `1px solid ${hovered ? 'var(--border-strong)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-lg)', padding: '18px 16px',
        display: 'flex', flexDirection: 'column', gap: 10,
        transition: 'all var(--t-base)', cursor: 'default',
        transform: hovered ? 'translateY(-1px)' : 'none',
        boxShadow: hovered ? 'var(--shadow-sm)' : 'var(--shadow-xs)',
      }}
    >
      <span style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: 'var(--rose-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-deep)' }}>
        <Icon name={mod.icon} size={16} strokeWidth={1.75} />
      </span>
      <div>
        <div style={{ font: '600 0.875rem/1 var(--font-ui)', color: 'var(--text-strong)', marginBottom: 5 }}>{mod.label}</div>
        <div style={{ font: 'var(--text-sm)', color: 'var(--text-muted)', lineHeight: 1.5 }}>{mod.desc}</div>
      </div>
    </div>
  );
}

export function Characters() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32, maxWidth: 'var(--content-max)', margin: '0 auto' }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
        <div>
          <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--accent-deep)', marginBottom: 10 }}>Character Studio</div>
          <h1 style={{ font: 'var(--display-lg)', color: 'var(--text-strong)', letterSpacing: '-0.015em', margin: '0 0 10px' }}>Character Studio</h1>
          <p style={{ font: 'var(--text-lg)', color: 'var(--text-muted)', margin: 0, maxWidth: 480 }}>Craft consistent, iconic identities for your AI creations.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" onClick={() => {}}>New Creator</Button>
          <Button variant="primary" onClick={() => {}}>
            <Icon name="wand-2" size={15} /> Generate
          </Button>
        </div>
      </div>

      {/* Portrait + Identity grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 24, alignItems: 'start' }}>

        {/* Portrait placeholder */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ aspectRatio: '3/4', borderRadius: 'var(--radius-xl)', background: 'var(--grad-portrait)', boxShadow: 'var(--shadow-md)' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ font: '600 0.9375rem/1 var(--font-ui)', color: 'var(--text-strong)' }}>No creator selected</div>
            <div style={{ font: 'var(--text-sm)', color: 'var(--text-faint)', marginTop: 4 }}>Add a character to begin</div>
          </div>
        </div>

        {/* Identity modules */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {IDENTITY_MODULES.map(mod => <IdentityModule key={mod.id} mod={mod} />)}
        </div>

      </div>

    </div>
  );
}
