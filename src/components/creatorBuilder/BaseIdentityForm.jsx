import React from 'react';
import { Card } from '../surfaces/Card.jsx';
import { Select } from '../forms/Select.jsx';
import { Button } from '../core/Button.jsx';
import { Icon } from '../core/Icon.jsx';
import { AdvancedAppearancePanel } from './AdvancedAppearancePanel.jsx';
import { LABEL, INPUT_STYLE, TEXTAREA_STYLE } from './styles.js';
import { AGE_RANGES, UNDERTONES, DISTINCTIVE_FEATURES } from '../../lib/creatorIdentity.js';
import { GENDERS, SKIN_TONES, HAIR_COLORS, getHairStyleOptions, getPhysiqueOptions } from '../../lib/promptData.js';

const NEW_CREATOR_HAIR_COLORS = [
  ...HAIR_COLORS,
  { value: 'vibrant pink', label: 'Pink' },
];

// Step 1 — highest-impact identity details only. Brand/styling fields
// (jewelry, clothing, world, energy) deliberately live on Step 5 now, not
// mixed in here — that was the core complaint with the old single-page form.
export function BaseIdentityForm({ draft, onChange, onSubmit, submitting }) {
  const { name, coreIdentity: core, hairIdentity: hair, bodyIdentity: body } = draft;

  const setName = (v) => onChange({ ...draft, name: v });
  const setCore = (next) => onChange({ ...draft, coreIdentity: next });
  const setHair = (next) => onChange({ ...draft, hairIdentity: next });
  const setBuild = (v) => onChange({ ...draft, bodyIdentity: { ...body, overallBuild: v } });

  const hairOptions = getHairStyleOptions(core.gender);
  const buildOptions = getPhysiqueOptions(core.gender);

  const requiredFilled = !!(
    name.trim() && core.adultAgeRange && core.gender !== 'Unspecified' &&
    core.skinTone !== 'Unspecified' && core.skinUndertone !== 'Unspecified' &&
    hair.style !== 'Unspecified' && hair.color !== 'Unspecified' &&
    body.overallBuild !== 'Unspecified' && core.distinctiveFeatures
  );

  const handleGenderChange = (g) => {
    const newHairStyle = getHairStyleOptions(g).find(o => o.value === hair.style) ? hair.style : 'Unspecified';
    const newBuild = getPhysiqueOptions(g).find(o => o.value === body.overallBuild) ? body.overallBuild : 'Unspecified';
    onChange({
      ...draft,
      coreIdentity: { ...core, gender: g },
      hairIdentity: { ...hair, style: newHairStyle },
      bodyIdentity: { ...body, overallBuild: newBuild },
    });
  };

  return (
    <Card style={{ padding: '20px 20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 'var(--radius)',
          background: 'var(--rose-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--accent-deep)', flexShrink: 0,
        }}>
          <Icon name="wand-2" size={16} strokeWidth={1.75} />
        </div>
        <div>
          <div style={{ font: '600 0.88rem/1 var(--font-ui)', color: 'var(--text-strong)' }}>Build with Thee Studio</div>
          <div style={{ font: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 3 }}>
            Save identity details, then add private creator reference photos.
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <div style={LABEL}>Creator Name</div>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Angel, Maya, Jade…" style={INPUT_STYLE} />
        </div>
        <div>
          <div style={LABEL}>Adult Age Range</div>
          <Select value={core.adultAgeRange} onChange={v => setCore({ ...core, adultAgeRange: v })} options={AGE_RANGES} placeholder="Select an age range" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <div style={LABEL}>Gender</div>
          <Select value={core.gender} onChange={handleGenderChange} options={GENDERS} />
        </div>
        <div>
          <div style={LABEL}>Distinctive Feature</div>
          <Select value={core.distinctiveFeatures} onChange={v => setCore({ ...core, distinctiveFeatures: v })} options={DISTINCTIVE_FEATURES} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <div style={LABEL}>Skin Tone</div>
          <Select value={core.skinTone} onChange={v => setCore({ ...core, skinTone: v })} options={SKIN_TONES} />
        </div>
        <div>
          <div style={LABEL}>Skin Undertone</div>
          <Select value={core.skinUndertone} onChange={v => setCore({ ...core, skinUndertone: v })} options={UNDERTONES} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <div style={LABEL}>Hair Style</div>
          <Select value={hair.style} onChange={v => setHair({ ...hair, style: v })} options={hairOptions} />
        </div>
        <div>
          <div style={LABEL}>Hair Color</div>
          <Select value={hair.color} onChange={v => setHair({ ...hair, color: v })} options={NEW_CREATOR_HAIR_COLORS} />
        </div>
      </div>

      <div>
        <div style={LABEL}>Their Build</div>
        <Select value={body.overallBuild} onChange={setBuild} options={buildOptions} />
      </div>

      <div>
        <div style={LABEL}>Describe them in your own words <span style={{ textTransform: 'none', letterSpacing: 0 }}>(optional)</span></div>
        <textarea
          value={core.naturalLanguageDescription}
          onChange={e => setCore({ ...core, naturalLanguageDescription: e.target.value })}
          placeholder="A glamorous, full-figured Black woman in her early 30s with a short burgundy pixie cut, full cheeks, deep dimples, and a warm smile."
          rows={3}
          style={TEXTAREA_STYLE}
        />
        <div style={{ font: 'var(--text-xs)', color: 'var(--text-faint)', marginTop: 6 }}>
          Optional — describe identity details you want preserved in future workflows.
        </div>
      </div>

      <AdvancedAppearancePanel core={core} onChange={setCore} hair={hair} onHairChange={setHair} />

      <Button
        variant="primary"
        loading={submitting}
        disabled={submitting || !requiredFilled}
        onClick={onSubmit}
        full
        style={{ marginTop: 4 }}
      >
        <Icon name="arrow-right" size={16} />
        {submitting ? 'Saving…' : 'Save & Add Headshot'}
      </Button>
      {!requiredFilled && (
        <div style={{ font: 'var(--text-xs)', color: 'var(--text-faint)', textAlign: 'center', marginTop: -8 }}>
          Fill in name, age range, gender, skin tone + undertone, hair style + color, build, and distinctive feature to continue.
        </div>
      )}
    </Card>
  );
}
