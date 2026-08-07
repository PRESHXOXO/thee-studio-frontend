import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bootstrapCloudStore, resetCloudStore, USER_SCOPED_CACHE_KEYS } from './cloudStore.js';

function cloudDb(rows = []) {
  const upsert = vi.fn().mockResolvedValue({ error: null });
  return {
    upsert,
    from: vi.fn(() => ({
      select: () => ({ in: vi.fn().mockResolvedValue({ data: rows, error: null }) }),
      upsert,
    })),
  };
}

describe('authenticated browser-cache isolation', () => {
  beforeEach(() => { localStorage.clear(); resetCloudStore(); });

  it('starts a brand-new cloud account completely blank instead of migrating browser leftovers', async () => {
    localStorage.setItem('ts_characters', JSON.stringify([{ id: 'owner-creator' }]));
    localStorage.setItem('ts_library', JSON.stringify([{ id: 'owner-asset' }]));
    localStorage.setItem('ts_creator_draft', JSON.stringify({ creatorId: 'owner-creator' }));
    const db = cloudDb([]);
    await bootstrapCloudStore(db, 'new-user');
    for (const key of USER_SCOPED_CACHE_KEYS) expect(localStorage.getItem(key)).toBeNull();
    expect(db.upsert).not.toHaveBeenCalled();
  });

  it('clears owner data before hydrating another account in the same browser', async () => {
    const ownerDb = cloudDb([{ document_key: 'ts_characters', payload: { value: '[{"id":"owner"}]' } }]);
    await bootstrapCloudStore(ownerDb, 'owner');
    expect(localStorage.getItem('ts_characters')).toContain('owner');
    await bootstrapCloudStore(cloudDb([]), 'new-user');
    expect(localStorage.getItem('ts_characters')).toBeNull();
    expect(localStorage.getItem('ts_active_character_id')).toBeNull();
  });

  it('clears user-scoped caches on logout', async () => {
    localStorage.setItem('ts_campaigns', '[{"id":"campaign"}]');
    localStorage.setItem('ts_creator_memory_v1', '{"private":true}');
    resetCloudStore();
    expect(localStorage.getItem('ts_campaigns')).toBeNull();
    expect(localStorage.getItem('ts_creator_memory_v1')).toBeNull();
  });
});
