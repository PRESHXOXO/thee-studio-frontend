export const SHOT_TYPES = [
  'beauty close-up',
  'mirror outfit reveal',
  'car selfie',
  'walking vlog shot',
  'coffee / lifestyle shot',
  'product close-up',
  'perfume detail',
  'back-of-hair shot',
];

export const MOTION_PRESETS = [
  'soft head turn',
  'natural blink',
  'subtle breathing',
  'hand to hair',
  'one slow step forward',
  'walking toward camera',
  'coffee-in-hand walk',
  'slight handheld drift',
  'stable smartphone tracking',
];

export const REVIEW_CRITERIA = [
  'faceConsistency',
  'handQuality',
  'hairlineQuality',
  'skinRealism',
  'fabricTexture',
  'bodyRealism',
  'objectIntegrity',
  'environmentQuality',
  'crispness',
  'luxuryFeel',
];

export const REVIEW_LABELS = {
  faceConsistency: 'Face consistency',
  handQuality: 'Hand quality',
  hairlineQuality: 'Hairline quality',
  skinRealism: 'Skin realism',
  fabricTexture: 'Fabric texture',
  bodyRealism: 'Body realism',
  objectIntegrity: 'Object integrity',
  environmentQuality: 'Environment quality',
  crispness: 'Crispness',
  luxuryFeel: 'Luxury feel',
};

export const emptyReviewScores = () => Object.fromEntries(
  REVIEW_CRITERIA.map(criterion => [criterion, 0]),
);

export function creatorIdentityFromStudio(creator) {
  const locked = [
    creator.face,
    creator.hair,
    creator.body,
    creator.tone,
  ].filter(Boolean);
  return {
    identityNotes: [
      creator.description,
      creator.face,
      creator.hair,
      creator.body,
      creator.tone,
      creator.personality,
    ].filter(Boolean).join('. '),
    lockedTraits: locked,
    doNotChangeNotes: creator.doNotChange
      || 'Preserve facial geometry, skin tone, hairline, body proportions, and identifying features.',
    realismOrientation: 'luxury_high_realism',
  };
}
