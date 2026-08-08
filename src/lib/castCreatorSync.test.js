import { describe, expect, it, vi } from 'vitest';
import { linkCastCreatorToCloud } from './castCreatorSync.js';

function fakeRepository({ existingCloudCreators = [] } = {}) {
  const state = { creators: [...existingCloudCreators] };
  return {
    state,
    syncStudioCreators: vi.fn(async (studioCreators) => {
      for (const source of studioCreators) {
        const already = state.creators.find(c => String(c.studio_source_id) === String(source.id));
        if (!already) {
          state.creators.push({
            id: `cloud-${source.id}`,
            studio_source_id: String(source.id),
            name: source.name,
          });
        }
      }
    }),
    listCreators: vi.fn(async () => [...state.creators]),
  };
}

describe('linkCastCreatorToCloud', () => {
  it('a Cast draft with no repository support (e.g. local dev without the sync method) resolves to null, never throws', async () => {
    const result = await linkCastCreatorToCloud({}, [{ id: 123, name: 'Draft' }], 123);
    expect(result).toBeNull();
  });

  it('Cast Save creates exactly one cloud creator and returns its real UUID-style id', async () => {
    const repo = fakeRepository();
    const studioCreators = [{ id: 1754620848970, name: 'Amara' }];
    const linked = await repo.syncStudioCreators(studioCreators)
      .then(() => linkCastCreatorToCloud(repo, studioCreators, 1754620848970));
    expect(repo.syncStudioCreators).toHaveBeenCalled();
    expect(linked).toEqual({ id: 'cloud-1754620848970', studio_source_id: '1754620848970', name: 'Amara' });
    expect(repo.state.creators).toHaveLength(1);
  });

  it('a second Save for the same legacy id updates/reuses the same cloud row, never creates a duplicate', async () => {
    const repo = fakeRepository();
    const studioCreators = [{ id: 1754620848970, name: 'Amara' }];

    const first = await linkCastCreatorToCloud(repo, studioCreators, 1754620848970);
    const second = await linkCastCreatorToCloud(repo, studioCreators, 1754620848970);

    expect(first.id).toBe(second.id);
    expect(repo.state.creators).toHaveLength(1);
    expect(repo.syncStudioCreators).toHaveBeenCalledTimes(2);
  });

  it('a legacy numeric creator upgrades to a cloud row exactly once across repeated saves of the whole roster', async () => {
    const repo = fakeRepository({ existingCloudCreators: [{ id: 'cloud-real-uuid', studio_source_id: '999', name: 'Already Linked' }] });
    const roster = [
      { id: 999, name: 'Already Linked' },
      { id: 1754620999000, name: 'Newly Upgraded' },
    ];

    await linkCastCreatorToCloud(repo, roster, 999);
    const upgraded = await linkCastCreatorToCloud(repo, roster, 1754620999000);

    expect(upgraded.id).toBe('cloud-1754620999000');
    // exactly two cloud rows total: the pre-existing link plus the one new upgrade — no duplicates of either.
    expect(repo.state.creators).toHaveLength(2);
  });

  it('resolves to null when no matching creator exists after sync (defensive — never fabricates an id)', async () => {
    const repo = fakeRepository();
    const linked = await linkCastCreatorToCloud(repo, [{ id: 1, name: 'X' }], 'not-the-saved-id');
    expect(linked).toBeNull();
  });
});
