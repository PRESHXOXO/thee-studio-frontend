import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  characterGenerate: vi.fn(),
  castQuickShootPlain: vi.fn(),
  pollCastQuickShootStatus: vi.fn(),
  retryCastQuickShootSlot: vi.fn(),
  recoverDirectorPendingPointer: vi.fn(),
}));

vi.mock('../api/studio.js', () => mocks);
vi.mock('../api/directorRecovery.js', () => ({
  recoverDirectorPendingPointer: mocks.recoverDirectorPendingPointer,
}));

import {
  directorIdentityState,
  generateDirectorPhoto,
  getDirectorBatchSnapshot,
  getPendingDirectorJob,
  resumeDirectorGeneration,
  retryDirectorGenerationSlot,
} from '../api/directorGeneration.js';

const { characterGenerate, castQuickShootPlain, pollCastQuickShootStatus, retryCastQuickShootSlot, recoverDirectorPendingPointer } = mocks;
const CLOUD_ID = '2b421abb-b8a5-4f45-b153-1376ee684be8';
const PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ';

function completedBatch(count = 1, status = 'succeeded') {
  const slots = Array.from({ length: count }, (_, slotIndex) => ({
    slotIndex,
    status: 'succeeded',
    imageUrl: `image-${slotIndex}.png`,
  }));
  return {
    status,
    parentBatchId: 'parent-1',
    requestedCount: count,
    succeededCount: count,
    providerBlockedCount: 0,
    failedCount: 0,
    cancelledCount: 0,
    slots,
    images: slots.map(slot => slot.imageUrl),
  };
}

