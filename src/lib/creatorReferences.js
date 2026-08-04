export const CREATOR_REFERENCE_BUCKET = 'creator-references';
export const CREATOR_REFERENCE_MAX_BYTES = 15 * 1024 * 1024;
export const CREATOR_REFERENCE_TYPES = Object.freeze(['headshot', 'full_body', 'additional']);
export const CREATOR_REFERENCE_MIME_TYPES = Object.freeze(['image/jpeg', 'image/png', 'image/webp']);

const CATEGORY_BY_TYPE = Object.freeze({
  headshot: 'face',
  full_body: 'full_body',
  additional: 'profile',
});

function safeError(message) {
  return new Error(message);
}

export function validateCreatorReferenceFile(file) {
  if (!file || typeof file !== 'object') throw safeError('Choose an image to upload.');
  if (!CREATOR_REFERENCE_MIME_TYPES.includes(file.type)) {
    throw safeError('Use a JPG, PNG, or WebP image.');
  }
  if (!Number.isFinite(file.size) || file.size <= 0) throw safeError('This image is empty.');
  if (file.size > CREATOR_REFERENCE_MAX_BYTES) throw safeError('Image must be 15 MB or smaller.');
  return file;
}

export function sanitizeCreatorReferenceFilename(name, mimeType) {
  const fallback = mimeType === 'image/png' ? 'reference.png'
    : mimeType === 'image/webp' ? 'reference.webp'
      : 'reference.jpg';
  const cleaned = String(name || fallback)
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
    .toLowerCase();
  return cleaned || fallback;
}

export function creatorReferenceStoragePath(userId, creatorId, referenceType, file, uuid = crypto.randomUUID()) {
  if (!CREATOR_REFERENCE_TYPES.includes(referenceType)) throw safeError('Unsupported creator reference type.');
  return `${userId}/${creatorId}/references/${referenceType}/${uuid}-${sanitizeCreatorReferenceFilename(file.name, file.type)}`;
}

async function readImageDimensions(file) {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file);
    try { return { width: bitmap.width || null, height: bitmap.height || null }; }
    finally { bitmap.close?.(); }
  }
  if (typeof Image === 'undefined' || typeof URL?.createObjectURL !== 'function') {
    return { width: null, height: null };
  }
  return new Promise(resolve => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.naturalWidth || null, height: image.naturalHeight || null });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: null, height: null });
    };
    image.src = url;
  });
}

async function requireSession(db, expectedUserId) {
  const { data, error } = await db.auth.getSession();
  const userId = data?.session?.user?.id;
  if (error || !userId) throw safeError('Your session expired. Sign in again.');
  if (userId !== expectedUserId) throw safeError('Authenticated creator ownership changed. Sign in again.');
  return userId;
}

async function requireOwnedCreator(db, userId, creatorId) {
  const { data, error } = await db.from('creators')
    .select('id,user_id')
    .eq('id', creatorId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw safeError('Could not verify creator ownership.');
  if (!data) throw safeError('Creator profile was not found.');
  return data;
}

export async function signCreatorReference(db, storagePath, expiresIn = 900) {
  const { data, error } = await db.storage
    .from(CREATOR_REFERENCE_BUCKET)
    .createSignedUrl(storagePath, expiresIn);
  if (error || !data?.signedUrl) throw safeError('Could not open this private reference.');
  return data.signedUrl;
}

export async function listCreatorReferences(db, userId, creatorId) {
  await requireSession(db, userId);
  await requireOwnedCreator(db, userId, creatorId);
  const { data, error } = await db.from('creator_reference_assets')
    .select('*')
    .eq('creator_id', creatorId)
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });
  if (error) throw safeError('Could not load creator references.');
  return Promise.all((data || []).map(async reference => ({
    ...reference,
    signed_url: await signCreatorReference(db, reference.storage_path),
  })));
}

