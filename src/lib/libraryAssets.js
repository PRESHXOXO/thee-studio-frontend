import {
  downloadCloudAsset,
  persistCloudAsset,
  removeCloudAsset,
} from './cloudStore.js';

const DB_NAME = 'thee-studio-library-assets';
const STORE_NAME = 'originals';

let databasePromise;

function openDatabase() {
  if (!('indexedDB' in window)) return Promise.resolve(null);
  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) {
          request.result.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  return databasePromise;
}

async function useStore(mode, action) {
  const database = await openDatabase();
  if (!database) return null;
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const request = action(transaction.objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

async function sourceToBlob(source) {
  if (source instanceof Blob) return source;
  const response = await fetch(source);
  if (!response.ok) throw new Error(`Original image fetch failed: ${response.status}`);
  return response.blob();
}

async function cacheBlob(assetId, blob) {
  try { await useStore('readwrite', store => store.put(blob, assetId)); } catch {}
}

async function cachedBlob(assetId) {
  if (!assetId) return null;
  try { return await useStore('readonly', store => store.get(assetId)); } catch { return null; }
}

export async function saveLibraryOriginal(assetId, source) {
  const blob = await sourceToBlob(source);
  await cacheBlob(assetId, blob);
  let storagePath = null;
  try { storagePath = await persistCloudAsset(assetId, blob); } catch {}
  return {
    originalAssetId: assetId,
    originalStoragePath: storagePath,
    originalMimeType: blob.type || 'image/png',
    originalBytes: blob.size,
  };
}

export async function getLibraryOriginalBlob(entry) {
  const assetId = entry.originalAssetId || entry.id;
  let blob = await cachedBlob(assetId);
  if (!blob && entry.originalStoragePath) {
    blob = await downloadCloudAsset(entry.originalStoragePath);
    if (blob) await cacheBlob(assetId, blob);
  }
  if (!blob) {
    blob = await sourceToBlob(entry.originalUrl || entry.url);
  }
  return blob;
}

function extensionFor(type) {
  return {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
  }[type] || 'bin';
}

export async function downloadLibraryOriginal(entry) {
  const blob = await getLibraryOriginalBlob(entry);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `thee-studio-${entry.id}.${extensionFor(blob.type || entry.originalMimeType)}`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function deleteLibraryOriginal(entry) {
  const assetId = entry?.originalAssetId || entry?.id;
  if (assetId) {
    try { await useStore('readwrite', store => store.delete(assetId)); } catch {}
  }
  if (entry?.originalStoragePath) await removeCloudAsset(entry.originalStoragePath);
}
