import React from 'react';
import { Select } from '../forms/Select.jsx';
import { Icon } from '../core/Icon.jsx';
import { LABEL } from './styles.js';
import {
  AGE_RANGES, UNDERTONES, FACE_SHAPES, FACIAL_FULLNESS, EYE_SHAPES, BROW_SHAPES,
  NOSE_SHAPES, LIP_SHAPES, DISTINCTIVE_FEATURES,
} from '../../lib/creatorIdentity.js';
import { SKIN_TONES, HAIR_COLORS, getHairStyleOptions } from '../../lib/promptData.js';

const CONTROLS = [
  { key: 'adultAgeRange',  label: 'Adjust Age',                target: 'core', options: AGE_RANGES },
  { key: 'skinTone',       label: 'Adjust Skin Tone',           target: 'core', options: SKIN_TONES },
  { key: 'faceShape',      label: 'Adjust Face Shape',          target: 'core', options: FACE_SHAPES },
  { key: 'facialFullness', label: 'Adjust Facial Fullness',     target: 'core', options: FACIAL_FULLNESS },
  { key: 'eyeShape',       label: 'Adjust Eyes',                target: 'core', options: EYE_SHAPES },
  { key: 'browShape',      label: 'Adjust Brows',               target: 'core', options: BROW_SHAPES },
  { key: 'noseShape',      label: 'Adjust Nose',                target: 'core', options: NOSE_SHAPES },
  { key: 'lipShape',       label: 'Adjust Lips',                target: 'core', options: LIP_SHAPES },
  { key: 'distinctiveFeatures', label: 'Adjust Distinctive Feature', target: 'core', options: DISTINCTIVE_FEATURES },
];

// Compact popover per control — not a form navigation. Only one open at a
// time; picking a value patches the draft immediately, closes the popover.
function AdjustPopover({ label, options, value, onChange, onClose }) {
  return (
    <div
      onClick={e => e.stopPropagation()}
      style={{
        position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 20, width: 220,
        background: 'var(--surface-raised)', border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', padding: 12,
      }}
    >
      <div style={{ ...LABEL, marginBottom: 8 }}>{label}</div>
      <Select value={value} onChange={v => { onChange(v); onClose(); }} options={options} />
    </div>
  );
}

export function RefinementControls({ core, hair, onCoreChange, onHairChange }) {
  const [openKey, setOpenKey] = React.useState(null);
  const hairOptions = getHairStyleOptions(core.gender);

  const allControls = [
    ...CONTROLS.slice(0, 8),
    { key: 'style', label: 'Adjust Hair', target: 'hair', options: hairOptions },
    ...CONTROLS.slice(8),
  ];

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, position: 'relative' }}>
      {allControls.map(ctrl => {
        const value = ctrl.target === 'hair' ? hair[ctrl.key] : core[ctrl.key];
        return (
          <div key={ctrl.key} style={{ position: 'relative' }}>
            <button
              onClick={() => setOpenKey(k => k === ctrl.key ? null : ctrl.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                borderRadius: 'var(--radius-pill)', cursor: 'pointer',
                border: `1.5px solid ${openKey === ctrl.key ? 'var(--accent-deep)' : 'var(--border)'}`,
                background: openKey === ctrl.key ? 'var(--rose-deep)' : 'transparent',
                color: openKey === ctrl.key ? 'var(--accent-deep)' : 'var(--text-muted)',
                font: '500 0.75rem/1 var(--font-ui)', fontFamily: 'inherit',
              }}
            >
              <Icon name="sliders-horizontal" size={11} strokeWidth={2} /> {ctrl.label}
            </button>
            {openKey === ctrl.key && (
              <AdjustPopover
                label={ctrl.label}
                options={ctrl.options}
                value={value}
                onChange={v => ctrl.target === 'hair' ? onHairChange({ ...hair, [ctrl.key]: v }) : onCoreChange({ ...core, [ctrl.key]: v })}
                onClose={() => setOpenKey(null)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
