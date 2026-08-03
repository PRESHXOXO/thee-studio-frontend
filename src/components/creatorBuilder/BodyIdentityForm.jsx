import React from 'react';
import { Card } from '../surfaces/Card.jsx';
import { Select } from '../forms/Select.jsx';
import { Button } from '../core/Button.jsx';
import { Icon } from '../core/Icon.jsx';
import { LABEL, TEXTAREA_STYLE } from './styles.js';
import {
  HEIGHT_RANGES, SHOULDER_WIDTHS, CHEST_FULLNESS, WAIST_DEFINITIONS,
  HIP_WIDTHS, THIGH_FULLNESS, BODY_SHAPES,
} from '../../lib/creatorIdentity.js';
import { getPhysiqueOptions } from '../../lib/promptData.js';

// Step 4 — only Overall Build (already set in Step 1) and Body Shape are
// required; everything else is optional detail. Backend note: there is no
// dedicated full-body-reference generation endpoint — the "Full Body" shot
// already produced in Step 3's five-image pack is reused here, and these
// proportion fields feed into a regenerate call for that one image so it
// reflects the added detail, rather than inventing a new backend call.
export function BodyIdentityForm({ draft, onChange, fullBodyUrl, onRefineFullBody, refining, onContinue }) {
  const body = draft.bodyIdentity;
  const set = (key) => (value) => onChange({ ...draft, bodyIdentity: { ...body, [key]: value } });
  const buildOptions = getPhysiqueOptions(draft.coreIdentity.gender);

  return (
    <Card style={{ padding: '24px 24px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <h2 style={{ font: 'var(--display-md, 1.5rem)/1.2 var(--font-display)', color: 'var(--text-strong)', margin: '0 0 6px' }}>
          Define their proportions
        </h2>
        <p style={{ font: 'var(--text-sm)', color: 'var(--text-muted)', margin: 0 }}>
          This helps Thee Studio preserve the same body across lifestyle and full-body images.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '0 0 140px', aspectRatio: '2/3', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--grad-portrait)', border: '1px solid var(--border)' }}>
          {refining ? (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="loader" size={20} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-deep)' }} />
            </div>
          ) : fullBodyUrl ? (
            <img src={fullBodyUrl} alt="Full body reference" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)' }}>
              <Icon name="person-stand" size={28} strokeWidth={1} />
            </div>
          )}
        </div>

        <div style={{ flex: '1 1 320px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={LABEL}>Overall Build</div>
              <Select value={body.overallBuild} onChange={v => onChange({ ...draft, bodyIdentity: { ...body, overallBuild: v } })} options={buildOptions} />
            </div>
            <div>
              <div style={LABEL}>Body Shape</div>
              <Select value={body.bodyShape} onChange={set('bodyShape')} options={BODY_SHAPES} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={LABEL}>Height Range <span style={{ textTransform: 'none' }}>(optional)</span></div>
              <Select value={body.heightRange} onChange={set('heightRange')} options={HEIGHT_RANGES} />
            </div>
            <div>
              <div style={LABEL}>Shoulder Width <span style={{ textTransform: 'none' }}>(optional)</span></div>
              <Select value={body.shoulderWidth} onChange={set('shoulderWidth')} options={SHOULDER_WIDTHS} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={LABEL}>Bust / Chest Fullness <span style={{ textTransform: 'none' }}>(optional)</span></div>
              <Select value={body.chestOrBustFullness} onChange={set('chestOrBustFullness')} options={CHEST_FULLNESS} />
            </div>
            <div>
              <div style={LABEL}>Waist Definition <span style={{ textTransform: 'none' }}>(optional)</span></div>
              <Select value={body.waistDefinition} onChange={set('waistDefinition')} options={WAIST_DEFINITIONS} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={LABEL}>Hip Width <span style={{ textTransform: 'none' }}>(optional)</span></div>
              <Select value={body.hipWidth} onChange={set('hipWidth')} options={HIP_WIDTHS} />
            </div>
            <div>
              <div style={LABEL}>Thigh Fullness <span style={{ textTransform: 'none' }}>(optional)</span></div>
              <Select value={body.thighFullness} onChange={set('thighFullness')} options={THIGH_FULLNESS} />
            </div>
          </div>
        </div>
      </div>

      <div>
        <div style={LABEL}>Optional Body Description</div>
        <textarea
          value={body.description}
          onChange={e => set('description')(e.target.value)}
          placeholder="Anything else that helps Thee Studio keep their body consistent…"
          rows={2}
          style={TEXTAREA_STYLE}
        />
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: 16 }}>
        <Button variant="accent" onClick={onRefineFullBody} loading={refining} disabled={refining}>
          <Icon name="refresh-cw" size={14} /> Refine Full-Body Reference
        </Button>
        <Button variant="primary" onClick={onContinue} disabled={body.overallBuild === 'Unspecified' || body.bodyShape === 'Unspecified'}>
          Continue <Icon name="arrow-right" size={14} />
        </Button>
      </div>
    </Card>
  );
}
