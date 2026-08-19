import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  createSignedUrl: vi.fn(),
}));

vi.mock('../lib/supabase.js', () => ({
  getSupabase: () => ({
    functions: { invoke: (...args) => mocks.invoke(...args) },
    storage: {
      from: vi.fn(() => ({ createSignedUrl: (...args) => mocks.createSignedUrl(...args) })),
    },
  }),
}));

import { listLibraryItems, saveGeneratedLibraryItem } from './library.js';

describe('Library asset URL hydration', () => {
  beforeEach(() => {
    mocks.invoke.mockReset();
    mocks.createSignedUrl.mockReset();
  });

  it('re-signs listed assets with the authenticated browser storage client', async () => {
    mocks.invoke.mockResolvedValue({
      data: { items: [{ id: 'one', url: 'https://server.example/stale', originalStorageBucket: 'generation-assets', originalStoragePath: 'user/job/image.jpg' }] },
      error: null,
    });
    mocks.createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://browser.example/fresh' }, error: null });

    const items = await listLibraryItems();

    expect(items[0].url).toBe('https://browser.example/fresh');
    expect(mocks.createSignedUrl).toHaveBeenCalledWith('user/job/image.jpg', 3600);
  });

  it('re-signs a newly auto-saved generated Library item before returning it to the UI', async () => {
    mocks.invoke.mockResolvedValue({
      data: { item: { id: 'two', url: 'https://server.example/stale', originalStorageBucket: 'generation-assets', originalStoragePath: 'user/job/image-2.jpg' } },
      error: null,
    });
    mocks.createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://browser.example/fresh-2' }, error: null });

    const item = await saveGeneratedLibraryItem({
      parentBatchId: '00000000-0000-4000-8000-000000000001',
      slotIndex: 0,
      source: 'quick_shoot',
      settings: { workflow: 'guided' },
    });

    expect(item.url).toBe('https://browser.example/fresh-2');
  });
});
