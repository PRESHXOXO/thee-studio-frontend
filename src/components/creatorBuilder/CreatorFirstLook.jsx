import React from 'react';
import { Card } from '../surfaces/Card.jsx';
import { Button } from '../core/Button.jsx';
import { Icon } from '../core/Icon.jsx';
import { RefinementControls } from './RefinementControls.jsx';
import { NaturalLanguageRefinement } from './NaturalLanguageRefinement.jsx';

// Step 2 — one strong headshot, refine before committing to the full
// five-image pack. Nothing is permanently locked from this screen.
export function CreatorFirstLook({
  name, imageUrl, loading, error,
  core, hair, onCoreChange, onHairChange,
  correctionText, onCorrectionChange, onApplyCorrection, applyingCorrection,
  onRegenerate, onApprove,
}) {
  return (
    <Card style={{ padding: '24px 24px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h2 style={{ font: 'var(--display-md, 1.5rem)/1.2 var(--font-display)', color: 'var(--text-strong)', margin: '0 0 6px' }}>
          Meet {name || 'your creator'}
        </h2>
        <p style={{ font: 'var(--text-sm)', color: 'var(--text-muted)', margin: 0 }}>
          This is the first look. Refine the face until they feel exactly right.
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{
          width: '100%', maxWidth: 340, aspectRatio: '2/3', borderRadius: 'var(--radius-lg)',
          overflow: 'hidden', border: '2px solid var(--accent-deep)', background: 'var(--grad-portrait)',
          position: 'relative', boxShadow: 'var(--depth-media-hover)',
        }}>
          {loading ? (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--accent-deep)' }}>
              <Icon name="sparkles" size={28} strokeWidth={1.5} style={{ animation: 'spin 1.2s linear infinite' }} />
              <span style={{ font: '500 0.85rem/1 var(--font-ui)' }}>Generating first look…</span>
            </div>
          ) : imageUrl ? (
            <img src={imageUrl} alt={name || 'Creator preview'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)' }}>
              <Icon name="user-round" size={40} strokeWidth={1} />
            </div>
          )}
        </div>
      </div>

      {error && <p style={{ font: 'var(--text-sm)', color: 'var(--cherry)', margin: 0, textAlign: 'center' }}>{error}</p>}

      {!loading && imageUrl && (
        <>
          <div style={{ textAlign: 'center', font: '600 0.9rem/1.4 var(--font-ui)', color: 'var(--text-strong)' }}>
            Does this feel like your creator?
          </div>

          <div>
            <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>Quick adjustments</div>
            <RefinementControls core={core} hair={hair} onCoreChange={onCoreChange} onHairChange={onHairChange} />
          </div>

          <NaturalLanguageRefinement
            value={correctionText}
            onChange={onCorrectionChange}
            onApply={onApplyCorrection}
            applying={applyingCorrection}
          />

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <Button variant="primary" onClick={onApprove}>
              <Icon name="check" size={15} /> Approve This Face
            </Button>
            <Button variant="secondary" onClick={onRegenerate}>
              <Icon name="refresh-cw" size={14} /> Regenerate
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}
