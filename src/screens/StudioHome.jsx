import React from 'react';
import { Button } from '../components/core/Button.jsx';
import { Icon } from '../components/core/Icon.jsx';
import { loadLibrary } from '../lib/library.js';

function loadCharacters() {
  try { return JSON.parse(localStorage.getItem('ts_characters') || '[]'); } catch { return []; }
}

const SHORTCUTS = [
  { icon: 'upload',       label: 'Import Character', sub: 'Add to your cast', nav: 'characters' },
  { icon: 'image',        label: 'Image Generator', sub: 'Create imagery',   nav: 'images' },
  { icon: 'clapperboard', label: 'Thee Director',   sub: 'Build a prompt',   nav: 'director' },
  { icon: 'megaphone',    label: 'Campaigns',       sub: 'Launch a shoot',   nav: 'campaigns' },
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

function StatPill({ icon, value, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
      <span style={{ color: 'var(--accent-deep)', display: 'flex' }}>
        <Icon name={icon} size={15} strokeWidth={1.75} />
      </span>
      <span style={{ font: '700 1rem/1 var(--font-ui)', color: 'var(--text-strong)' }}>{value}</span>
      <span style={{ font: 'var(--text-sm)', color: 'var(--text-muted)' }}>{label}</span>
    </div>
  );
}

// Production pipeline summary — derived from library review states.
function PipelineCard({ icon, count, label, tone, onClick }) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
        padding: '16px 18px', borderRadius: 'var(--radius-lg)', cursor: 'pointer',
        background: `linear-gradient(160deg, ${tone.bg} 0%, var(--surface-card) 55%)`,
        border: `1px solid ${hovered ? tone.hex + '66' : 'var(--border)'}`,
        transition: 'all var(--t-base)',
        transform: hovered ? 'translateY(-2px)' : 'none',
        boxShadow: hovered ? `0 10px 28px ${tone.hex}29` : 'var(--shadow-xs)',
      }}
    >
      <span style={{
        width: 38, height: 38, borderRadius: 'var(--radius-md)', flexShrink: 0,
        background: tone.bg, color: tone.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name={icon} size={17} strokeWidth={1.9} />
      </span>
      <div>
        <div style={{ font: '700 1.25rem/1 var(--font-ui)', color: 'var(--text-strong)' }}>{count}</div>
        <div style={{ font: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 3 }}>{label}</div>
      </div>
    </button>
  );
}

// Suggest the user's next move based on current studio state.
function nextStep({ charCount, libCount, unreviewed }) {
  if (charCount === 0) return { icon: 'sparkles', text: 'Start by importing a character — your cast drives everything else.', nav: 'characters', cta: 'Import Character' };
  if (libCount === 0)  return { icon: 'clapperboard', text: 'Your cast is ready. Build a scene and generate your first draft.', nav: 'sceneflow', cta: 'Open Scene Flow' };
  if (unreviewed > 0)  return { icon: 'eye', text: `${unreviewed} draft${unreviewed !== 1 ? 's' : ''} waiting for review. Approve keepers, flag fixes.`, nav: 'library', cta: 'Review Drafts' };
  return { icon: 'megaphone', text: 'Pipeline is clear. Plan your next shoot or launch a campaign.', nav: 'campaigns', cta: 'Open Campaigns' };
}

