import { describe, expect, it, vi } from 'vitest';
import { buildGenerationRequest, createSignedImageUrl, generateStagingStill } from './stagingGeneration.js';

const shot = { id: 'shot-1', title: 'Image Generator' };
const invokeResult = { data: { externalRunId: 'run-1', assets: [{ storagePath: 'user-1/stills/shot-1/image.webp', externalUrl: null, metadata: { size: 12 } }] }, error: null };

function client(result = invokeResult) {
  return { functions: { invoke: vi.fn().mockResolvedValue(result) } };
}

describe('staging still generation', () => {
  it('builds exact one-image request', () => {
    expect(buildGenerationRequest({ prompt: ' test ', negativePrompt: ' blur ', candidateCount: 1, aspectRatio: '1:1', shot })).toEqual({
      prompt: 'test', negativePrompt: 'blur', candidateCount: 1, aspectRatio: '1:1', shot,
    });
  });

  it('sends idempotency header and signs private storage path', async () => {
    const current = client();
    const result = await generateStagingStill(current, { prompt: 'test', negativePrompt: '', format: 'Square 1:1' }, {
      ensureContext: vi.fn().mockResolvedValue({ project: { id: 'project-1' }, shot }),
      signImage: vi.fn().mockResolvedValue('https://signed.invalid/image'),
      idempotencyKey: 'web-still-fixed',
    });
    expect(current.functions.invoke).toHaveBeenCalledTimes(1);
    expect(current.functions.invoke.mock.calls[0][0]).toBe('crisp-generate-stills');
    expect(current.functions.invoke.mock.calls[0][1].headers).toEqual({ 'idempotency-key': 'web-still-fixed' });
    expect(result.images).toEqual([expect.objectContaining({ storagePath: 'user-1/stills/shot-1/image.webp', signedUrl: 'https://signed.invalid/image' })]);
  });

  it('rejects malformed provider response', async () => {
    const current = client({ data: { assets: [] }, error: null });
    await expect(generateStagingStill(current, { prompt: 'test', format: 'Square 1:1' }, {
      ensureContext: vi.fn().mockResolvedValue({ project: { id: 'project-1' }, shot }),
      signImage: vi.fn(),
    })).rejects.toThrow('invalid image response');
  });

  it('does not retry provider failure', async () => {
    const current = client({ data: null, error: new Error('provider failed') });
    await expect(generateStagingStill(current, { prompt: 'test', format: 'Square 1:1' }, {
      ensureContext: vi.fn().mockResolvedValue({ project: { id: 'project-1' }, shot }),
      signImage: vi.fn(),
    })).rejects.toThrow('No retry was sent');
    expect(current.functions.invoke).toHaveBeenCalledTimes(1);
  });

  it('creates signed URL only for current user path', async () => {
    const createSignedUrl = vi.fn().mockResolvedValue({ data: { signedUrl: 'https://signed.invalid/image' }, error: null });
    const current = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
      storage: { from: vi.fn(() => ({ createSignedUrl })) },
    };
    await expect(createSignedImageUrl(current, 'user-1/stills/image.webp')).resolves.toBe('https://signed.invalid/image');
    await expect(createSignedImageUrl(current, 'user-2/stills/image.webp')).rejects.toThrow('ownership');
  });
});
