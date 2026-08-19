const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function linkedCloudCreatorId(creator) {
  const candidate = creator?.cloudCreatorId || creator?.id || null;
  return typeof candidate === 'string' && UUID_PATTERN.test(candidate) ? candidate : null;
}

export function promoteLinkedCloudCreator(creator, linkedCreatorId = linkedCloudCreatorId(creator)) {
  if (!creator || !linkedCreatorId) return creator;
  return {
    ...creator,
    id: linkedCreatorId,
    cloudCreatorId: linkedCreatorId,
    cloudProfile: true,
    refImages: [],
    image: null,
  };
}

export function creatorMatchesId(creator, id) {
  if (id == null || !creator) return false;
  return String(creator.id) === String(id)
    || String(linkedCloudCreatorId(creator) || '') === String(id);
}
