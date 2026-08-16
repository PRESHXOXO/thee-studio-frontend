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
      batch: { assets: [{ signedUrl: 'https://private.example/signed' }] },
    }));

    const recovered = await recoverDirectorPendingPointer('describe:cast-7');

    expect(recovered.parentBatchId).toBe('batch-browser');
    expect(invoke).not.toHaveBeenCalled();
    expect(JSON.parse(sessionStorage.getItem(key('describe:cast-7'))).parentBatchId).toBe('batch-browser');
    const durable = JSON.parse(localStorage.getItem(key('describe:cast-7')));
    expect(durable.parentBatchId).toBe('batch-browser');
    expect(durable.batch).toBeUndefined();
    expect(JSON.stringify(durable)).not.toContain('private.example');
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
      body: { creatorId: 'cast-9', workflow: 'talk', outputType: 'photo' },
    });
    expect(recovered.parentBatchId).toBe('batch-server');
    expect(recovered.batch.status).toBe('running');
    expect(JSON.parse(sessionStorage.getItem(key('talk:cast-9:photo'))).parentBatchId).toBe('batch-server');
  });

  it('fails closed instead of guessing or generating when server discovery is ambiguous', async () => {
    invoke.mockResolvedValue({ data: { status: 'ambiguous', activeBatchCount: 2 }, error: null });
    await expect(recoverDirectorPendingPointer('describe:open')).rejects.toMatchObject({
      code: 'DIRECTOR_RECOVERY_AMBIGUOUS',
      status: 'recovery_ambiguous',
    });
    expect(sessionStorage.length).toBe(0);
    expect(localStorage.length).toBe(0);
  });

  it('leaves Director idle when no unfinished compatible batch exists', async () => {
    invoke.mockResolvedValue({ data: { status: 'none' }, error: null });
    await expect(recoverDirectorPendingPointer('describe:open')).resolves.toBeNull();
    expect(invoke).toHaveBeenCalledWith('cast-quick-shoot-recover', {
      body: { creatorId: null, workflow: 'describe', outputType: null },
    });
  });

  it('never treats a saved-Cast browser pointer as compatible with an open subject', async () => {
    localStorage.setItem(key('describe:cast-9'), JSON.stringify({
      parentBatchId: 'saved-cast-parent',
      status: 'running',
    }));
    invoke.mockResolvedValue({ data: { status: 'none' }, error: null });

    await expect(recoverDirectorPendingPointer('describe:open')).resolves.toBeNull();
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(key('describe:open'))).toBeNull();
  });
});
