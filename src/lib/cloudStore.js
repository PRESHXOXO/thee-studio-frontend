import { createTelemetryRequestKey, trackStorageOperation } from '../api/usageTelemetry.js';
import { SupabasePipelineRepository } from '../production/SupabasePipelineRepository.js';
import { syncCastReferencesToCloud } from './castCreatorSync.js';

export const SYNCED_KEYS = [
  'ts_characters',
  'ts_library',
  'ts_references',
  'ts_promptlab',
  'ts_campaigns',
  'ts_active_character_id',
  'ts_creator_memory_v1',
];

export const USER_SCOPED_CACHE_KEYS = [
  ...SYNCED_KEYS,
  'ts_creator_draft',
  'ts_production_v1',
  'ts_notif_seen_at',
  'ts_auth_session',
  'ts_test_accounts',
];

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_CLOUD_REFERENCE_URLS = 10;

function isInlineImage(value) {
  return typeof value === 'string' && value.startsWith('data:image/');
}

function isRemoteImageUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value);
}

// Cloud creator images are authoritative in private Supabase storage. The
// account-scoped ts_characters document must never become an image database,
// and it also must not persist signed URLs that will eventually expire.
// Strip all cloud display images before writing the document; bootstrap will
// hydrate fresh signed URLs into local runtime state before React consumes it.
function compactCloudCharacterDocument(value) {
  if (typeof value !== 'string' || !value) return value;
  try {
    const creators = JSON.parse(value);
    if (!Array.isArray(creators)) return value;
    let changed = false;
    const compacted = creators.map(character => {
      if (!character || character.cloudProfile !== true) return character;
      const refs = Array.isArray(character.refImages) ? character.refImages : [];
      const hasDisplayImages = refs.length > 0 || Boolean(character.image);
      if (!hasDisplayImages) return character;
      changed = true;
      return { ...character, refImages: [], image: null };
    });
    return changed ? JSON.stringify(compacted) : value;
  } catch {
    return value;
  }
}

let runtime = null;
let writeChain = Promise.resolve();
let runtimeEpoch = 0;

function announceSync(type, detail) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(type, { detail }));
}

function cloudCreatorId(character) {
  const candidate = character?.cloudCreatorId || character?.id || null;
  return typeof candidate === 'string' && UUID_PATTERN.test(candidate) ? candidate : null;
}

