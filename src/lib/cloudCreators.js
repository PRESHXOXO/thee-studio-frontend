export function canonicalCreatorId(creator) {
  return creator?.cloudCreatorId || creator?.id || null;
}

export function reconcileCloudCreator(existing = [], savedCreator) {
  const savedId = canonicalCreatorId(savedCreator);
  if (!savedId) return [...existing, savedCreator];
  return [
    ...existing.filter(creator => String(canonicalCreatorId(creator)) !== String(savedId)),
    savedCreator,
  ];
}
