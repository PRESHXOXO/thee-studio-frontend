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

import { analyzeCharacterReferences, characterGenerate, generateReferenceSet, castQuickShootPlain, extractFaceAnchor, pollCastQuickShootStatus, preflightCastReferences } from './studio.js';

const PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEAQH/6ZcmWQAAAABJRU5ErkJggg==';

describe('Cast cloud workflows never call local Gradio', () => {
  it('analyzeCharacterReferences calls cast-analyze-references, not /gradio_api', async () => {
    const anchorText = 'Oval face, high cheekbones, almond eyes.';
    invoke.mockResolvedValueOnce({ data: { profile: { face: 'x', hair: 'y', tone: 'z' }, identityAnchor: anchorText }, error: null });
    const result = await analyzeCharacterReferences([PIXEL]);
    expect(invoke).toHaveBeenCalledWith('cast-analyze-references', expect.objectContaining({ body: { references: [{ role: 'identity', image: PIXEL }] } }));
    // Regression: faceAnchor must be the text identity description the
    // backend generated, never the reference image/data URL itself.
    expect(result.faceAnchor).toBe(anchorText);
    expect(result.faceAnchor).not.toContain('data:image');
    expect(result.faceAnchor).not.toBe(PIXEL);
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

  it('characterGenerate calls cast-quick-shoot and signs assets when the job is already complete (resumed)', async () => {
    invoke.mockResolvedValueOnce({ data: { status: 'succeeded', assets: [{ storagePath: 'user/creator/quick-shoot/job/0.png' }], summary: 'ok' }, error: null });
    const result = await characterGenerate({ positivePrompt: 'p', characterImage: PIXEL, creatorId: 'creator-1' });
    expect(invoke).toHaveBeenCalledWith('cast-quick-shoot', expect.objectContaining({ body: expect.objectContaining({ creatorId: 'creator-1', characterImage: PIXEL }) }));
    expect(createSignedUrl).toHaveBeenCalledWith('user/creator/quick-shoot/job/0.png', 3600);
    expect(result.status).toBe('succeeded');
    expect(result.images).toEqual(['https://signed.example/asset.png']);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  // Regression: identity-locked Quick Shoot is async in cloud mode — the
  // initial submit must never return images directly, only a pending job id.
  it('characterGenerate returns a pending job, not images, for a fresh identity-locked submit', async () => {
    invoke.mockResolvedValueOnce({ data: { status: 'pending', jobId: 'job-123' }, error: null });
    const result = await characterGenerate({ positivePrompt: 'p', characterImage: PIXEL, creatorId: 'creator-1' });
    expect(result.status).toBe('pending');
    expect(result.jobId).toBe('job-123');
    expect(result.images).toEqual([]);
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it('characterGenerate surfaces a failed job as an error, never as an empty success', async () => {
    invoke.mockResolvedValueOnce({ data: { status: 'failed', error: 'blocked by content policy' }, error: null });
    await expect(characterGenerate({ positivePrompt: 'p', characterImage: PIXEL, creatorId: 'creator-1' }))
      .rejects.toThrow('blocked by content policy');
  });

  describe('pollCastQuickShootStatus', () => {
    it('reports pending without ever creating a provider request', async () => {
      invoke.mockResolvedValueOnce({ data: { status: 'pending' }, error: null });
      const result = await pollCastQuickShootStatus('job-123');
      expect(invoke).toHaveBeenCalledWith('cast-quick-shoot-status', expect.objectContaining({ body: { jobId: 'job-123' } }));
      expect(result).toEqual({ status: 'pending' });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('signs and returns images once the job succeeds', async () => {
      invoke.mockResolvedValueOnce({ data: { status: 'succeeded', assets: [{ storagePath: 'user/creator/quick-shoot/job/0.png' }], summary: 'ok' }, error: null });
      const result = await pollCastQuickShootStatus('job-123');
      expect(result.status).toBe('succeeded');
      expect(result.images).toEqual(['https://signed.example/asset.png']);
    });

    it('reports failed without throwing, carrying the server error message and category', async () => {
      invoke.mockResolvedValueOnce({ data: { status: 'failed', error: 'Image generation was blocked by content safety review.', errorCategory: 'safety_moderation' }, error: null });
      const result = await pollCastQuickShootStatus('job-123');
      expect(result).toEqual({ status: 'failed', error: 'Image generation was blocked by content safety review.', errorCategory: 'safety_moderation' });
    });

    // Regression: never fabricate a specific-sounding reason when the
    // provider gave none — the honest unknown-failure fallback must show.
    it('falls back to the honest unknown-failure message when the server omits error/errorCategory entirely', async () => {
      invoke.mockResolvedValueOnce({ data: { status: 'failed' }, error: null });
      const result = await pollCastQuickShootStatus('job-123');
      expect(result.error).toBe('Image generation failed. The provider did not return a specific reason.');
      expect(result.errorCategory).toBe('unknown');
    });

    it('never surfaces raw provider JSON to the caller — only the normalized message string', async () => {
      invoke.mockResolvedValueOnce({ data: { status: 'failed', error: 'The provider had an internal error.', errorCategory: 'provider_internal' }, error: null });
      const result = await pollCastQuickShootStatus('job-123');
      expect(typeof result.error).toBe('string');
      expect(result.error).not.toContain('{');
    });

    it('repeated polling of the same job never calls fetch (no gradio/localhost/provider leak from the client)', async () => {
      invoke.mockResolvedValue({ data: { status: 'pending' }, error: null });
      await pollCastQuickShootStatus('job-123');
      await pollCastQuickShootStatus('job-123');
      await pollCastQuickShootStatus('job-123');
      expect(invoke).toHaveBeenCalledTimes(3);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  it('castQuickShootPlain works without a creatorId (no-creator-selected path)', async () => {
    invoke.mockResolvedValueOnce({ data: { assets: [{ storagePath: 'user/quick-shoot/job/0.png' }], summary: 'ok' }, error: null });
    const result = await castQuickShootPlain({ positivePrompt: 'p' });
    expect(invoke).toHaveBeenCalledWith('cast-quick-shoot', expect.objectContaining({ body: expect.objectContaining({ creatorId: null, characterImage: null }) }));
    expect(result.images.length).toBe(1);
  });

  it('preflightCastReferences calls cast-reference-preflight and never touches OpenAI/gradio', async () => {
    const sanitizedReport = { references: [{ index: 0, mime: 'image/png', byteLength: 100, width: 1, height: 1, valid: true, reason: null }], dedupedCount: 1, cappedCount: 1, allValid: true };
    invoke.mockResolvedValueOnce({ data: sanitizedReport, error: null });
    const result = await preflightCastReferences([PIXEL], 'creator-1');
    expect(invoke).toHaveBeenCalledWith('cast-reference-preflight', expect.objectContaining({ body: { creatorId: 'creator-1', references: [PIXEL] } }));
    expect(result).toEqual(sanitizedReport);
    expect(global.fetch).not.toHaveBeenCalled();
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

  // Regression for the 2026-08-08 staging incident: a Cast Quick Shoot
  // request appeared in telemetry shortly after an Analyze Complete Set
  // call. analyzeCharacterReferences() must never call cast-quick-shoot
  // (or any other Cast function) — it is the only Cast workflow function
  // Characters.jsx's "Analyze Complete Set" button invokes.
  it('analyzeCharacterReferences never invokes cast-quick-shoot or any other Cast function', async () => {
    invoke.mockResolvedValueOnce({ data: { profile: { face: 'x' }, identityAnchor: 'A description with spaces.' }, error: null });
    await analyzeCharacterReferences([PIXEL]);
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenCalledWith('cast-analyze-references', expect.anything());
    const calledFunctionNames = invoke.mock.calls.map(call => call[0]);
    expect(calledFunctionNames).not.toContain('cast-quick-shoot');
    expect(calledFunctionNames).not.toContain('cast-generate-reference-set');
  });
});
