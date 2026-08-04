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
