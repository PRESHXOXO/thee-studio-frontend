import React from 'react';
import { Card } from '../surfaces/Card.jsx';
import { Button } from '../core/Button.jsx';
import { Icon } from '../core/Icon.jsx';
import { ReferenceImageCard } from './ReferenceImageCard.jsx';

// Step 3 — five standardized identity reference images, individually
// approvable/regeneratable: Headshot (front-neutral, the Step 2 seed) +
// Left ¾, Right ¾, Side Profile, Front Smile (app.py's SHOTS list,
// shotIndex 1/2/4/5 — 4 and 5 were added there specifically for this).
// Full Body (shotIndex 3) is intentionally not in this pack — it's
// generated separately in Step 4 once the face is locked.
export function IdentityReferencePack({
  name, images, regeneratingIndex, generating,
  onApprove, onRegenerate, onSetPrimary, primaryIndex,
  onApproveAll, onContinue, allApproved,
}) {
  return (
    <Card style={{ padding: '24px 24px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h2 style={{ font: 'var(--display-md, 1.5rem)/1.2 var(--font-display)', color: 'var(--text-strong)', margin: '0 0 6px' }}>
          Let's lock {name || 'their'} identity.
        </h2>
        <p style={{ font: 'var(--text-sm)', color: 'var(--text-muted)', margin: 0 }}>
          We'll create five consistent reference photos so your creator remains recognizable from every angle.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12 }}>
        {images.map((img, i) => (
          <ReferenceImageCard
            key={i}
            label={img.label}
            url={img.url}
            status={img.status}
            isPrimary={primaryIndex === i}
            regenerating={regeneratingIndex === i || (generating && !img.url)}
            onApprove={() => onApprove(i)}
            onRegenerate={() => onRegenerate(i)}
            onSetPrimary={() => onSetPrimary(i)}
          />
        ))}
      </div>

      {primaryIndex == null && images.every(i => i.url) && (
        <div style={{ font: 'var(--text-xs)', color: 'var(--status-warn)', textAlign: 'center' }}>
          Pick a primary identity image (star icon) before continuing.
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: 16 }}>
        <Button variant="accent" onClick={onApproveAll} disabled={!images.every(i => i.url)}>
          <Icon name="check-check" size={14} /> Approve All
        </Button>
        <Button variant="primary" onClick={onContinue} disabled={primaryIndex == null || !allApproved}>
          <Icon name="lock" size={14} /> Continue
        </Button>
      </div>
    </Card>
  );
}
