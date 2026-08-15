import React from 'react';
import { Button } from '../core/Button.jsx';
import { Icon } from '../core/Icon.jsx';
import { generationBatchSummary } from '../../lib/generationBatch.js';

export const PROVIDER_BLOCKED_COPY = 'The image provider blocked its generated result during output safety review. Your prompt and references passed THEE STUDIO preflight. No image was returned.';
const EMPTY_RETRYING_SLOTS = new Set();

function failureMessage(slot) {
  const message = slot?.error || slot?.failureMessage || slot?.failureCode;
  if (!message) return 'This image could not be completed. No provider result was returned.';
  return String(message).slice(0, 240);
}

function Placeholder({ slot, requestedCount }) {
  const copy = slot.status === 'running'
    ? `Rendering image ${slot.slotIndex + 1} of ${requestedCount}`
    : slot.status === 'queued' ? 'Waiting to render'
      : slot.status === 'cancelled' ? 'This image was cancelled.'
        : slot.status === 'provider_blocked' ? PROVIDER_BLOCKED_COPY
          : failureMessage(slot);
  const icon = slot.status === 'running' ? 'loader-circle'
    : slot.status === 'queued' ? 'clock-3'
      : slot.status === 'cancelled' ? 'circle-x'
        : 'triangle-alert';
  return <div style={{ minHeight: 0, height: '100%', padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, textAlign: 'center' }}>
    <Icon name={icon} size={22} style={{ color: 'var(--text-faint)' }} />
    <strong style={{ font: '600 0.72rem/1 var(--font-ui)', color: 'var(--text-body)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{slot.status.replace('_', ' ')}</strong>
    <span style={{ font: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.45 }}>{copy}</span>
  </div>;
}

export function GenerationBatchResults({
  batch,
  onRetry,
  retryingSlots = EMPTY_RETRYING_SLOTS,
  onOpen,
  onDownload,
  onSaveAsAnchor,
  compact = false,
}) {
  if (!batch?.slots?.length) return null;
  return <div aria-label="Director batch results" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    <div role="status" style={{ font: '600 0.82rem/1.3 var(--font-ui)', color: 'var(--text-strong)' }}>{generationBatchSummary(batch)}</div>
    <div style={{ display: 'grid', gridTemplateColumns: compact ? 'repeat(auto-fit,minmax(150px,1fr))' : 'repeat(auto-fill,minmax(210px,1fr))', gap: 14 }}>
      {batch.slots.map(slot => {
        const retryable = slot.status === 'provider_blocked' || slot.status === 'failed';
        return <div key={slot.slotIndex} data-slot-index={slot.slotIndex} data-slot-status={slot.status} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ aspectRatio: '3/4', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--surface-inset)' }}>
            {slot.status === 'succeeded' && slot.imageUrl
              ? <button type="button" onClick={() => onOpen?.(slot.imageUrl)} style={{ display: 'block', width: '100%', height: '100%', border: 0, padding: 0, background: 'transparent', cursor: onOpen ? 'zoom-in' : 'default' }}><img src={slot.imageUrl} alt={`Generated image ${slot.slotIndex + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></button>
              : <Placeholder slot={slot} requestedCount={batch.requestedCount} />}
          </div>
          {retryable && <Button variant="secondary" onClick={() => onRetry?.(slot.slotIndex)} loading={retryingSlots.has(slot.slotIndex)} disabled={!onRetry || retryingSlots.has(slot.slotIndex)} style={{ width: '100%', fontSize: '0.75rem' }}><Icon name="refresh-cw" size={13} />Retry image</Button>}
          {slot.status === 'succeeded' && slot.imageUrl && onDownload && <Button variant="secondary" onClick={() => onDownload(slot.imageUrl, slot.slotIndex)} style={{ width: '100%', fontSize: '0.75rem' }}><Icon name="download" size={13} />Download PNG</Button>}
          {slot.status === 'succeeded' && slot.imageUrl && onSaveAsAnchor && <Button variant="secondary" onClick={() => onSaveAsAnchor(slot.imageUrl)} style={{ width: '100%', fontSize: '0.75rem' }}><Icon name="bookmark" size={13} />Save as Anchor</Button>}
        </div>;
      })}
    </div>
  </div>;
}
