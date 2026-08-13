// Matches a real Supabase `creators` table row id (UUID). Characters.jsx's
// own save flow (handleSave) is a separate, legacy local-only creator store
// (studio_documents "ts_characters", ids assigned via `Date.now()`) that was
// never linked to the real creators table — those numeric ids must never be
// sent to the backend as if they were a real creatorId. Only ImageGenerator's
// Creator Builder flow (repository.saveCreatorProfile) produces creators with
// a genuine UUID id and/or cloudCreatorId.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_CLOUD_PREVIEW_CHARS = 500000;

export function canonicalCreatorId(creator) {
  const candidate = creator?.cloudCreatorId || creator?.id || null;
  return typeof candidate === 'string' && UUID_PATTERN.test(candidate) ? candidate : null;
}

function compactCloudCreatorForRoster(creator) {
  if (!creator || creator.cloudProfile !== true) return creator;

  // Canonical cloud creators already own their real reference files in
  // private Supabase storage. The browser `ts_characters` document is a
  // lightweight roster only; duplicating a whole compressed reference pack
  // here can exhaust localStorage after just a few creators. Keep at most one
  // bounded preview for Cast/canvas display; generation never uses it as the
  // canonical identity source.
  const candidates = [
    ...(Array.isArray(creator.refImages) ? creator.refImages : []),
    creator.image,
  ];
  const preview = candidates.find(value => (
    typeof value === 'string'
    && value.startsWith('data:image/')
    && value.length <= MAX_CLOUD_PREVIEW_CHARS
  )) || null;
  const creatorId = canonicalCreatorId(creator);

  return {
    ...creator,
    ...(creatorId ? { id: creatorId, cloudCreatorId: creatorId } : {}),
    refImages: [],
    image: preview,
  };
}

export function reconcileCloudCreator(existing = [], savedCreator) {
  const savedId = canonicalCreatorId(savedCreator);
  const compactExisting = existing.map(compactCloudCreatorForRoster);
  if (!savedId) return [...compactExisting, compactCloudCreatorForRoster(savedCreator)];
  return [
    ...compactExisting.filter(creator => String(canonicalCreatorId(creator)) !== String(savedId)),
    compactCloudCreatorForRoster(savedCreator),
  ];
}
