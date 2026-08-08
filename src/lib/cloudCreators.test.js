import { describe, expect, it } from 'vitest';
import { canonicalCreatorId, reconcileCloudCreator } from './cloudCreators.js';

describe('cloud creator identity', () => {
  it('uses the persisted cloud UUID instead of a legacy local id', () => {
    expect(canonicalCreatorId({
      id: 'cr_legacy',
      cloudCreatorId: '00000000-0000-0000-0000-000000000111',
    })).toBe('00000000-0000-0000-0000-000000000111');
  });

  it('falls back to the record id for canonical cloud records', () => {
    expect(canonicalCreatorId({ id: '00000000-0000-0000-0000-000000000111' }))
      .toBe('00000000-0000-0000-0000-000000000111');
  });

  // Regression for the 2026-08-08 staging incident: Characters.jsx saves
  // creators with `id: Date.now()` (a number) to a legacy local store never
  // linked to the real `creators` table. That id must never be sent to the
  // backend as a real creatorId — it isn't one, and previously a truthy
  // number silently passed through canonicalCreatorId, then got type-
  // coerced to null deep inside cast-quick-shoot's `typeof === 'string'`
  // guard, masking the real cause of the missing creator association.
  it('never treats a legacy local (non-UUID) id as a real creatorId', () => {
    expect(canonicalCreatorId({ id: Date.now(), name: 'Local-only creator' })).toBeNull();
    expect(canonicalCreatorId({ id: '1754620848970', name: 'Stringified timestamp id' })).toBeNull();
    expect(canonicalCreatorId({ id: 'cr_legacy', name: 'Old prefixed id' })).toBeNull();
  });

  it('collapses legacy and canonical duplicates when a cloud creator is saved', () => {
    const uuid = '00000000-0000-0000-0000-000000000111';
    const saved = { id: uuid, cloudCreatorId: uuid, name: 'Amara' };
    expect(reconcileCloudCreator([
      { id: uuid, cloudCreatorId: uuid, name: 'Amara' },
      { id: 'cr_legacy', cloudCreatorId: uuid, name: 'Amara' },
      { id: 'other', name: 'Other' },
    ], saved)).toEqual([
      { id: 'other', name: 'Other' },
      saved,
    ]);
  });
});
