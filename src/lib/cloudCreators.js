// Matches a real Supabase `creators` table row id (UUID). Characters.jsx's
// own save flow (handleSave) is a separate, legacy local-only creator store
// (studio_documents "ts_characters", ids assigned via `Date.now()`) that was
// never linked to the real creators table — those numeric ids must never be
// sent to the backend as if they were a real creatorId. Only ImageGenerator's
// Creator Builder flow (repository.saveCreatorProfile) produces creators with
// a genuine UUID id and/or cloudCreatorId.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function canonicalCreatorId(creator) {
  const candidate = creator?.cloudCreatorId || creator?.id || null;
  return typeof candidate === 'string' && UUID_PATTERN.test(candidate) ? candidate : null;
}

export function reconcileCloudCreator(existing = [], savedCreator) {
  const savedId = canonicalCreatorId(savedCreator);
  if (!savedId) return [...existing, savedCreator];
  return [
    ...existing.filter(creator => String(canonicalCreatorId(creator)) !== String(savedId)),
    savedCreator,
  ];
}
