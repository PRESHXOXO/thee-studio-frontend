import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getPendingDirectorJob: vi.fn(),
  getDirectorBatchSnapshot: vi.fn(),
  resumeDirectorGeneration: vi.fn(),
  retryDirectorGenerationSlot: vi.fn(),
}));

vi.mock('../api/directorGeneration.js', () => mocks);

import { useDirectorPendingGeneration } from './useDirectorPendingGeneration.js';

describe('useDirectorPendingGeneration', () => {
  beforeEach(() => {
    mocks.getPendingDirectorJob.mockReset();
    mocks.resumeDirectorGeneration.mockReset();
    mocks.getDirectorBatchSnapshot.mockReset();
    mocks.retryDirectorGenerationSlot.mockReset();
    mocks.getDirectorBatchSnapshot.mockReturnValue(null);
    mocks.getPendingDirectorJob.mockReturnValue({ parentBatchId: 'job-same-1', status: 'running', requestedCount: 1 });
    mocks.resumeDirectorGeneration.mockResolvedValue({ status: 'succeeded', parentBatchId: 'job-same-1', requestedCount: 1, succeededCount: 1, slots: [{ slotIndex: 0, status: 'succeeded', imageUrl: 'done.png' }], images: ['done.png'] });
  });

  it('checks the saved scope again after a component remount instead of submitting generation', async () => {
    const first = renderHook(() => useDirectorPendingGeneration('describe:cast-1'));
    await waitFor(() => expect(mocks.resumeDirectorGeneration).toHaveBeenCalledWith(
      'describe:cast-1',
      expect.objectContaining({ onStatus: expect.any(Function) }),
    ));
    first.unmount();

    renderHook(() => useDirectorPendingGeneration('describe:cast-1'));
    await waitFor(() => expect(mocks.resumeDirectorGeneration).toHaveBeenCalledTimes(2));
    expect(mocks.getPendingDirectorJob).toHaveBeenCalledWith('describe:cast-1');
  });
});
