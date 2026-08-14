import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  characterGenerate: vi.fn(),
  castQuickShootPlain: vi.fn(),
  pollCastQuickShootStatus: vi.fn(),
}));

vi.mock('../api/studio.js', () => mocks);

import { directorIdentityState, generateDirectorPhoto } from '../api/directorGeneration.js';

const { characterGenerate, castQuickShootPlain, pollCastQuickShootStatus } = mocks;
const CLOUD_ID = '2b421abb-b8a5-4f45-b153-1376ee684be8';
const PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ';

describe('Director render gateway', () => {
  beforeEach(() => {
    characterGenerate.mockReset();
    castQuickShootPlain.mockReset();
    pollCastQuickShootStatus.mockReset();
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
    }));
    expect(characterGenerate.mock.calls[1][0]).toEqual(expect.objectContaining({
      creatorId: CLOUD_ID,
      characterImage: null,
      batchSize: 1,
      requestKey: 'director-test:director-image-2',
    }));
    expect(castQuickShootPlain).not.toHaveBeenCalled();
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

  it('never falls back to a generic subject when a selected Cast member cannot be identity-bound', async () => {
    const creator = { id: 'legacy-with-no-image', name: 'Amara', refImages: [], image: null };
    await expect(generateDirectorPhoto({ creator, prompt: 'Amara in France.' }))
      .rejects.toThrow(/cannot bind/i);
    expect(characterGenerate).not.toHaveBeenCalled();
    expect(castQuickShootPlain).not.toHaveBeenCalled();
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
