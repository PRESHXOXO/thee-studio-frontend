import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GenerationBatchResults, PROVIDER_BLOCKED_COPY } from './GenerationBatchResults.jsx';

describe('GenerationBatchResults', () => {
  it('shows successful siblings and a retryable blocked slot in original order', () => {
    const onRetry = vi.fn();
    const { container } = render(<GenerationBatchResults batch={{
      status: 'partial_success', parentBatchId: 'parent-1', requestedCount: 5,
      succeededCount: 4, providerBlockedCount: 1, failedCount: 0, cancelledCount: 0,
      slots: [
        { slotIndex: 0, status: 'succeeded', imageUrl: 'one.png' },
        { slotIndex: 1, status: 'provider_blocked' },
        { slotIndex: 2, status: 'succeeded', imageUrl: 'three.png' },
        { slotIndex: 3, status: 'succeeded', imageUrl: 'four.png' },
        { slotIndex: 4, status: 'succeeded', imageUrl: 'five.png' },
      ],
    }} onRetry={onRetry} />);

    expect(screen.getByText('4 of 5 images completed · 1 provider-blocked')).toBeInTheDocument();
    expect(screen.getByText(PROVIDER_BLOCKED_COPY)).toBeInTheDocument();
    expect(screen.getAllByRole('img')).toHaveLength(4);
    const tiles = [...container.querySelectorAll('[data-slot-index]')];
    expect(tiles.map(tile => `${tile.dataset.slotIndex}:${tile.dataset.slotStatus}`)).toEqual([
      '0:succeeded', '1:provider_blocked', '2:succeeded', '3:succeeded', '4:succeeded',
    ]);
    fireEvent.click(screen.getByRole('button', { name: /retry image/i }));
    expect(onRetry).toHaveBeenCalledWith(1);
  });
});
