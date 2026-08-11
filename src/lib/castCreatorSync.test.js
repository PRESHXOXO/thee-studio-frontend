import { describe, expect, it, vi } from 'vitest';
import { linkCastCreatorToCloud, syncCastReferencesToCloud } from './castCreatorSync.js';

function fakeRepository({ existingCloudCreators = [], existingReferences = [] } = {}) {
  const state = { creators: [...existingCloudCreators], references: [...existingReferences] };
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
    listReferenceAssets: vi.fn(async creatorId => state.references.filter(reference => reference.creator_id === creatorId)),
    uploadReferenceAsset: vi.fn(async (creatorId, referenceType, file, notes) => {
      const row = {
        id: `ref-${state.references.length + 1}`,
        creator_id: creatorId,
        reference_type: referenceType,
        original_filename: file.name,
        notes,
      };
      state.references.push(row);
      return row;
    }),
    removeReferenceAsset: vi.fn(async referenceId => {
      state.references = state.references.filter(reference => reference.id !== referenceId);
      return true;
    }),
  };
}

const TINY_JPEG = 'data:image/jpeg;base64,/9j/AA==';
const TINY_PNG = 'data:image/png;base64,iVBORw0KGgo=';

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
    expect(repo.state.creators).toHaveLength(2);
  });

  it('resolves to null when no matching creator exists after sync (defensive — never fabricates an id)', async () => {
    const repo = fakeRepository();
    const linked = await linkCastCreatorToCloud(repo, [{ id: 1, name: 'X' }], 'not-the-saved-id');
    expect(linked).toBeNull();
  });

  it('migrates a saved Cast primary and supporting photo into canonical private reference rows', async () => {
    const repo = fakeRepository();
    const creator = { id: 42, name: 'Sienna', refImages: [TINY_JPEG, TINY_PNG] };
    await linkCastCreatorToCloud(repo, [creator], 42);

    expect(repo.uploadReferenceAsset).toHaveBeenCalledTimes(2);
    expect(repo.state.references.map(reference => reference.reference_type)).toEqual(['headshot', 'additional']);
    expect(repo.state.references.every(reference => reference.notes.startsWith('cast-sync:42:'))).toBe(true);
  });

  it('is idempotent for unchanged Cast images and does not upload them twice', async () => {
    const repo = fakeRepository();
    const creator = { id: 42, name: 'Sienna', refImages: [TINY_JPEG, TINY_PNG] };
    await linkCastCreatorToCloud(repo, [creator], 42);
    await linkCastCreatorToCloud(repo, [creator], 42);

    expect(repo.uploadReferenceAsset).toHaveBeenCalledTimes(2);
    expect(repo.state.references).toHaveLength(2);
  });

  it('never overwrites a canonical New Creator headshot when linking the same person from Cast', async () => {
    const repo = fakeRepository({
      existingReferences: [{
        id: 'new-creator-headshot', creator_id: 'cloud-42', reference_type: 'headshot', notes: 'Uploaded in New Creator',
      }],
    });
    const creator = { id: 42, name: 'Sienna', refImages: [TINY_JPEG] };
    await linkCastCreatorToCloud(repo, [creator], 42);

    expect(repo.uploadReferenceAsset).toHaveBeenCalledWith(
      'cloud-42',
      'additional',
      expect.any(File),
      expect.stringMatching(/^cast-sync:42:0:/),
    );
    expect(repo.removeReferenceAsset).not.toHaveBeenCalledWith('new-creator-headshot');
  });

  it('archives a migrated supporting reference when the user removes it from Cast', async () => {
    const repo = fakeRepository();
    const creator = { id: 42, name: 'Sienna', refImages: [TINY_JPEG, TINY_PNG] };
    const cloud = { id: 'cloud-42' };
    await syncCastReferencesToCloud(repo, creator, cloud, 42);
    const supportingId = repo.state.references.find(reference => reference.reference_type === 'additional').id;

    await syncCastReferencesToCloud(repo, { ...creator, refImages: [TINY_JPEG] }, cloud, 42);
    expect(repo.removeReferenceAsset).toHaveBeenCalledWith(supportingId);
    expect(repo.state.references.some(reference => reference.id === supportingId)).toBe(false);
  });
});
