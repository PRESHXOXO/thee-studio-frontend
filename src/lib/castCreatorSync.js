// Bridges a Cast-saved creator (Characters.jsx's local characters array,
// legacy Date.now() ids) to a real Supabase `creators` row, reusing the
// existing studio_source_id-keyed sync. The same save also migrates the
// creator's actual reference photos into private `creator_reference_assets`
// so identity generation is not secretly dependent on a browser document.

function castImages(source) {
  if (Array.isArray(source?.refImages) && source.refImages.length) {
    return source.refImages.filter(value => typeof value === 'string' && value.startsWith('data:image/'));
  }
  return typeof source?.image === 'string' && source.image.startsWith('data:image/') ? [source.image] : [];
}

function dataUrlFileInfo(value, savedId, index) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\r\n]+)$/s.exec(String(value || '').trim());
  if (!match) return null;
  const mime = match[1].toLowerCase();
  const payload = match[2].replace(/\s+/g, '');
  let binary;
  try { binary = atob(payload); } catch { return null; }
  const bytes = new Uint8Array(binary.length);
  for (let offset = 0; offset < binary.length; offset += 1) bytes[offset] = binary.charCodeAt(offset);
  const extension = mime === 'image/jpeg' ? 'jpg' : mime.split('/')[1];
  const name = `cast-${savedId}-${index + 1}.${extension}`;
  const file = new File([bytes], name, { type: mime });

  // Small deterministic content fingerprint. This is only a migration/change
  // detector (not a security primitive), so a synchronous hash keeps Cast save
  // simple and works in every supported browser.
  let hash = 2166136261;
  for (let offset = 0; offset < payload.length; offset += 1) {
    hash ^= payload.charCodeAt(offset);
    hash = Math.imul(hash, 16777619);
  }
  return { file, fingerprint: (hash >>> 0).toString(16).padStart(8, '0') };
}

function migrationMarker(savedId, index, fingerprint) {
  return `cast-sync:${savedId}:${index}:${fingerprint}`;
}

function parseMigrationMarker(notes) {
  const match = /^cast-sync:([^:]+):(\d+):([0-9a-f]+)$/i.exec(String(notes || '').trim());
  return match ? { savedId: match[1], index: Number(match[2]), fingerprint: match[3].toLowerCase() } : null;
}

/**
 * Idempotently mirrors one saved Cast creator's browser references into the
 * canonical private reference store. Reference 1 becomes a headshot only when
 * the creator does not already have a non-Cast canonical headshot; supporting
 * images are stored as additional references. Existing non-Cast references are
 * never replaced or deleted.
 */
export async function syncCastReferencesToCloud(repository, source, cloudCreator, savedId) {
  if (!repository?.listReferenceAssets || !repository?.uploadReferenceAsset || !repository?.removeReferenceAsset) return [];
  if (!cloudCreator?.id || !source) return [];

  const images = castImages(source).slice(0, 5);
  const existing = await repository.listReferenceAssets(cloudCreator.id);
  const migrated = (existing || []).map(reference => ({ reference, marker: parseMigrationMarker(reference.notes) }))
    .filter(item => item.marker && String(item.marker.savedId) === String(savedId));
  const nonCastHeadshot = (existing || []).some(reference =>
    reference.reference_type === 'headshot' && !parseMigrationMarker(reference.notes)
  );

  const retainedIds = new Set();
  const results = [];
  for (let index = 0; index < images.length; index += 1) {
    const info = dataUrlFileInfo(images[index], savedId, index);
    if (!info) continue;
    const marker = migrationMarker(savedId, index, info.fingerprint);
    const current = migrated.find(item => item.marker.index === index);
    if (current?.marker.fingerprint === info.fingerprint) {
      retainedIds.add(current.reference.id);
      results.push(current.reference);
      continue;
    }

    // A New Creator/headshot upload is already canonical truth. Do not let a
    // legacy Cast save overwrite it; keep the Cast primary as supporting data.
    const referenceType = index === 0 && !nonCastHeadshot ? 'headshot' : 'additional';
    const uploaded = await repository.uploadReferenceAsset(cloudCreator.id, referenceType, info.file, marker);
    retainedIds.add(uploaded.id);
    results.push(uploaded);
    if (current?.reference?.id && current.reference.id !== uploaded.id) {
      await repository.removeReferenceAsset(current.reference.id);
    }
  }

  // A photo removed from Cast should stop being an active migrated reference,
  // but references created by New Creator or another canonical workflow remain.
  for (const item of migrated) {
    if (!retainedIds.has(item.reference.id) && item.marker.index >= images.length) {
      await repository.removeReferenceAsset(item.reference.id);
    }
  }
  return results;
}

// Idempotent: a creator already linked by studio_source_id is found and
// returned, not duplicated. Account isolation is inherited from the injected
// repository, which scopes all reads/writes to the authenticated user.
export async function linkCastCreatorToCloud(repository, studioCreators, savedId) {
  if (!repository?.syncStudioCreators || !repository?.listCreators) return null;
  await repository.syncStudioCreators(studioCreators);
  const cloudCreators = await repository.listCreators();
  const linked = cloudCreators.find(creator => String(creator.studio_source_id) === String(savedId)) || null;
  if (!linked) return null;

  const source = (studioCreators || []).find(creator => String(creator.id) === String(savedId));
  if (source) await syncCastReferencesToCloud(repository, source, linked, savedId);
  return linked;
}
