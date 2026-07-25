import React from 'react';
import { Button } from '../core/Button.jsx';
import { Icon } from '../core/Icon.jsx';
import { LABEL, TEXTAREA_STYLE } from './styles.js';

// Freeform correction field. There's no backend NLP endpoint that turns
// this into structured fields — parseCorrectionText() in creatorIdentity.js
// does best-effort keyword matching, and the raw text always rides along
// as director's notes on the regenerate call either way, so nothing typed
// here is ever silently dropped even when the parser can't match anything.
export function NaturalLanguageRefinement({ value, onChange, onApply, applying }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={LABEL}>What should we change?</div>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Make her cheeks fuller, taper the sides of the pixie cut, and deepen the burgundy hair color."
        rows={2}
        style={TEXTAREA_STYLE}
      />
      <Button variant="accent" size="sm" onClick={onApply} loading={applying} disabled={applying || !value.trim()} style={{ alignSelf: 'flex-start' }}>
        <Icon name="wand-2" size={13} /> Apply Changes
      </Button>
    </div>
  );
}
