import React from 'react';
import { Card } from '../surfaces/Card.jsx';
import { Select } from '../forms/Select.jsx';
import { Button } from '../core/Button.jsx';
import { Icon } from '../core/Icon.jsx';
import { LABEL, INPUT_STYLE } from './styles.js';
import { PHOTOGRAPHY_STYLES } from '../../lib/creatorIdentity.js';
import { CONTENT_NICHES, STYLE_DIRECTIONS, getClothingOptions, getJewelryOptions } from '../../lib/promptData.js';

function Pill({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="ts-pill"
      style={{
        padding: '6px 14px', borderRadius: 'var(--radius-pill)', cursor: 'pointer',
        border: `1.5px solid ${active ? 'var(--accent-deep)' : 'var(--border)'}`,
        background: active ? 'var(--rose-deep)' : 'transparent',
        color: active ? 'var(--accent-deep)' : 'var(--text-muted)',
        font: '500 0.78rem/1 var(--font-ui)',
      }}
    >
      {label}
    </button>
  );
}

function toggle(list, value) {
  return list.includes(value) ? list.filter(v => v !== value) : [...list, value];
}

// Step 5 — brand/styling only. Editing anything here never touches
// coreIdentity/hairIdentity/bodyIdentity/identityReferences — the locked
// face is structurally unreachable from this component.
export function CreatorBrandForm({ draft, onChange, onSave, saving }) {
  const brand = draft.brandProfile;
  const set = (key) => (value) => onChange({ ...draft, brandProfile: { ...brand, [key]: value } });
  const clothingOptions = getClothingOptions(draft.coreIdentity.gender);
  const jewelryOptions = getJewelryOptions(draft.coreIdentity.gender);

  return (
    <Card style={{ padding: '24px 24px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <h2 style={{ font: 'var(--display-md, 1.5rem)/1.2 var(--font-display)', color: 'var(--text-strong)', margin: '0 0 6px' }}>
          Build {draft.name || "their"}'s world
        </h2>
        <p style={{ font: 'var(--text-sm)', color: 'var(--text-muted)', margin: 0 }}>
          The identity is locked. Now decide how they dress, create, and show up online.
        </p>
      </div>

      <div>
        <div style={LABEL}>Their World</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
          {CONTENT_NICHES.map(n => (
            <Pill key={n} label={n} active={brand.worlds.includes(n)} onClick={() => set('worlds')(toggle(brand.worlds, n))} />
          ))}
        </div>
      </div>

      <div>
        <div style={LABEL}>Their Energy</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
          {STYLE_DIRECTIONS.map(d => (
            <Pill key={d} label={d} active={brand.energies.includes(d)} onClick={() => set('energies')(toggle(brand.energies, d))} />
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <div style={LABEL}>Signature Look / Clothing</div>
          <Select value={brand.signatureClothing} onChange={set('signatureClothing')} options={clothingOptions} />
        </div>
        <div>
          <div style={LABEL}>Signature Jewelry</div>
          <Select value={brand.signatureJewelry} onChange={set('signatureJewelry')} options={jewelryOptions} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <div style={LABEL}>Makeup Style</div>
          <input value={brand.makeupStyle} onChange={e => set('makeupStyle')(e.target.value)} placeholder="e.g. Soft glam, bold red lip…" style={INPUT_STYLE} />
        </div>
        <div>
          <div style={LABEL}>Signature Colors</div>
          <input value={brand.signatureColors} onChange={e => set('signatureColors')(e.target.value)} placeholder="e.g. Burgundy, cream, gold…" style={INPUT_STYLE} />
        </div>
      </div>

      <div>
        <div style={LABEL}>Content Photography Style</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
          {PHOTOGRAPHY_STYLES.map(s => (
            <Pill key={s} label={s} active={brand.photographyStyles.includes(s)} onClick={() => set('photographyStyles')(toggle(brand.photographyStyles, s))} />
          ))}
        </div>
      </div>

      <div>
        <div style={LABEL}>Creator Niche</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
          {CONTENT_NICHES.map(n => (
            <Pill key={n} label={n} active={brand.niches.includes(n)} onClick={() => set('niches')(toggle(brand.niches, n))} />
          ))}
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
        <Button variant="accent" onClick={onSave} loading={saving} disabled={saving} full>
          <Icon name="user-check" size={15} /> {saving ? 'Saving…' : 'Save Creator'}
        </Button>
      </div>
    </Card>
  );
}
