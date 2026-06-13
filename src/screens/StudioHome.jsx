import React from 'react';
import { Button } from '../components/core/Button.jsx';
import { Card } from '../components/surfaces/Card.jsx';
import { Icon } from '../components/core/Icon.jsx';

const SHORTCUTS = [
  { icon: 'clapperboard', label: 'Thee Director', sub: 'Build a prompt', nav: 'director' },
  { icon: 'image',        label: 'Generate',       sub: 'Create imagery',  nav: 'images' },
  { icon: 'sparkles',     label: 'Characters',     sub: 'Manage cast',     nav: 'characters' },
  { icon: 'megaphone',    label: 'Campaigns',      sub: 'Launch a shoot',  nav: 'campaigns' },
];

const HIGHLIGHTS = [
  { icon: 'zap',         label: 'Multi-engine support',  body: 'Switch between FLUX, OpenAI, and local ComfyUI without leaving the app.' },
  { icon: 'lock',        label: 'Identity Lock',         body: "Keep your creator's look consistent across every output with one click." },
  { icon: 'folder-open', label: 'Campaign Library',      body: 'Organize every prompt, proof, and asset into launch-ready campaigns.' },
];

function ShortcutCard({ item, onNav }) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <button
      onClick={() => onNav && onNav(item.nav)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'var(--rose-glass)' : 'var(--white)',
        border: `1px solid ${hovered ? 'var(--border-strong)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-lg)', padding: '20px 18px',
        display: 'flex', flexDirection: 'column', gap: 10,
        cursor: 'pointer', textAlign: 'left', transition: 'all var(--t-base)',
        transform: hovered ? 'translateY(-2px)' : 'none',
        boxShadow: hovered ? 'var(--shadow-md)' : 'var(--shadow-xs)',
      }}
    >
      <span style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'var(--rose-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-deep)' }}>
        <Icon name={item.icon} size={18} strokeWidth={1.75} />
      </span>
      <div>
        <div style={{ font: '600 0.9375rem/1 var(--font-ui)', color: 'var(--text-strong)' }}>{item.label}</div>
        <div style={{ font: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 3 }}>{item.sub}</div>
      </div>
    </button>
  );
}

function HighlightCard({ item }) {
  return (
    <div style={{ display: 'flex', gap: 14, padding: '18px 20px', background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
      <span style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'var(--cream-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-deep)', flexShrink: 0 }}>
        <Icon name={item.icon} size={17} strokeWidth={1.75} />
      </span>
      <div>
        <div style={{ font: '600 0.9375rem/1 var(--font-ui)', color: 'var(--text-strong)', marginBottom: 5 }}>{item.label}</div>
        <div style={{ font: 'var(--text-sm)', color: 'var(--text-muted)', lineHeight: 1.5 }}>{item.body}</div>
      </div>
    </div>
  );
}

export function StudioHome({ onNav }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 48, maxWidth: 'var(--content-max)', margin: '0 auto' }}>

      {/* Hero */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--accent-deep)' }}>Studio Home</div>
        <h1 style={{ font: '600 clamp(36px, 5vw, 60px)/1.05 var(--font-display)', color: 'var(--text-strong)', letterSpacing: '-0.02em', maxWidth: 680, margin: 0 }}>
          The creative OS for AI creators.
        </h1>
        <p style={{ font: 'var(--text-lg)', color: 'var(--text-muted)', maxWidth: 560, margin: 0, lineHeight: 1.6 }}>
          Build iconic creators. Produce stunning content. Scale campaigns with intelligence and intent.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="secondary" onClick={() => {}}>
            <Icon name="upload" size={15} /> Import
          </Button>
          <Button variant="primary" onClick={() => onNav && onNav('images')}>
            <Icon name="sparkles" size={15} /> Generate
          </Button>
        </div>
      </div>

      {/* Studio Shortcuts */}
      <div>
        <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 16 }}>Studio Shortcuts</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {SHORTCUTS.map(s => <ShortcutCard key={s.nav} item={s} onNav={onNav} />)}
        </div>
      </div>

      {/* Recent Generations placeholder */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Recent Generations</div>
          <button onClick={() => onNav && onNav('library')} style={{ font: 'var(--text-sm)', color: 'var(--accent-deep)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            View Library <Icon name="arrow-right" size={13} />
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ aspectRatio: '3/4', borderRadius: 'var(--radius-lg)', background: 'var(--grad-portrait)', opacity: 0.35 }} />
          ))}
        </div>
      </div>

      {/* New in Thee Studio */}
      <div>
        <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 16 }}>New in Thee Studio</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {HIGHLIGHTS.map(h => <HighlightCard key={h.label} item={h} />)}
        </div>
      </div>

    </div>
  );
}
