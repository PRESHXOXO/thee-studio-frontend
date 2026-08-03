import React from 'react';
import { Select } from '../forms/Select.jsx';
import { Icon } from '../core/Icon.jsx';
import { LABEL, INPUT_STYLE } from './styles.js';
import {
  FACE_SHAPES, FACIAL_FULLNESS, EYE_SHAPES, BROW_SHAPES, NOSE_SHAPES, LIP_SHAPES,
  HAIR_TEXTURES, HAIR_PARTS,
} from '../../lib/creatorIdentity.js';

// Collapsed by default — progressive disclosure. Nothing here is required;
// every field folds into the free-text description via composeDescription()
// rather than a dedicated backend param (none exist for these).
export function AdvancedAppearancePanel({ core, onChange, hair, onHairChange }) {
  const [open, setOpen] = React.useState(false);
  const set = (key) => (value) => onChange({ ...core, [key]: value });
  const setHair = (key) => (value) => onHairChange({ ...hair, [key]: value });

  const row = (label, key, options) => (
    <div>
      <div style={LABEL}>{label}</div>
      <Select value={core[key]} onChange={set(key)} options={options} />
    </div>
  );

  const hairRow = (label, key, options) => (
    <div>
      <div style={LABEL}>{label}</div>
      <Select value={hair[key]} onChange={setHair(key)} options={options} />
    </div>
  );

  return (
    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 7, background: 'none', border: 'none', cursor: 'pointer',
          padding: 0, font: '600 0.8rem/1 var(--font-ui)', color: 'var(--accent-deep)', fontFamily: 'inherit', width: '100%',
        }}
      >
        <Icon name={open ? 'chevron-down' : 'chevron-right'} size={14} />
        Fine-tune appearance — optional
      </button>

      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {row('Face Shape', 'faceShape', FACE_SHAPES)}
            {row('Facial Fullness', 'facialFullness', FACIAL_FULLNESS)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {row('Eye Shape', 'eyeShape', EYE_SHAPES)}
            {row('Brow Shape', 'browShape', BROW_SHAPES)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {row('Nose Shape', 'noseShape', NOSE_SHAPES)}
            {row('Lip Shape', 'lipShape', LIP_SHAPES)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {hairRow('Hair Texture', 'texture', HAIR_TEXTURES)}
            {hairRow('Hair Part', 'part', HAIR_PARTS)}
          </div>
          <div>
            <div style={LABEL}>Additional Identity Details</div>
            <input
              value={core.additionalIdentityDetails}
              onChange={e => onChange({ ...core, additionalIdentityDetails: e.target.value })}
              placeholder="Freckles, scars, beauty marks, piercings, or other recognizable traits…"
              style={INPUT_STYLE}
            />
          </div>
        </div>
      )}
    </div>
  );
}
