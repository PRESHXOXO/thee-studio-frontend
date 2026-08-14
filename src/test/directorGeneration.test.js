import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  characterGenerate: vi.fn(),
  castQuickShootPlain: vi.fn(),
  pollCastQuickShootStatus: vi.fn(),
}));

vi.mock('../api/studio.js', () => mocks);

import {
  directorIdentityState,
  generateDirectorPhoto,
  getPendingDirectorJob,
  resumeDirectorGeneration,
} from '../api/directorGeneration.js';

const { characterGenerate, castQuickShootPlain, pollCastQuickShootStatus } = mocks;
const CLOUD_ID = '2b421abb-b8a5-4f45-b153-1376ee684be8';
const PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ';

describe('Director render gateway', () => {
  beforeEach(() => {
    characterGenerate.mockReset();
    castQuickShootPlain.mockReset();
    pollCastQuickShootStatus.mockReset();
    sessionStorage.clear();
    vi.useRealTimers();
  });

  it('binds a cloud Cast creator and serializes multi-image Responses renders one at a time', async () => {
    const creator = {
      id: CLOUD_ID,
      cloudCreatorId: CLOUD_ID,
      cloudProfile: true,
      name: 'Amara',
      refImages: ['https://example.supabase.co/storage/v1/object/sign/creator-references/amara.jpg?token=signed'],
    };
    characterGenerate
      .mockResolvedValueOnce({ status: 'succeeded', images: ['one.png'] })
      .mockResolvedValueOnce({ status: 'succeeded', images: ['two.png'] });

    const state = directorIdentityState(creator, []);
    expect(state.locked).toBe(true);
    expect(state.creatorId).toBe(CLOUD_ID);

    const result = await generateDirectorPhoto({
      creator,
      prompt: 'Amara in France.',
      batchSize: 2,
      requestKey: 'director-test',
    });

    expect(result.images).toEqual(['one.png', 'two.png']);
    expect(characterGenerate).toHaveBeenCalledTimes(2);
    expect(characterGenerate.mock.calls[0][0]).toEqual(expect.objectContaining({
      creatorId: CLOUD_ID,
      characterImage: null,
      batchSize: 1,
      requestKey: 'director-test:director-image-1',
      returnPending: true,
    }));
    expect(characterGenerate.mock.calls[1][0]).toEqual(expect.objectContaining({
      creatorId: CLOUD_ID,
      characterImage: null,
      batchSize: 1,
      requestKey: 'director-test:director-image-2',
    }));
    expect(castQuickShootPlain).not.toHaveBeenCalled();
    expect(JSON.stringify(characterGenerate.mock.calls)).not.toContain('example.supabase.co');
  });

  it('does not submit image two until image one succeeds', async () => {
    let finishFirst;
    characterGenerate
      .mockImplementationOnce(() => new Promise(resolve => { finishFirst = resolve; }))
      .mockResolvedValueOnce({ status: 'succeeded', images: ['two.png'] });

    const generation = generateDirectorPhoto({
      creator: { id: CLOUD_ID, cloudCreatorId: CLOUD_ID, name: 'Amara' },
      prompt: 'Amara in France.',
      batchSize: 2,
      requestKey: 'strict-sequence',
      pendingScope: 'test:strict-sequence',
    });
    await Promise.resolve();
    expect(characterGenerate).toHaveBeenCalledTimes(1);

    finishFirst({ status: 'succeeded', images: ['one.png'] });
    await expect(generation).resolves.toEqual({ status: 'succeeded', images: ['one.png', 'two.png'] });
    expect(characterGenerate).toHaveBeenCalledTimes(2);
  });

  it('stops the serialized batch when a render fails instead of launching later images', async () => {
    const creator = { id: CLOUD_ID, cloudCreatorId: CLOUD_ID, cloudProfile: true, name: 'Amara' };
    characterGenerate
      .mockResolvedValueOnce({ status: 'succeeded', images: ['one.png'] })
      .mockRejectedValueOnce(new Error('provider failed'));

    await expect(generateDirectorPhoto({ creator, prompt: 'Amara in France.', batchSize: 4, requestKey: 'stop-test' }))
      .rejects.toThrow(/provider failed/i);
    expect(characterGenerate).toHaveBeenCalledTimes(2);
  });

  it('rejects a partial batch instead of returning completed earlier images', async () => {
    const creator = { id: CLOUD_ID, cloudCreatorId: CLOUD_ID, cloudProfile: true, name: 'Amara' };
    characterGenerate
      .mockResolvedValueOnce({ status: 'succeeded', images: ['one.png'] })
      .mockResolvedValueOnce({ status: 'succeeded', images: [] });

    await expect(generateDirectorPhoto({ creator, prompt: 'Amara in France.', batchSize: 2, requestKey: 'partial-test' }))
      .rejects.toThrow(/batch was not treated as complete/i);
    expect(characterGenerate).toHaveBeenCalledTimes(2);
  });

  it('persists a pending job through timeout and resumes the same job without resubmitting', async () => {
    vi.useFakeTimers();
    characterGenerate.mockResolvedValue({ status: 'pending', jobId: 'job-resume-1' });
    pollCastQuickShootStatus.mockResolvedValue({ status: 'pending' });

    const generation = generateDirectorPhoto({
      creator: { id: CLOUD_ID, cloudCreatorId: CLOUD_ID, name: 'Amara' },
      prompt: 'Amara in France.',
      requestKey: 'resume-test',
      pendingScope: 'test:resume',
      pollIntervalMs: 10,
      pollTimeoutMs: 20,
    });
    const timeoutResult = expect(generation).rejects.toMatchObject({
      code: 'DIRECTOR_STILL_PROCESSING',
      status: 'still_processing',
      jobId: 'job-resume-1',
    });
    await vi.advanceTimersByTimeAsync(25);
    await timeoutResult;

    expect(getPendingDirectorJob('test:resume')).toEqual(expect.objectContaining({
      jobId: 'job-resume-1',
      requestKey: 'resume-test',
      status: 'still_processing',
    }));

    pollCastQuickShootStatus.mockResolvedValueOnce({ status: 'succeeded', images: ['resumed.png'] });
    const resumed = resumeDirectorGeneration('test:resume', { pollIntervalMs: 10, pollTimeoutMs: 20 });
    await vi.advanceTimersByTimeAsync(10);
    await expect(resumed).resolves.toEqual({ status: 'succeeded', images: ['resumed.png'] });
    expect(pollCastQuickShootStatus).toHaveBeenLastCalledWith('job-resume-1');
    expect(characterGenerate).toHaveBeenCalledTimes(1);
    expect(getPendingDirectorJob('test:resume')).toBeNull();
  });

  it('never falls back to a generic subject when a selected Cast member cannot be identity-bound', async () => {
    const creator = { id: 'legacy-with-no-image', name: 'Amara', refImages: [], image: null };
    await expect(generateDirectorPhoto({ creator, prompt: 'Amara in France.' }))
      .rejects.toThrow(/cannot bind/i);
    expect(characterGenerate).not.toHaveBeenCalled();
    expect(castQuickShootPlain).not.toHaveBeenCalled();
  });

  it('does not treat a display-only signed URL as an identity lock for a non-canonical Cast record', () => {
    const state = directorIdentityState({
      id: 'legacy-cast',
      name: 'Amara',
      refImages: ['https://example.supabase.co/storage/v1/object/sign/creator-references/amara.jpg?token=signed'],
    }, []);
    expect(state.locked).toBe(false);
    expect(state.warning).toMatch(/cannot bind/i);
  });

  it('requires Identity before non-Cast styling references can generate', async () => {
    await expect(generateDirectorPhoto({
      prompt: 'Paris street style.',
      references: [{ dataUrl: PIXEL, role: 'outfit', name: 'look.png' }],
    })).rejects.toThrow(/no Identity reference/i);
    expect(castQuickShootPlain).not.toHaveBeenCalled();
  });

  it('uses an explicit Identity reference for an open-subject session', async () => {
    characterGenerate.mockResolvedValue({ status: 'succeeded', images: ['locked.png'] });
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
    expect(castQuickShootPlain).not.toHaveBeenCalled();
  });

  it('keeps native batch generation for plain text-to-image with no identity references', async () => {
    castQuickShootPlain.mockResolvedValue({ status: 'succeeded', images: ['a.png', 'b.png'] });
    const result = await generateDirectorPhoto({ prompt: 'Empty Paris street at dusk.', batchSize: 2, requestKey: 'plain-test' });
    expect(result.images).toEqual(['a.png', 'b.png']);
    expect(castQuickShootPlain).toHaveBeenCalledWith(expect.objectContaining({ batchSize: 2, requestKey: 'plain-test' }));
    expect(characterGenerate).not.toHaveBeenCalled();
  });
});
