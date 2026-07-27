const SYNCED_KEYS = [
  'ts_characters',
  'ts_library',
  'ts_references',
  'ts_promptlab',
  'ts_campaigns',
  'ts_active_character_id',
];

let runtime = null;
let writeChain = Promise.resolve();

function announceSync(type, detail) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(type, { detail }));
  }
}

export async function bootstrapCloudStore(db, userId) {
  runtime = { db, userId };
  const { data, error } = await db.from('studio_documents')
    .select('document_key,payload')
    .in('document_key', SYNCED_KEYS);
  if (error) throw new Error(`Cloud data sync failed: ${error.message}`);
  const documents = new Map((data || []).map(row => [row.document_key, row.payload?.value]));
  const migrations = [];
  for (const key of SYNCED_KEYS) {
    if (documents.has(key)) {
      const value = documents.get(key);
      if (value == null) localStorage.removeItem(key);
      else localStorage.setItem(key, String(value));
      continue;
    }
    const localValue = localStorage.getItem(key);
    if (localValue != null) migrations.push(writeDocument(key, localValue));
  }
  await Promise.all(migrations);
}

async function writeDocument(key, value) {
  if (!runtime || !SYNCED_KEYS.includes(key)) return;
  const { error } = await runtime.db.from('studio_documents').upsert({
    user_id: runtime.userId,
    document_key: key,
    payload: { value },
  }, { onConflict: 'user_id,document_key' });
  if (error) throw new Error(`Could not save ${key} to the cloud: ${error.message}`);
  announceSync('thee:cloud-sync-ok', { key });
}

export function persistCloudDocument(key, value) {
  if (!runtime || !SYNCED_KEYS.includes(key)) return Promise.resolve();
  writeChain = writeChain
    .catch(() => undefined)
    .then(() => writeDocument(key, value))
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

export function resetCloudStore() {
  runtime = null;
  writeChain = Promise.resolve();
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
