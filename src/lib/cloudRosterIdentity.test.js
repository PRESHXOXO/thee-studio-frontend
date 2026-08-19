import { describe, expect, it } from 'vitest';
import { creatorMatchesId, promoteLinkedCloudCreator } from './cloudRosterIdentity.js';

describe('cloud Cast roster reconciliation', () => {
  const uuid = '00000000-0000-0000-0000-000000000111';

  it('promotes a half-migrated legacy Cast member to the canonical cloud roster identity', () => {
    const legacyImage = `data:image/jpeg;base64,${'x'.repeat(100)}`;
    const promoted = promoteLinkedCloudCreator({
      id: 1787094669554,
      name: 'AMARA.',
      cloudCreatorId: uuid,
      refImages: [legacyImage, legacyImage],
      image: legacyImage,
    });

    expect(promoted).toMatchObject({
      id: uuid,
      cloudCreatorId: uuid,
      cloudProfile: true,
      name: 'AMARA.',
      refImages: [],
      image: null,
    });
  });

  it('matches an active canonical UUID even while a roster entry still has a legacy local id', () => {
    expect(creatorMatchesId({
      id: 1787094669554,
      cloudCreatorId: uuid,
      name: 'AMARA.',
    }, uuid)).toBe(true);
  });

  it('does not promote a local-only creator without a valid cloud UUID', () => {
    const local = { id: 1787094669554, name: 'Local creator', refImages: ['data:image/jpeg;base64,a'] };
    expect(promoteLinkedCloudCreator(local)).toBe(local);
  });
});
