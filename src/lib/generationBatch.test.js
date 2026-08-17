import { describe, expect, it } from 'vitest';
import { generationBatchSummary, isTerminalBatchStatus, normalizeGenerationBatch } from './generationBatch.js';

describe('generation batch normalization', () => {
  it('normalizes a legacy one-image success', () => {
    const batch = normalizeGenerationBatch({ status: 'succeeded', images: ['one.png'] }, { requestedCount: 1 });
    expect(batch.requestedCount).toBe(1);
    expect(batch.slots).toEqual([expect.objectContaining({ slotIndex: 0, status: 'succeeded', imageUrl: 'one.png' })]);
  });

  it('fails closed on an explicit malformed parent status', () => {
    const batch = normalizeGenerationBatch({ status: 'mystery_provider_state', requestedCount: 1 });
    expect(batch.status).toBe('failed');
    expect(batch.slots[0]).toEqual(expect.objectContaining({ status: 'failed', imageUrl: null }));
    expect(batch.images).toEqual([]);
  });

  it('preserves original slot order in a partial-success batch', () => {
    const batch = normalizeGenerationBatch({
      status: 'partial_success', parentBatchId: 'parent-1', requestedCount: 3,
      slots: [
        { slotIndex: 0, status: 'succeeded', imageUrl: 'one.png' },
        { slotIndex: 1, status: 'provider_blocked' },
        { slotIndex: 2, status: 'succeeded', imageUrl: 'three.png' },
      ],
    });
    expect(batch.slots.map(slot => [slot.slotIndex, slot.status])).toEqual([[0, 'succeeded'], [1, 'provider_blocked'], [2, 'succeeded']]);
    expect(batch.images).toEqual(['one.png', 'three.png']);
    expect(generationBatchSummary(batch)).toBe('2 of 3 images completed · 1 provider-blocked');
  });

  it('preserves durable storage metadata on the matching slot', () => {
    const batch = normalizeGenerationBatch({
      status: 'succeeded', parentBatchId: 'parent-1', requestedCount: 1,
      slots: [{ slotIndex: 0, status: 'succeeded', assetIds: ['user/output.jpg'] }],
      assets: [{ slotIndex: 0, storagePath: 'user/output.jpg', contentType: 'image/jpeg', size: 123, url: 'signed' }],
    });
    expect(batch.slots[0]).toEqual(expect.objectContaining({
      imageUrl: 'signed', storagePath: 'user/output.jpg', contentType: 'image/jpeg', size: 123,
    }));
  });

  it.each([
    ['partial_success', true],
    ['succeeded', true],
    ['failed', true],
    ['cancelled', true],
    ['queued', false],
    ['running', false],
  ])('classifies %s terminal=%s', (status, terminal) => {
    expect(isTerminalBatchStatus(status)).toBe(terminal);
  });
});
