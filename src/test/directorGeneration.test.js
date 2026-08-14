import { beforeEach, describe, expect, it, vi } from 'vitest';

const characterGenerate = vi.fn();
const castQuickShootPlain = vi.fn();
const pollCastQuickShootStatus = vi.fn();

vi.mock('../api/studio.js', () => ({
  characterGenerate,
  castQuickShootPlain,
  pollCastQuickShootStatus,
}));

import { directorIdentityState, generateDirectorPhoto } from '../api/directorGeneration.js';

const CLOUD_ID = '2b421abb-b8a5-4f45-b153-1376ee684be8';
const PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ';

describe('Director render gateway', () => {
  beforeEach(() => {
    characterGenerate.mockReset();
    castQuickShootPlain.mockReset();
    pollCastQuickShootStatus.mockReset();
  });

  it('binds a cloud Cast creator by canonical creatorId even when the UI preview is only a signed URL', async () => {
    const creator = {
      id: CLOUD_ID,
      cloudCreatorId: CLOUD_ID,
      cloudProfile: true,
      name: 'Amara',
      refImages: ['https://example.supabase.co/storage/v1/object/sign/creator-references/amara.jpg?token=signed'],
    };
    characterGenerate.mockResolvedValue({ status: 'succeeded', images: ['one.png', 'two.png'] });

    const state = directorIdentityState(creator, []);
    expect(state.locked).toBe(true);
    expect(state.creatorId).toBe(CLOUD_ID);

    const result = await generateDirectorPhoto({ creator, prompt: 'Amara in France.', batchSize: 2 });

    expect(result.images).toEqual(['one.png', 'two.png']);
    expect(characterGenerate).toHaveBeenCalledTimes(1);
    expect(characterGenerate).toHaveBeenCalledWith(expect.objectContaining({
      creatorId: CLOUD_ID,
      characterImage: null,
      batchSize: 2,
    }));
    expect(castQuickShootPlain).not.toHaveBeenCalled();
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
      anchorReferences: [expect.objectContaining({ role: 'outfit' })],
    }));
    expect(castQuickShootPlain).not.toHaveBeenCalled();
  });
});