describe('Director parent batch gateway', () => {
  beforeEach(() => {
    characterGenerate.mockReset();
    castQuickShootPlain.mockReset();
    pollCastQuickShootStatus.mockReset();
    retryCastQuickShootSlot.mockReset();
    recoverDirectorPendingPointer.mockReset();
    recoverDirectorPendingPointer.mockResolvedValue(null);
    sessionStorage.clear();
    localStorage.clear();
    vi.useRealTimers();
  });

  it('sends one saved-Cast backend batch for five images and keeps canonical identity server-side', async () => {
    const creator = {
      id: CLOUD_ID,
      cloudCreatorId: CLOUD_ID,
      cloudProfile: true,
      name: 'Amara',
      refImages: ['https://example.supabase.co/storage/v1/object/sign/creator-references/amara.jpg?token=signed'],
    };
    characterGenerate.mockResolvedValueOnce(completedBatch(5));

    const state = directorIdentityState(creator, []);
    expect(state.locked).toBe(true);
    const result = await generateDirectorPhoto({ creator, prompt: 'Amara in France.', batchSize: 5, requestKey: 'director-test' });

    expect(result.images).toHaveLength(5);
    expect(characterGenerate).toHaveBeenCalledTimes(1);
    expect(characterGenerate).toHaveBeenCalledWith(expect.objectContaining({
      creatorId: CLOUD_ID,
      characterImage: null,
      batchSize: 5,
      requestKey: 'director-test',
      returnPending: true,
    }));
    expect(castQuickShootPlain).not.toHaveBeenCalled();
    expect(JSON.stringify(characterGenerate.mock.calls)).not.toContain('example.supabase.co');
    expect(JSON.stringify(characterGenerate.mock.calls)).not.toContain('director-image-');
  });

  it('returns terminal partial_success with successful siblings and the blocked slot intact', async () => {
    characterGenerate.mockResolvedValueOnce({
      status: 'partial_success',
      parentBatchId: 'parent-partial',
      requestedCount: 5,
      succeededCount: 4,
      providerBlockedCount: 1,
      failedCount: 0,
      cancelledCount: 0,
      slots: [
        { slotIndex: 0, status: 'succeeded', imageUrl: 'one.png' },
        { slotIndex: 1, status: 'provider_blocked', failureCode: 'provider_output_blocked' },
        { slotIndex: 2, status: 'succeeded', imageUrl: 'three.png' },
        { slotIndex: 3, status: 'succeeded', imageUrl: 'four.png' },
        { slotIndex: 4, status: 'succeeded', imageUrl: 'five.png' },
      ],
    });

    const result = await generateDirectorPhoto({
      creator: { id: CLOUD_ID, cloudCreatorId: CLOUD_ID, name: 'Amara' },
      prompt: 'Amara in France.',
      batchSize: 5,
      pendingScope: 'test:partial',
    });
    expect(result.status).toBe('partial_success');
    expect(result.images).toEqual(['one.png', 'three.png', 'four.png', 'five.png']);
    expect(result.slots.map(slot => slot.status)).toEqual(['succeeded', 'provider_blocked', 'succeeded', 'succeeded', 'succeeded']);
    expect(getDirectorBatchSnapshot('test:partial')?.batch.status).toBe('partial_success');
  });

  it('persists one parent through timeout and resumes that same parent without resubmitting', async () => {
    vi.useFakeTimers();
    characterGenerate.mockResolvedValue({ status: 'pending', parentBatchId: 'parent-resume-1', requestedCount: 5 });
    pollCastQuickShootStatus.mockResolvedValue({ status: 'pending', batchStatus: 'running', parentBatchId: 'parent-resume-1', requestedCount: 5 });

    const generation = generateDirectorPhoto({
      creator: { id: CLOUD_ID, cloudCreatorId: CLOUD_ID, name: 'Amara' },
      prompt: 'Amara in France.',
      batchSize: 5,
      requestKey: 'resume-test',
      pendingScope: 'test:resume',
      pollIntervalMs: 10,
      pollTimeoutMs: 20,
    });
    const timedOut = expect(generation).rejects.toMatchObject({
      code: 'DIRECTOR_STILL_PROCESSING',
      parentBatchId: 'parent-resume-1',
      persisted: true,
    });
    await vi.advanceTimersByTimeAsync(25);
    await timedOut;
    expect(getPendingDirectorJob('test:resume')).toEqual(expect.objectContaining({
      parentBatchId: 'parent-resume-1',
      requestedCount: 5,
      requestKey: 'resume-test',
    }));

    pollCastQuickShootStatus.mockResolvedValueOnce(completedBatch(5));
    const resumed = resumeDirectorGeneration('test:resume', { pollIntervalMs: 10, pollTimeoutMs: 20 });
    await vi.advanceTimersByTimeAsync(10);
    await expect(resumed).resolves.toEqual(expect.objectContaining({ status: 'succeeded', images: expect.any(Array) }));
    expect(pollCastQuickShootStatus).toHaveBeenLastCalledWith('parent-resume-1', { continueBatch: false });
    expect(characterGenerate).toHaveBeenCalledTimes(1);
    expect(getPendingDirectorJob('test:resume')).toBeNull();
  });

  it('retries one failed slot on the same parent without regenerating siblings', async () => {
    characterGenerate.mockResolvedValueOnce({
      status: 'partial_success', parentBatchId: 'parent-retry', requestedCount: 3,
      slots: [
        { slotIndex: 0, status: 'succeeded', imageUrl: 'one.png' },
        { slotIndex: 1, status: 'failed', failureCode: 'provider_error' },
        { slotIndex: 2, status: 'succeeded', imageUrl: 'three.png' },
      ],
    });
    await generateDirectorPhoto({ creator: { id: CLOUD_ID, cloudCreatorId: CLOUD_ID }, prompt: 'Scene.', batchSize: 3, pendingScope: 'test:retry' });
    retryCastQuickShootSlot.mockResolvedValueOnce({ status: 'running', parentBatchId: 'parent-retry', slotIndex: 1 });
    pollCastQuickShootStatus.mockResolvedValueOnce(completedBatch(3));

    const retry = retryDirectorGenerationSlot('test:retry', 1, { pollIntervalMs: 1, pollTimeoutMs: 20 });
    await expect(retry).resolves.toEqual(expect.objectContaining({ status: 'succeeded' }));
    expect(retryCastQuickShootSlot).toHaveBeenCalledTimes(1);
    expect(retryCastQuickShootSlot).toHaveBeenCalledWith('parent-retry', 1);
    expect(pollCastQuickShootStatus).toHaveBeenCalledWith('parent-retry', { continueBatch: false });
    expect(characterGenerate).toHaveBeenCalledTimes(1);
  });

  it('never falls back to a generic subject when selected Cast cannot be bound', async () => {
    await expect(generateDirectorPhoto({ creator: { id: 'legacy', name: 'Amara' }, prompt: 'Amara in France.' })).rejects.toThrow(/cannot bind/i);
    expect(characterGenerate).not.toHaveBeenCalled();
    expect(castQuickShootPlain).not.toHaveBeenCalled();
  });

  it('uses an explicit Identity reference and preserves structured Outfit handoff', async () => {
    characterGenerate.mockResolvedValue(completedBatch(1));
    await generateDirectorPhoto({
      prompt: 'Paris street style.',
      references: [
        { dataUrl: PIXEL, role: 'identity', name: 'identity.png' },
        { dataUrl: `${PIXEL}2`, role: 'outfit', name: 'look.png' },
      ],
    });
    expect(characterGenerate).toHaveBeenCalledWith(expect.objectContaining({
      characterImage: PIXEL,
      creatorId: null,
      batchSize: 1,
      anchorReferences: [expect.objectContaining({ role: 'outfit' })],
    }));
  });

  it('uses one native parent batch for plain generation too', async () => {
    castQuickShootPlain.mockResolvedValue(completedBatch(2));
    const result = await generateDirectorPhoto({ prompt: 'Empty Paris street at dusk.', batchSize: 2, requestKey: 'plain-test' });
    expect(result.images).toHaveLength(2);
    expect(castQuickShootPlain).toHaveBeenCalledTimes(1);
    expect(castQuickShootPlain).toHaveBeenCalledWith(expect.objectContaining({ batchSize: 2, requestKey: 'plain-test', returnPending: true }));
  });

  it('submits one saved-Cast parent with ordered per-shot Scene Flow prompts', async () => {
    characterGenerate.mockResolvedValue(completedBatch(3));
    const shotPrompts = [
      { shotId: 'shot_home', prompt: 'GLOBAL CONTINUITY\nSHOT 1 mirror selfie' },
      { shotId: 'shot_bag', prompt: 'GLOBAL CONTINUITY\nSHOT 2 bag and shoes detail' },
      { shotId: 'shot_car', prompt: 'GLOBAL CONTINUITY\nSHOT 3 walking to car' },
    ];
    await generateDirectorPhoto({
      creator: { id: CLOUD_ID, cloudCreatorId: CLOUD_ID, name: 'Amara' },
      prompt: 'GLOBAL CONTINUITY',
      batchSize: 3,
      shotPrompts,
      pendingScope: 'test:sequence',
    });
    expect(characterGenerate).toHaveBeenCalledTimes(1);
    expect(characterGenerate).toHaveBeenCalledWith(expect.objectContaining({
      batchSize: 3,
      sequenceShots: shotPrompts,
      creatorId: CLOUD_ID,
    }));
    expect(castQuickShootPlain).not.toHaveBeenCalled();
  });

  it('fails closed before submission when sequence prompts are malformed or open-subject', async () => {
    await expect(generateDirectorPhoto({
      creator: { id: CLOUD_ID, cloudCreatorId: CLOUD_ID, name: 'Amara' },
      prompt: 'Sequence',
      shotPrompts: [{ shotId: 'duplicate', prompt: 'one' }, { shotId: 'duplicate', prompt: 'two' }],
    })).rejects.toThrow(/malformed/i);
    await expect(generateDirectorPhoto({
      prompt: 'Sequence',
      shotPrompts: [{ shotId: 'shot_one', prompt: 'one' }],
    })).rejects.toThrow(/saved Cast or Identity/i);
    expect(characterGenerate).not.toHaveBeenCalled();
    expect(castQuickShootPlain).not.toHaveBeenCalled();
  });

  it('recovers before submission at gateway and never creates a second parent', async () => {
    const key = `thee-studio:director-pending:v3:${encodeURIComponent('describe:cast-1')}`;
    recoverDirectorPendingPointer.mockImplementation(async () => {
      const record = {
        parentBatchId: 'existing-parent',
        status: 'running',
        requestedCount: 2,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem(key, JSON.stringify(record));
      return record;
    });
    pollCastQuickShootStatus.mockResolvedValueOnce(completedBatch(2));

    const result = generateDirectorPhoto({
      creator: { id: CLOUD_ID, cloudCreatorId: CLOUD_ID, name: 'Amara' },
      prompt: 'Scene.',
      batchSize: 2,
      pendingScope: 'describe:cast-1',
      pollIntervalMs: 1,
      pollTimeoutMs: 20,
    });

    await expect(result).resolves.toEqual(expect.objectContaining({ status: 'succeeded' }));
    expect(recoverDirectorPendingPointer).toHaveBeenCalledWith('describe:cast-1');
    expect(characterGenerate).not.toHaveBeenCalled();
    expect(castQuickShootPlain).not.toHaveBeenCalled();
    expect(pollCastQuickShootStatus).toHaveBeenCalledWith('existing-parent', { continueBatch: false });
    expect(localStorage.getItem(key)).toBeNull();
    expect(sessionStorage.getItem(key)).toBeNull();
  });

  it('does not submit when recovery is ambiguous', async () => {
    const ambiguity = Object.assign(new Error('ambiguous'), { code: 'DIRECTOR_RECOVERY_AMBIGUOUS' });
    recoverDirectorPendingPointer.mockRejectedValueOnce(ambiguity);
    await expect(generateDirectorPhoto({
      creator: { id: CLOUD_ID, cloudCreatorId: CLOUD_ID, name: 'Amara' },
      prompt: 'Scene.',
      pendingScope: 'talk:cast-1:photo',
    })).rejects.toMatchObject({ code: 'DIRECTOR_RECOVERY_AMBIGUOUS' });
    expect(characterGenerate).not.toHaveBeenCalled();
    expect(castQuickShootPlain).not.toHaveBeenCalled();
  });

  it('invalidates pre-scope pending pointers instead of auto-resuming them', () => {
    const oldKey = `thee-studio:director-pending:v2:${encodeURIComponent('describe:cast-1')}`;
    localStorage.setItem(oldKey, JSON.stringify({
      parentBatchId: 'legacy-untagged-parent',
      status: 'running',
    }));

    expect(getPendingDirectorJob('describe:cast-1')).toBeNull();
    expect(localStorage.getItem(oldKey)).toBeNull();
  });
});