function orderCloudReferences(references = []) {
  const headshot = references.find(reference => reference.reference_type === 'headshot' && reference.is_canonical)
    || references.find(reference => reference.reference_type === 'headshot');
  const fullBody = references.find(reference => reference.reference_type === 'full_body' && reference.is_canonical)
    || references.find(reference => reference.reference_type === 'full_body');
  const additionals = references.filter(reference => reference.reference_type === 'additional');
  const ordered = [headshot, ...additionals, fullBody, ...references].filter(Boolean);
  const seen = new Set();
  return ordered.filter(reference => {
    const key = reference.id || reference.storage_path;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, MAX_CLOUD_REFERENCE_URLS);
}

function isSelfMigratedCloudThumbnail(reference, creatorId) {
  return typeof reference?.notes === 'string'
    && reference.notes.startsWith(`cast-sync:${creatorId}:`);
}

async function hydrateCloudRosterReferenceUrls(db, userId, epoch) {
  if (runtime?.epoch !== epoch || runtime?.userId !== userId) return;
  let creators;
  try {
    const raw = localStorage.getItem('ts_characters');
    creators = raw ? JSON.parse(raw) : [];
  } catch {
    return;
  }
  if (!Array.isArray(creators) || !creators.length) return;

  const targets = creators
    .map((character, index) => ({ character, index, creatorId: cloudCreatorId(character) }))
    .filter(item => item.character?.cloudProfile === true && item.creatorId);
  if (!targets.length) return;

  const repository = new SupabasePipelineRepository(db, userId);
  const hydrated = [...creators];
  let changed = false;

  for (const item of targets) {
    if (runtime?.epoch !== epoch || runtime?.userId !== userId) return;
    try {
      const loaded = await repository.loadCreatorProfile(item.creatorId);
      const selfMigrated = (loaded?.references || []).filter(reference => isSelfMigratedCloudThumbnail(reference, item.creatorId));
      for (const reference of selfMigrated) {
        await repository.removeReferenceAsset(reference.id).catch(() => undefined);
      }
      const cleanReferences = (loaded?.references || []).filter(reference => !isSelfMigratedCloudThumbnail(reference, item.creatorId));
      const references = orderCloudReferences(cleanReferences);
      const urls = references
        .map(reference => reference?.signed_url)
        .filter(isRemoteImageUrl)
        .slice(0, MAX_CLOUD_REFERENCE_URLS);
      if (!urls.length) continue;

      hydrated[item.index] = {
        ...item.character,
        id: item.creatorId,
        cloudCreatorId: item.creatorId,
        refImages: urls,
        image: urls[0],
      };
      changed = true;
    } catch {
      // Display URL hydration must never make authentication fail. Canonical
      // references remain authoritative server-side and generation can still
      // resolve them by creator id.
    }
  }

  if (!changed || runtime?.epoch !== epoch || runtime?.userId !== userId) return;
  const value = JSON.stringify(hydrated);
  try {
    localStorage.setItem('ts_characters', value);
  } catch {
    return;
  }
  // Deliberately do not persist signed URLs. They are runtime display state;
  // the cloud roster stays lightweight and receives fresh URLs next bootstrap.
  announceSync('thee:cloud-sync-ok', { key: 'ts_characters_reference_url_hydration' });
}

async function migrateLegacyCastReferences(db, userId, epoch) {
  if (runtime?.epoch !== epoch || runtime?.userId !== userId) return;
  let creators;
  try {
    const raw = localStorage.getItem('ts_characters');
    creators = raw ? JSON.parse(raw) : [];
  } catch {
    return;
  }
  if (!Array.isArray(creators) || !creators.length) return;

  // Cloud creators already own canonical private references. Their runtime
  // signed URLs are display state only and must never be re-uploaded as legacy
  // Cast references.
  const legacyWithImages = creators.filter(creator =>
    creator
    && creator.cloudProfile !== true
    && (
      (Array.isArray(creator.refImages) && creator.refImages.some(isInlineImage))
      || isInlineImage(creator.image)
    )
  );
  if (!legacyWithImages.length) return;

  try {
    const repository = new SupabasePipelineRepository(db, userId);
    await repository.syncStudioCreators(creators);
    const cloudCreators = await repository.listCreators();
    const cloudBySavedId = new Map();

    for (const source of legacyWithImages) {
      if (runtime?.epoch !== epoch || runtime?.userId !== userId) return;
      const cloudCreator = cloudCreators.find(item => String(item.studio_source_id) === String(source.id))
        || cloudCreators.find(item => item.name?.trim().toLowerCase() === source.name?.trim().toLowerCase());
      if (!cloudCreator) continue;
      await syncCastReferencesToCloud(repository, source, cloudCreator, source.id);
      cloudBySavedId.set(String(source.id), cloudCreator.id);
    }

    // Canonical storage is only half the migration: legacy Cast objects must
    // also learn their real UUID or downstream generation continues treating
    // them as anonymous legacy creators. Persist this mapping back into the
    // account-scoped ts_characters cloud document so every browser/device
    // resolves the same creator after the first successful self-heal.
    let mappingChanged = false;
    const reconciledCreators = creators.map(creator => {
      const linkedCreatorId = cloudBySavedId.get(String(creator.id));
      if (!linkedCreatorId || creator.cloudCreatorId === linkedCreatorId) return creator;
      mappingChanged = true;
      return { ...creator, cloudCreatorId: linkedCreatorId };
    });

    if (mappingChanged && runtime?.epoch === epoch && runtime?.userId === userId) {
      const localValue = JSON.stringify(reconciledCreators);
      localStorage.setItem('ts_characters', localValue);
      await writeDocument('ts_characters', compactCloudCharacterDocument(localValue), runtime);
    }

    announceSync('thee:cloud-sync-ok', { key: 'creator_reference_assets' });
  } catch (error) {
    // Migration is a background self-heal and must never block authentication.
    // Surface it through the normal sync/error telemetry so it remains visible.
    announceSync('thee:cloud-sync-error', { message: 'Creator reference migration is incomplete.', key: 'creator_reference_assets' });
    void reportStudioError(error, { code: 'legacy_creator_reference_migration_failed', operation: 'creator_reference_migration' });
  }
}

export async function bootstrapCloudStore(db, userId) {
  clearUserScopedCache();
  const epoch = ++runtimeEpoch;
  runtime = { db, userId, epoch };
  const { data, error } = await db.from('studio_documents')
    .select('document_key,payload')
    .in('document_key', SYNCED_KEYS);
  if (error) throw new Error(`Cloud data sync failed: ${error.message}`);
  if (runtime?.epoch !== epoch || runtime?.userId !== userId) return;
  const documents = new Map((data || []).map(row => [row.document_key, row.payload?.value]));
  let healedCharactersValue = null;
  for (const key of SYNCED_KEYS) {
    if (documents.has(key)) {
      const originalValue = documents.get(key);
      const value = key === 'ts_characters'
        ? compactCloudCharacterDocument(originalValue)
        : originalValue;
      if (key === 'ts_characters' && value !== originalValue) healedCharactersValue = value;
      if (value == null) localStorage.removeItem(key);
      else localStorage.setItem(key, String(value));
    } else {
      localStorage.removeItem(key);
    }
  }

  // Self-heal any old cloud document that still contains browser image data.
  // This write is lightweight because compactCloudCharacterDocument strips
  // cloud creator image payloads and expiring signed URLs.
  if (healedCharactersValue != null) {
    queueMicrotask(() => void writeDocument('ts_characters', healedCharactersValue, runtime).catch(() => undefined));
  }

  // Hydrate fresh private signed URLs BEFORE bootstrap resolves. This performs
  // metadata/signing requests only (no image compression/download), so Cast
  // mounts with crisp original-resolution references while localStorage holds
  // only short URL strings for the current browser session.
  await hydrateCloudRosterReferenceUrls(db, userId, epoch);

  // Legacy local creators can migrate in the background after cloud creators
  // are fully hydrated. Cloud creators are excluded from this migration.
  queueMicrotask(() => void migrateLegacyCastReferences(db, userId, epoch));
}

async function writeDocument(key, value, sourceRuntime = runtime) {
  if (!sourceRuntime || runtime?.epoch !== sourceRuntime.epoch || !SYNCED_KEYS.includes(key)) return;
  const telemetryKey = createTelemetryRequestKey();
  const { error } = await sourceRuntime.db.from('studio_documents').upsert({
    user_id: sourceRuntime.userId,
    document_key: key,
    payload: { value },
  }, { onConflict: 'user_id,document_key' });
  if (error) {
    await trackStorageOperation({ requestKey: telemetryKey, storageOperation: 'storage_write', status: 'failed', bucket: 'studio_documents', objectType: key, failureReason: error.message });
    throw new Error(`Could not save ${key} to the cloud: ${error.message}`);
  }
  await trackStorageOperation({ requestKey: telemetryKey, storageOperation: 'storage_write', storageDeltaBytes: new Blob([JSON.stringify(value)]).size, bucket: 'studio_documents', objectType: key });
  announceSync('thee:cloud-sync-ok', { key });
}

export function persistCloudDocument(key, value) {
  if (!runtime || !SYNCED_KEYS.includes(key)) return Promise.resolve();
  const sourceRuntime = runtime;
  const persistedValue = key === 'ts_characters'
    ? compactCloudCharacterDocument(value)
    : value;
  writeChain = writeChain
    .catch(() => undefined)
    .then(() => writeDocument(key, persistedValue, sourceRuntime))
    .catch(error => {
      announceSync('thee:cloud-sync-error', { message: error.message, key });
      reportStudioError(error, { key, operation: 'cloud_document_write' });
      throw error;
    });
  return writeChain;
}

export function removeCloudDocument(key) {
  return persistCloudDocument(key, null);
}

export async function persistCloudAsset(assetId, blob) {
  if (!runtime) return null;
  const telemetryKey = createTelemetryRequestKey();
  const extension = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
  }[blob.type] || 'bin';
  const path = `${runtime.userId}/library/${assetId}.${extension}`;
  const { error } = await runtime.db.storage.from('studio-assets').upload(path, blob, {
    contentType: blob.type || 'application/octet-stream',
    upsert: true,
    cacheControl: '31536000',
  });
  if (error) {
    await trackStorageOperation({ requestKey: telemetryKey, storageOperation: 'storage_write', status: 'failed', bucket: 'studio-assets', objectType: blob.type, failureReason: error.message });
    const failure = new Error(`Could not save the full-resolution asset: ${error.message}`);
    announceSync('thee:cloud-sync-error', { message: failure.message, assetId });
    void reportStudioError(failure, { assetId, operation: 'cloud_asset_write' });
    throw failure;
  }
  await trackStorageOperation({ requestKey: telemetryKey, storageOperation: 'storage_write', storageDeltaBytes: blob.size, bucket: 'studio-assets', objectType: blob.type });
  announceSync('thee:cloud-sync-ok', { assetId });
  return path;
}

