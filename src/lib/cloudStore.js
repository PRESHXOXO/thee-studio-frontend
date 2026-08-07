import { createTelemetryRequestKey, trackStorageOperation } from '../api/usageTelemetry.js';

export const SYNCED_KEYS = [
  'ts_characters',
  'ts_library',
  'ts_references',
  'ts_promptlab',
  'ts_campaigns',
  'ts_active_character_id',
  'ts_creator_memory_v1',
];

// Browser cache is only a working copy for the currently authenticated user.
// These keys must never survive logout or an account switch.
export const USER_SCOPED_CACHE_KEYS = [
  ...SYNCED_KEYS,
  'ts_creator_draft',
  'ts_production_v1',
  'ts_notif_seen_at',
  'ts_auth_session',
  'ts_test_accounts',
];

let runtime = null;
let writeChain = Promise.resolve();
let runtimeEpoch = 0;

function announceSync(type, detail) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(type, { detail }));
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
  for (const key of SYNCED_KEYS) {
    if (documents.has(key)) {
      const value = documents.get(key);
      if (value == null) localStorage.removeItem(key);
      else localStorage.setItem(key, String(value));
    } else {
      localStorage.removeItem(key);
    }
  }
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
