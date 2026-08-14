import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getPendingDirectorJob: vi.fn(),
  resumeDirectorGeneration: vi.fn(),
}));

vi.mock('../api/directorGeneration.js', () => mocks);

import { useDirectorPendingGeneration } from './useDirectorPendingGeneration.js';

describe('useDirectorPendingGeneration', () => {
  beforeEach(() => {
    mocks.getPendingDirectorJob.mockReset();
    mocks.resumeDirectorGeneration.mockReset();
    mocks.getPendingDirectorJob.mockReturnValue({ jobId: 'job-same-1', status: 'still_processing' });
    mocks.resumeDirectorGeneration.mockResolvedValue({ status: 'succeeded', images: ['done.png'] });
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
