import { describe, expect, it } from 'vitest';
import { creatorMatchesId, promoteLinkedCloudCreator } from './cloudRosterIdentity.js';

describe('production Cast cloud-roster regression', () => {
  it('recovers the exact legacy-id + cloud-id shape that hid an existing Cast member', () => {
    const cloudId = '777428c9-5089-481c-85db-3d7266bcbfea';
    const legacy = {
      id: 1787094669554,
      cloudCreatorId: cloudId,
      cloudProfile: false,
      name: 'AMARA.',
      refImages: ['data:image/jpeg;base64,legacy'],
      image: 'data:image/jpeg;base64,legacy',
    };

    expect(creatorMatchesId(legacy, cloudId)).toBe(true);
    expect(promoteLinkedCloudCreator(legacy)).toMatchObject({
      id: cloudId,
      cloudCreatorId: cloudId,
      cloudProfile: true,
      name: 'AMARA.',
      refImages: [],
      image: null,
    });
  });
});
