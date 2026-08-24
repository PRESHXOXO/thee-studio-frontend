import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const batch = {
  status: 'succeeded',
  parentBatchId: 'batch-placement-test',
  requestedCount: 1,
  succeededCount: 1,
  providerBlockedCount: 0,
  failedCount: 0,
  cancelledCount: 0,
  slots: [{ slotIndex: 0, status: 'succeeded', imageUrl: 'https://images.example/result.png' }],
};

vi.mock('../../hooks/useDirectorPendingGeneration.js', () => ({
  useDirectorPendingGeneration: () => ({
    batch,
    renderStatus: 'succeeded',
    statusMessage: '1 of 1 image completed',
    retryingSlots: new Set(),
    retrySlot: vi.fn(),
    handleStatus: vi.fn(),
    setBatch: vi.fn(),
    setRenderStatus: vi.fn(),
  }),
}));

const { ShootBuilder } = await import('./ShootBuilder.jsx');

const PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEAQH/6ZcmWQAAAABJRU5ErkJggg==';
const CREATOR = {
  id: 'creator-placement-test',
  cloudCreatorId: '75ec949c-6241-4739-ba81-fa561f3137cb',
  name: 'Sienna',
  refImages: [PIXEL],
  fields: {},
};

describe('ShootBuilder result placement', () => {
  it('renders generated images beneath Batch and never inside the canvas', () => {
    const { container } = render(
      <ShootBuilder creator={CREATOR} layout="split" recoveryEnabled={false} />,
    );

    const batchRegion = container.querySelector('[data-shoot-region="batch"]');
    const canvasRegion = container.querySelector('.ts-shoot-canvas');
    const results = screen.getByLabelText('Director batch results');

    expect(batchRegion).toContainElement(results);
    expect(batchRegion).toContainElement(screen.getByAltText('Generated image 1'));
    expect(canvasRegion).not.toContainElement(results);
    expect(canvasRegion).not.toContainElement(screen.getByAltText('Generated image 1'));
    expect(canvasRegion).toHaveTextContent('Canvas');
  });
});
