import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  downloadCloudAsset: vi.fn(),
  persistCloudAsset: vi.fn(),
  removeCloudAsset: vi.fn(),
  storageDownload: vi.fn(),
}));

vi.mock('./cloudStore.js', () => ({
  downloadCloudAsset: (...args) => mocks.downloadCloudAsset(...args),
  persistCloudAsset: (...args) => mocks.persistCloudAsset(...args),
  removeCloudAsset: (...args) => mocks.removeCloudAsset(...args),
}));

vi.mock('./supabase.js', () => ({
  getSupabase: () => ({
    storage: {
      from: vi.fn(() => ({ download: (...args) => mocks.storageDownload(...args) })),
    },
  }),
}));

import { downloadImageAsPng, getLibraryOriginalBlob } from './libraryAssets.js';

describe('library asset delivery', () => {
  beforeEach(() => {
    mocks.downloadCloudAsset.mockReset();
    mocks.persistCloudAsset.mockReset();
    mocks.removeCloudAsset.mockReset();
    mocks.storageDownload.mockReset();
    vi.restoreAllMocks();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:test') });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  });

  it('downloads an expired signed generation URL through authenticated storage instead of refetching the token', async () => {
    const blob = new Blob(['png'], { type: 'image/png' });
    mocks.storageDownload.mockResolvedValue({ data: blob, error: null });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('expired token should not be fetched'));
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    await downloadImageAsPng(
      'https://example.supabase.co/storage/v1/object/sign/generation-assets/user/quick-shoot/job/image.jpg?token=expired',
      'result.png',
    );

    expect(mocks.storageDownload).toHaveBeenCalledWith('user/quick-shoot/job/image.jpg');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('recovers a Library original directly from authenticated storage when cloud runtime is unavailable', async () => {
    const blob = new Blob(['jpg'], { type: 'image/jpeg' });
    mocks.downloadCloudAsset.mockResolvedValue(null);
    mocks.storageDownload.mockResolvedValue({ data: blob, error: null });

    const result = await getLibraryOriginalBlob({
      id: 'asset-id',
      originalStorageBucket: 'generation-assets',
      originalStoragePath: 'user/quick-shoot/job/image.jpg',
      url: 'https://expired.example/image.jpg',
    });

    expect(result).toBe(blob);
    expect(mocks.storageDownload).toHaveBeenCalledWith('user/quick-shoot/job/image.jpg');
  });
});
