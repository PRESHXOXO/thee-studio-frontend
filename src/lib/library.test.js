import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteFromLibrary, loadLibrary, saveToLibrary } from './library.js';
import { saveGeneratedLibraryItem, softDeleteLibraryItem } from '../api/library.js';
import { saveLibraryOriginal } from './libraryAssets.js';

vi.mock('../api/library.js', () => ({
  listLibraryItems: vi.fn().mockResolvedValue([]),
  saveGeneratedLibraryItem: vi.fn(async metadata => ({
    id: `item-${metadata.parentBatchId}-${metadata.slotIndex}`,
    parentBatchId: metadata.parentBatchId,
    slotIndex: metadata.slotIndex,
    url: `signed-${metadata.slotIndex}`,
    source: metadata.source,
    savedAt: '2026-08-17T00:00:00Z',
  })),
  registerUploadedLibraryItem: vi.fn(),
  softDeleteLibraryItem: vi.fn().mockResolvedValue({}),
  updateLibraryReview: vi.fn(),
}));

vi.mock('./libraryAssets.js', () => ({ saveLibraryOriginal: vi.fn() }));
vi.mock('./creatorMemory.js', () => ({ learnCreatorMemory: vi.fn() }));

describe('durable Library persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('persists one succeeded slot once across 50 identical status deliveries', async () => {
    const calls = Array.from({ length: 50 }, () => saveToLibrary('rotating-signed-url', {
      source: 'scene_flow', parentBatchId: '100aa576-a553-45fd-9913-5409632c917a', slotIndex: 0,
    }));
    await Promise.all(calls);
    expect(saveGeneratedLibraryItem).toHaveBeenCalledTimes(1);
    expect(saveLibraryOriginal).not.toHaveBeenCalled();
    expect(loadLibrary()).toHaveLength(1);
  });

  it('serializes sibling saves without losing either item', async () => {
    await Promise.all([0, 1].map(slotIndex => saveToLibrary(`signed-${slotIndex}`, {
      source: 'director', parentBatchId: '100aa576-a553-45fd-9913-5409632c917a', slotIndex,
    })));
    expect(loadLibrary().map(item => item.slotIndex).sort()).toEqual([0, 1]);
  });

  it('deletes exactly one item and never touches storage from the browser', async () => {
    await Promise.all([0, 1].map(slotIndex => saveToLibrary(`signed-${slotIndex}`, {
      source: 'director', parentBatchId: '100aa576-a553-45fd-9913-5409632c917a', slotIndex,
    })));
    const [removed, retained] = loadLibrary();
    await deleteFromLibrary(removed.id);
    expect(softDeleteLibraryItem).toHaveBeenCalledWith(removed.id);
    expect(loadLibrary()).toEqual([retained]);
  });
});