export function StudioHome({ onNav }) {
  const fileInputRef = React.useRef(null);
  const [recent, setRecent]   = React.useState([]);
  const [charCount, setChars] = React.useState(0);
  const [libCount, setLib]    = React.useState(0);
  const [pipeline, setPipeline] = React.useState({ unreviewed: 0, approved: 0, needs_fix: 0 });

  React.useEffect(() => {
    const lib  = loadLibrary();
    const chars = loadCharacters();
    setRecent(lib.slice(0, 5));
    setLib(lib.length);
    setChars(chars.length);
    const p = { unreviewed: 0, approved: 0, needs_fix: 0 };
    for (const e of lib) {
      const s = e.status || 'unreviewed';
      if (s in p) p[s] += 1;
    }
    setPipeline(p);
  }, []);

  const handleImport = () => fileInputRef.current?.click();
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      onNav && onNav('characters', { image: ev.target.result, name: file.name.replace(/\.[^.]+$/, '') });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 40, maxWidth: 'var(--content-max)', margin: '0 auto' }}>

      {/* Sunset atmosphere glow — sits behind the hero, doesn't affect layout */}
      <div aria-hidden style={{
        position: 'absolute', top: -80, left: -60, width: 640, height: 420,
        background: 'radial-gradient(circle, rgba(255,46,126,0.16) 0%, rgba(255,107,53,0.10) 40%, transparent 72%)',
        pointerEvents: 'none', zIndex: 0, filter: 'blur(2px)',
      }} />

      {/* Hero */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--accent-deep)' }}>Studio Home</div>
        <h1 style={{ font: '600 clamp(32px, 4vw, 52px)/1.05 var(--font-display)', color: 'var(--text-strong)', letterSpacing: '-0.02em', maxWidth: 640, margin: 0 }}>
          The creative OS for AI creators.
        </h1>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
          <Button variant="secondary" onClick={handleImport}><Icon name="upload" size={15} /> Import Creator</Button>
          <Button variant="primary" onClick={() => onNav && onNav('characters')}><Icon name="upload" size={15} /> Import Character</Button>
        </div>

        {/* Live stats */}
        {(charCount > 0 || libCount > 0) && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
            {charCount > 0 && <StatPill icon="sparkles" value={charCount} label={charCount === 1 ? 'creator' : 'creators'} />}
            {libCount  > 0 && <StatPill icon="folder-open" value={libCount} label={libCount === 1 ? 'image saved' : 'images saved'} />}
          </div>
        )}
      </div>

      {/* Next recommended step */}
      {(() => {
        const step = nextStep({ charCount, libCount, unreviewed: pipeline.unreviewed });
        return (
          <div style={{
            position: 'relative', zIndex: 1,
            display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
            padding: '18px 22px', borderRadius: 'var(--radius-xl)',
            background: 'var(--grad-rose)', border: '1px solid rgba(255,178,56,0.28)',
          }}>
            <span style={{
              width: 40, height: 40, borderRadius: 'var(--radius-md)', flexShrink: 0,
              background: 'var(--grad-coral)', color: 'var(--text-on-accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'var(--shadow-coral)',
            }}>
              <Icon name={step.icon} size={18} strokeWidth={2} />
            </span>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--accent-deep)', marginBottom: 5 }}>Next Step</div>
              <div style={{ font: 'var(--text-base)', color: 'var(--text-body)' }}>{step.text}</div>
            </div>
            <Button variant="primary" onClick={() => onNav && onNav(step.nav)}>
              {step.cta} <Icon name="arrow-right" size={15} />
            </Button>
          </div>
        );
      })()}

      {/* Production pipeline */}
      {libCount > 0 && (
        <div>
          <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 14 }}>Production Pipeline</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <PipelineCard icon="eye" count={pipeline.unreviewed} label="Needs review" tone={{ color: 'var(--cobalt)', bg: 'var(--cobalt-soft)', hex: '#4D9FFF' }} onClick={() => onNav && onNav('library')} />
            <PipelineCard icon="wrench" count={pipeline.needs_fix} label="Needs fix" tone={{ color: 'var(--status-warn)', bg: 'var(--status-warn-bg)', hex: '#FFB238' }} onClick={() => onNav && onNav('library')} />
            <PipelineCard icon="check-circle" count={pipeline.approved} label="Approved — publish-ready" tone={{ color: 'var(--status-ready)', bg: 'var(--status-ready-bg)', hex: '#2DD4A8' }} onClick={() => onNav && onNav('library')} />
          </div>
        </div>
      )}

      {/* Studio Shortcuts */}
      <div>
        <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 14 }}>Quick Actions</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
          {SHORTCUTS.map(s => <ShortcutCard key={s.nav} item={s} onNav={onNav} />)}
        </div>
      </div>

      {/* Recent Generations — real data */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Recent Generations</div>
          <button onClick={() => onNav && onNav('library')} style={{ font: 'var(--text-sm)', color: 'var(--accent-deep)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            View all {libCount > 0 && `(${libCount})`} <Icon name="arrow-right" size={13} />
          </button>
        </div>

        {recent.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
            {recent.map(entry => (
              <div
                key={entry.id}
                onClick={() => onNav && onNav('library')}
                style={{
                  aspectRatio: '3/4', borderRadius: 'var(--radius-lg)', overflow: 'hidden', cursor: 'pointer',
                  border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)',
                  transition: 'transform var(--t-base), box-shadow var(--t-base), border-color var(--t-base)',
                  background: 'var(--grad-portrait)',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px) scale(1.015)'; e.currentTarget.style.boxShadow = '0 14px 32px rgba(255,46,126,0.25)'; e.currentTarget.style.borderColor = 'rgba(255,178,56,0.5)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'var(--shadow-xs)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
              >
                <img src={entry.url} alt="Generated" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </div>
            ))}
            {Array.from({ length: Math.max(0, 5 - recent.length) }).map((_, i) => (
              <div key={`ph-${i}`} style={{ aspectRatio: '3/4', borderRadius: 'var(--radius-lg)', background: 'var(--grad-portrait)', opacity: 0.18 }} />
            ))}
          </div>
        ) : (
          <div
            onClick={() => onNav && onNav('characters')}
            style={{ padding: '36px 24px', borderRadius: 'var(--radius-lg)', border: '1.5px dashed var(--border)', textAlign: 'center', cursor: 'pointer', transition: 'border-color var(--t-fast), background var(--t-fast)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.background = 'var(--rose-glass)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.background = ''; }}
          >
            <Icon name="image" size={28} strokeWidth={1.25} style={{ color: 'var(--text-faint)', marginBottom: 10 }} />
            <div style={{ font: '600 0.9375rem/1 var(--font-ui)', color: 'var(--text-muted)', marginBottom: 6 }}>No generations yet</div>
            <div style={{ font: 'var(--text-sm)', color: 'var(--text-faint)' }}>Set up a creator and run Quick Shoot to see results here.</div>
          </div>
        )}
      </div>

    </div>
  );
}
