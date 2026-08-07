import { describe, expect, it, vi, beforeEach, afterAll } from 'vitest';

const invoke = vi.fn();
const createSignedUrl = vi.fn(async () => ({ data: { signedUrl: 'https://signed.example/asset.png' }, error: null }));

vi.mock('../lib/supabase.js', () => ({
  hasSupabaseConfig: () => true,
  getSupabase: () => ({
    functions: { invoke },
    storage: { from: () => ({ createSignedUrl }) },
  }),
}));

const originalFetch = global.fetch;

beforeEach(() => {
  invoke.mockReset();
  createSignedUrl.mockClear();
  // Any call that reaches real fetch means a Cast workflow leaked to
  // /gradio_api or localhost instead of going through Supabase in cloud mode.
  global.fetch = vi.fn(() => { throw new Error('Unexpected network fetch — Cast workflow did not stay on Supabase in cloud mode.'); });
});

afterAll(() => {
  global.fetch = originalFetch;
});

import { analyzeCharacterReferences, characterGenerate, generateReferenceSet, castQuickShootPlain, extractFaceAnchor } from './studio.js';

const PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEAQH/6ZcmWQAAAABJRU5ErkJggg==';

describe('Cast cloud workflows never call local Gradio', () => {
  it('analyzeCharacterReferences calls cast-analyze-references, not /gradio_api', async () => {
    invoke.mockResolvedValueOnce({ data: { profile: { face: 'x', hair: 'y', tone: 'z' }, identityAnchor: PIXEL }, error: null });
    const result = await analyzeCharacterReferences([PIXEL]);
    expect(invoke).toHaveBeenCalledWith('cast-analyze-references', expect.objectContaining({ body: { references: [{ role: 'identity', image: PIXEL }] } }));
    expect(result.faceAnchor).toBe(PIXEL);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('analyzeCharacterReferences resolves by creatorId for a saved creator', async () => {
    invoke.mockResolvedValueOnce({ data: { profile: { face: 'x', hair: 'y', tone: 'z' }, identityAnchor: null }, error: null });
    await analyzeCharacterReferences([PIXEL], { creatorId: 'creator-1' });
    expect(invoke).toHaveBeenCalledWith('cast-analyze-references', expect.objectContaining({ body: { creatorId: 'creator-1' } }));
  });

  it('extractFaceAnchor is a no-op in cloud mode (folded into analyze)', async () => {
    await expect(extractFaceAnchor(PIXEL)).resolves.toBe('');
    expect(invoke).not.toHaveBeenCalled();
  });

  it('characterGenerate calls cast-quick-shoot, signs storage paths, never Gradio', async () => {
    invoke.mockResolvedValueOnce({ data: { assets: [{ storagePath: 'user/creator/quick-shoot/job/0.png' }], summary: 'ok' }, error: null });
    const result = await characterGenerate({ positivePrompt: 'p', characterImage: PIXEL, creatorId: 'creator-1' });
    expect(invoke).toHaveBeenCalledWith('cast-quick-shoot', expect.objectContaining({ body: expect.objectContaining({ creatorId: 'creator-1', characterImage: PIXEL }) }));
    expect(createSignedUrl).toHaveBeenCalledWith('user/creator/quick-shoot/job/0.png', 3600);
    expect(result.images).toEqual(['https://signed.example/asset.png']);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('castQuickShootPlain works without a creatorId (no-creator-selected path)', async () => {
    invoke.mockResolvedValueOnce({ data: { assets: [{ storagePath: 'user/quick-shoot/job/0.png' }], summary: 'ok' }, error: null });
    const result = await castQuickShootPlain({ positivePrompt: 'p' });
    expect(invoke).toHaveBeenCalledWith('cast-quick-shoot', expect.objectContaining({ body: expect.objectContaining({ creatorId: null, characterImage: null }) }));
    expect(result.images.length).toBe(1);
  });

  it('generateReferenceSet requires a saved creatorId in cloud mode', async () => {
    await expect(generateReferenceSet({ characterDesc: 'x', count: 2 })).rejects.toThrow('Save this creator');
    expect(invoke).not.toHaveBeenCalled();
  });

  it('generateReferenceSet calls cast-generate-reference-set and signs creator-references paths', async () => {
    invoke.mockResolvedValueOnce({ data: { references: [{ id: 'r1', storagePath: 'user/creator/generated/job-0.png' }] }, error: null });
    const result = await generateReferenceSet({ characterDesc: 'x', count: 1, creatorId: 'creator-1' });
    expect(invoke).toHaveBeenCalledWith('cast-generate-reference-set', expect.objectContaining({ body: expect.objectContaining({ creatorId: 'creator-1', characterDescription: 'x', count: 1 }) }));
    expect(result.images).toEqual(['https://signed.example/asset.png']);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