export async function uploadCreatorReference(db, userId, creatorId, referenceType, file, notes = '') {
  validateCreatorReferenceFile(file);
  if (!CREATOR_REFERENCE_TYPES.includes(referenceType)) throw safeError('Unsupported creator reference type.');
  await requireSession(db, userId);
  await requireOwnedCreator(db, userId, creatorId);

  const dimensions = await readImageDimensions(file);
  const storagePath = creatorReferenceStoragePath(userId, creatorId, referenceType, file);
  const upload = await db.storage.from(CREATOR_REFERENCE_BUCKET).upload(storagePath, file, {
    contentType: file.type,
    cacheControl: '3600',
    upsert: false,
  });
  if (upload.error) throw safeError('Reference upload failed. Try again.');

  const canonical = referenceType === 'headshot' || referenceType === 'full_body';
  let previous = [];
  let inserted = null;
  try {
    if (canonical) {
      const existing = await db.from('creator_reference_assets')
        .select('id,storage_path')
        .eq('creator_id', creatorId)
        .eq('user_id', userId)
        .eq('reference_type', referenceType)
        .eq('is_active', true)
        .eq('is_canonical', true);
      if (existing.error) throw existing.error;
      previous = existing.data || [];
    }

    const created = await db.from('creator_reference_assets').insert({
      user_id: userId,
      creator_id: creatorId,
      category: CATEGORY_BY_TYPE[referenceType],
      reference_type: referenceType,
      storage_path: storagePath,
      original_filename: file.name || sanitizeCreatorReferenceFilename('', file.type),
      mime_type: file.type,
      size_bytes: file.size,
      width: dimensions.width,
      height: dimensions.height,
      notes: String(notes || '').slice(0, 2000) || null,
      is_active: true,
      is_canonical: false,
    }).select().single();
    if (created.error || !created.data) throw created.error || safeError('Reference record was not created.');
    inserted = created.data;

    if (canonical && previous.length) {
      const archived = await db.from('creator_reference_assets').update({
        is_active: false,
        is_canonical: false,
        archived_at: new Date().toISOString(),
      }).in('id', previous.map(item => item.id)).eq('user_id', userId);
      if (archived.error) throw archived.error;
    }

    if (canonical) {
      const selected = await db.from('creator_reference_assets').update({ is_canonical: true })
        .eq('id', inserted.id)
        .eq('user_id', userId)
        .select()
        .single();
      if (selected.error || !selected.data) throw selected.error || safeError('Reference could not be selected.');
      inserted = selected.data;
    }

    const signedUrl = await signCreatorReference(db, storagePath);
    if (previous.length) {
      await db.storage.from(CREATOR_REFERENCE_BUCKET).remove(previous.map(item => item.storage_path));
    }
    return { ...inserted, signed_url: signedUrl };
  } catch {
    if (previous.length) {
      await db.from('creator_reference_assets').update({
        is_active: true,
        is_canonical: true,
        archived_at: null,
      }).in('id', previous.map(item => item.id)).eq('user_id', userId);
    }
    if (inserted?.id) await db.from('creator_reference_assets').delete().eq('id', inserted.id).eq('user_id', userId);
    await db.storage.from(CREATOR_REFERENCE_BUCKET).remove([storagePath]);
    throw safeError('Reference could not be saved. Your previous reference is unchanged.');
  }
}

export async function removeCreatorReference(db, userId, referenceId) {
  await requireSession(db, userId);
  const found = await db.from('creator_reference_assets')
    .select('id,storage_path,creator_id')
    .eq('id', referenceId)
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();
  if (found.error) throw safeError('Could not verify this reference.');
  if (!found.data) return false;
  await requireOwnedCreator(db, userId, found.data.creator_id);

  const archived = await db.from('creator_reference_assets').update({
    is_active: false,
    is_canonical: false,
    archived_at: new Date().toISOString(),
  }).eq('id', referenceId).eq('user_id', userId);
  if (archived.error) throw safeError('Could not remove this reference.');
  const removed = await db.storage.from(CREATOR_REFERENCE_BUCKET).remove([found.data.storage_path]);
  if (removed.error) throw safeError('Reference was archived but its file cleanup is pending.');
  return true;
}
