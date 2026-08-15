import { beforeEach, describe, expect, it, vi } from 'vitest';

const invoke = vi.fn();
vi.mock('../lib/supabase.js', () => ({
  getSupabase: () => ({ functions: { invoke } }),
}));

import { recoverDirectorPendingPointer } from './directorRecovery.js';

const PREFIX = 'thee-studio:director-pending:v2:';
const key = scope => `${PREFIX}${encodeURIComponent(scope)}`;

describe('recoverDirectorPendingPointer', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    invoke.mockReset();
  });

  it('reuses one compatible browser pointer without calling the server', async () => {
    sessionStorage.setItem(key('describe:cast-7'), JSON.stringify({
      parentBatchId: 'batch-browser',
      requestedCount: 3,
      status: 'running',
      scopeKey: 'describe:cast-7',
    }));

    const recovered = await recoverDirectorPendingPointer('describe:open');

    expect(recovered.parentBatchId).toBe('batch-browser');
    expect(invoke).not.toHaveBeenCalled();
    expect(JSON.parse(sessionStorage.getItem(key('describe:open'))).parentBatchId).toBe('batch-browser');
  });

  it('discovers exactly one active server batch when browser state is gone', async () => {
    invoke.mockResolvedValue({
      data: {
        status: 'found',
        parentBatchId: 'batch-server',
        batchStatus: 'running',
        requestedCount: 3,
      },
      error: null,
    });

    const recovered = await recoverDirectorPendingPointer('talk:cast-9:photo');

    expect(invoke).toHaveBeenCalledWith('cast-quick-shoot-recover', {
      body: { creatorId: 'cast-9' },
    });
    expect(recovered.parentBatchId).toBe('batch-server');
    expect(recovered.batch.status).toBe('running');
    expect(JSON.parse(sessionStorage.getItem(key('talk:cast-9:photo'))).parentBatchId).toBe('batch-server');
  });

  it('fails closed instead of guessing when the server cannot identify one batch', async () => {
    invoke.mockResolvedValue({ data: { status: 'ambiguous', activeBatchCount: 2 }, error: null });
    await expect(recoverDirectorPendingPointer('describe:open')).resolves.toBeNull();
    expect(sessionStorage.length).toBe(0);
  });
});
