const KEY_PREFIX = 'thee-studio:scene-flow:v3:';
const DB_NAME = 'thee-studio-scene-flow';
const DB_VERSION = 1;
const STORE = 'reference_blobs';

function key(scope) { return `${KEY_PREFIX}${encodeURIComponent(scope || 'open')}`; }
function blobKey(scope, id) { return `${scope || 'open'}:${id}`; }

export function serializeSceneFlowDraft({ scene = null, messages = [], history = [], references = [], outputType = 'photo' } = {}) {
  return {
    version: 3,
    scene,
    messages: messages.slice(-60).map(message => ({ role: message.role, text: String(message.text || '').slice(0, 6000) })),
    history: history.slice(-30).map(message => ({ role: message.role, content: String(message.content || '').slice(0, 12000) })),
    references: references.map(reference => ({
      id: reference.id,
      name: String(reference.name || 'Reference').slice(0, 160),
      role: reference.role,
      pending: Boolean(reference.pending),
      source: reference.source || 'upload',
      storagePath: typeof reference.storagePath === 'string' ? reference.storagePath : undefined,
    })),
    outputType: outputType === 'video' ? 'video' : 'photo',
    updatedAt: new Date().toISOString(),
  };
}

function openDb() {
  if (!globalThis.indexedDB) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const request = globalThis.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function dataUrlBlob(value) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\r\n]+)$/i.exec(value || '');
  if (!match) return null;
  const binary = atob(match[2].replace(/\s+/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: match[1].toLowerCase() });
}

function blobDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function writeReferenceBlobs(scope, references) {
  const db = await openDb();
  if (!db) return;
  await new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readwrite');
    const store = transaction.objectStore(STORE);
    const keep = new Set(references.map(reference => blobKey(scope, reference.id)));
    references.forEach(reference => {
      const blob = dataUrlBlob(reference.dataUrl);
      if (blob) store.put(blob, blobKey(scope, reference.id));
    });
    const cursor = store.openCursor();
    cursor.onsuccess = () => {
      const current = cursor.result;
      if (!current) return;
      if (String(current.key).startsWith(`${scope || 'open'}:`) && !keep.has(String(current.key))) current.delete();
      current.continue();
    };
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
}

async function readReferenceBlobs(scope, references) {
  const db = await openDb();
  if (!db) return references;
  const restored = await Promise.all(references.map(reference => new Promise(resolve => {
    const transaction = db.transaction(STORE, 'readonly');
    const request = transaction.objectStore(STORE).get(blobKey(scope, reference.id));
    request.onsuccess = async () => {
      try { resolve(request.result instanceof Blob ? { ...reference, dataUrl: await blobDataUrl(request.result) } : reference); }
      catch { resolve(reference); }
    };
    request.onerror = () => resolve(reference);
  })));
  db.close();
  return restored;
}

export async function saveSceneFlowDraft(scope, value) {
  const serialized = serializeSceneFlowDraft(value);
  try { globalThis.localStorage?.setItem(key(scope), JSON.stringify(serialized)); } catch {}
  await writeReferenceBlobs(scope, value.references || []).catch(() => undefined);
  return serialized;
}

export async function loadSceneFlowDraft(scope) {
  let parsed = null;
  try {
    const raw = globalThis.localStorage?.getItem(key(scope));
    parsed = raw ? JSON.parse(raw) : null;
  } catch { return null; }
  if (!parsed || parsed.version !== 3 || !Array.isArray(parsed.references)) return null;
  return { ...parsed, references: await readReferenceBlobs(scope, parsed.references).catch(() => parsed.references) };
}

export function clearSceneFlowDraft(scope) {
  try { globalThis.localStorage?.removeItem(key(scope)); } catch {}
  openDb().then(db => {
    if (!db) return;
    const transaction = db.transaction(STORE, 'readwrite');
    const cursor = transaction.objectStore(STORE).openCursor();
    cursor.onsuccess = () => {
      const current = cursor.result;
      if (!current) return;
      if (String(current.key).startsWith(`${scope || 'open'}:`)) current.delete();
      current.continue();
    };
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => db.close();
  }).catch(() => undefined);
}
