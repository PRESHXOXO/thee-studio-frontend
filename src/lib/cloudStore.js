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

const MAX_CLOUD_PREVIEW_CHARS = 220000;

function compactCloudCharacterDocument(value) {
  if (typeof value !== 'string' || !value) return value;
  try {
    const creators = JSON.parse(value);
    if (!Array.isArray(creators)) return value;
    let changed = false;
    const compacted = creators.map(character => {
      if (!character || character.cloudProfile !== true) return character;
      const candidates = [
        ...(Array.isArray(character.refImages) ? character.refImages : []),
        character.image,
      ];
      const preview = candidates.find(candidate => (
        typeof candidate === 'string'
        && candidate.startsWith('data:image/')
        && candidate.length <= MAX_CLOUD_PREVIEW_CHARS
      )) || null;
      const hasPackedRefs = Array.isArray(character.refImages) && character.refImages.length > 0;
      const imageChanged = character.image !== preview;
      if (!hasPackedRefs && !imageChanged) return character;
      changed = true;
      return { ...character, refImages: [], image: preview };
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

  const legacyWithImages = creators.filter(creator =>
    creator && (
      (Array.isArray(creator.refImages) && creator.refImages.some(image => typeof image === 'string' && image.startsWith('data:image/')))
      || (typeof creator.image === 'string' && creator.image.startsWith('data:image/'))
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
      const cloudCreatorId = cloudBySavedId.get(String(creator.id));
      if (!cloudCreatorId || creator.cloudCreatorId === cloudCreatorId) return creator;
      mappingChanged = true;
      return { ...creator, cloudCreatorId };
    });

    if (mappingChanged && runtime?.epoch === epoch && runtime?.userId === userId) {
      const value = compactCloudCharacterDocument(JSON.stringify(reconciledCreators));
      localStorage.setItem('ts_characters', value);
      await writeDocument('ts_characters', value, runtime);
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

  // If an older cloud document still contains inline reference packs for a
  // canonical cloud creator, hydrate the compact roster first (avoiding a
  // browser quota failure) and then self-heal the authoritative document in
  // the background. Real reference files stay untouched in creator-references.
  if (healedCharactersValue != null) {
    queueMicrotask(() => void persistCloudDocument('ts_characters', healedCharactersValue).catch(() => undefined));
  }

  // Do not make sign-in wait on historical image uploads. The migration is
  // idempotent and account-scoped, so every successful bootstrap can safely
  // self-heal missing canonical Cast references in the background.
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
  writeChain = writeChain
    .catch(() => undefined)
    .then(() => writeDocument(key, value, sourceRuntime))
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