export async function downloadCloudAsset(path) {
  if (!runtime || !path) return null;
  const telemetryKey = createTelemetryRequestKey();
  const { data, error } = await runtime.db.storage.from('studio-assets').download(path);
  if (error) {
    await trackStorageOperation({ requestKey: telemetryKey, storageOperation: 'storage_read', status: 'failed', bucket: 'studio-assets', objectType: 'library_asset', failureReason: error.message });
    throw new Error(`Could not retrieve the full-resolution asset: ${error.message}`);
  }
  await trackStorageOperation({ requestKey: telemetryKey, storageOperation: 'storage_read', storageDeltaBytes: data?.size || 0, bucket: 'studio-assets', objectType: data?.type || 'library_asset' });
  return data || null;
}

export async function removeCloudAsset(path) {
  if (!runtime || !path) return;
  const telemetryKey = createTelemetryRequestKey();
  const { error } = await runtime.db.storage.from('studio-assets').remove([path]);
  if (error) {
    await trackStorageOperation({ requestKey: telemetryKey, storageOperation: 'storage_delete', status: 'failed', bucket: 'studio-assets', objectType: 'library_asset', failureReason: error.message });
    void reportStudioError(error, { path, operation: 'cloud_asset_delete' });
    return;
  }
  await trackStorageOperation({ requestKey: telemetryKey, storageOperation: 'storage_delete', storageDeltaBytes: 0, bucket: 'studio-assets', objectType: 'library_asset' });
}

export function resetCloudStore() {
  runtimeEpoch += 1;
  runtime = null;
  writeChain = Promise.resolve();
  clearUserScopedCache();
}

export function clearUserScopedCache() {
  if (typeof localStorage === 'undefined') return;
  for (const key of USER_SCOPED_CACHE_KEYS) localStorage.removeItem(key);
}

export function reportStudioError(error, context = {}, source = 'frontend') {
  const message = error instanceof Error ? error.message : String(error || 'Unknown error');
  console.error(`[${source}]`, error);
  if (!runtime) return Promise.resolve();
  return runtime.db.from('studio_error_events').insert({
    user_id: runtime.userId,
    source,
    code: context.code || 'client_error',
    message: message.slice(0, 4000),
    context,
    route: window.location.pathname,
  }).then(() => undefined).catch(() => undefined);
}

export function installGlobalErrorTelemetry() {
  const onError = event => {
    reportStudioError(event.error || event.message, {
      code: 'window_error',
      filename: event.filename,
      line: event.lineno,
      column: event.colno,
    });
  };
  const onRejection = event => {
    reportStudioError(event.reason, { code: 'unhandled_rejection' });
  };
  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);
  return () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
  };
}
