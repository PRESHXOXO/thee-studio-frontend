import React from 'react';
import { Button } from '../components/core/Button.jsx';
import { Icon } from '../components/core/Icon.jsx';
import { loadLibrary } from '../lib/library.js';

function loadCharacters() {
  try { return JSON.parse(localStorage.getItem('ts_characters') || '[]'); } catch { return []; }
}

const SHORTCUTS = [
  { icon: 'user-plus',    label: 'New Creator',     sub: 'Build your cast',  nav: 'characters' },
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

export function StudioHome({ onNav }) {
  const fileInputRef = React.useRef(null);
  const [recent, setRecent]   = React.useState([]);
  const [charCount, setChars] = React.useState(0);
  const [libCount, setLib]    = React.useState(0);

  React.useEffect(() => {
    const lib  = loadLibrary();
    const chars = loadCharacters();
    setRecent(lib.slice(0, 5));
    setLib(lib.length);
    setChars(chars.length);
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 40, maxWidth: 'var(--content-max)', margin: '0 auto' }}>

      {/* Hero */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--accent-deep)' }}>Studio Home</div>
        <h1 style={{ font: '600 clamp(32px, 4vw, 52px)/1.05 var(--font-display)', color: 'var(--text-strong)', letterSpacing: '-0.02em', maxWidth: 640, margin: 0 }}>
          The creative OS for AI creators.
        </h1>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
          <Button variant="secondary" onClick={handleImport}><Icon name="upload" size={15} /> Import Creator</Button>
          <Button variant="primary" onClick={() => onNav && onNav('characters')}><Icon name="user-plus" size={15} /> New Creator</Button>
        </div>

        {/* Live stats */}
        {(charCount > 0 || libCount > 0) && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
            {charCount > 0 && <StatPill icon="sparkles" value={charCount} label={charCount === 1 ? 'creator' : 'creators'} />}
            {libCount  > 0 && <StatPill icon="folder-open" value={libCount} label={libCount === 1 ? 'image saved' : 'images saved'} />}
          </div>
        )}
      </div>

      {/* Studio Shortcuts */}
      <div>
        <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 14 }}>Quick Actions</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
            {recent.map(entry => (
              <div
                key={entry.id}
                onClick={() => onNav && onNav('library')}
                style={{ aspectRatio: '3/4', borderRadius: 'var(--radius-lg)', overflow: 'hidden', cursor: 'pointer', boxShadow: 'var(--shadow-xs)', transition: 'transform var(--t-base), box-shadow var(--t-base)', background: 'var(--grad-portrait)' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'var(--shadow-xs)'; }}
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
