// Matches a real Supabase `creators` table row id (UUID). Characters.jsx's
// own save flow (handleSave) is a separate, legacy local-only creator store
// (studio_documents "ts_characters", ids assigned via `Date.now()`) that was
// never linked to the real creators table — those numeric ids must never be
// sent to the backend as if they were a real creatorId. Only ImageGenerator's
// Creator Builder flow (repository.saveCreatorProfile) produces creators with
// a genuine UUID id and/or cloudCreatorId.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_CLOUD_REFERENCE_PREVIEW_CHARS = 60000;
const MAX_CLOUD_REFERENCE_PREVIEWS = 10;
const MAX_CLOUD_PRIMARY_PREVIEW_CHARS = 500000;

export function canonicalCreatorId(creator) {
  const candidate = creator?.cloudCreatorId || creator?.id || null;
  return typeof candidate === 'string' && UUID_PATTERN.test(candidate) ? candidate : null;
}

function validPreview(value, maxChars) {
  return typeof value === 'string'
    && value.startsWith('data:image/')
    && value.length <= maxChars;
}

function compactCloudCreatorForRoster(creator) {
  if (!creator || creator.cloudProfile !== true) return creator;

  // Canonical cloud creators already own their real reference files in
  // private Supabase storage. The browser `ts_characters` document is a
  // lightweight roster only. Keep tiny display thumbnails if they already
  // exist, plus at most one medium fallback portrait immediately after a
  // Creator Builder save. Generation never uses these as identity authority.
  const referencePreviews = (Array.isArray(creator.refImages) ? creator.refImages : [])
    .filter(value => validPreview(value, MAX_CLOUD_REFERENCE_PREVIEW_CHARS))
    .slice(0, MAX_CLOUD_REFERENCE_PREVIEWS);
  const fallbackCandidates = [
    ...referencePreviews,
    ...(Array.isArray(creator.refImages) ? creator.refImages : []),
    creator.image,
  ];
  const primary = referencePreviews[0]
    || fallbackCandidates.find(value => validPreview(value, MAX_CLOUD_PRIMARY_PREVIEW_CHARS))
    || null;
  const creatorId = canonicalCreatorId(creator);

  return {
    ...creator,
    ...(creatorId ? { id: creatorId, cloudCreatorId: creatorId } : {}),
    refImages: referencePreviews,
    image: primary,
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
