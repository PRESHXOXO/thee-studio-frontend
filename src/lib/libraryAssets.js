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

async function imageBlobToPng(blob) {
  if (!(blob instanceof Blob) || !blob.type?.startsWith('image/') || blob.type === 'image/png') return blob;
  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) throw new Error('PNG conversion canvas is unavailable.');
    context.drawImage(bitmap, 0, 0);
    const png = await new Promise((resolve, reject) => {
      canvas.toBlob(result => {
        if (result) resolve(result);
        else reject(new Error('PNG conversion failed.'));
      }, 'image/png');
    });
    return png;
  } finally {
    bitmap.close?.();
  }
}

async function normalizeOriginalBlob(blob, preferredMimeType) {
  if (preferredMimeType === 'image/png' && blob.type?.startsWith('image/')) {
    return imageBlobToPng(blob);
  }
  return blob;
}

async function cacheBlob(assetId, blob) {
  try { await useStore('readwrite', store => store.put(blob, assetId)); } catch {}
}

async function cachedBlob(assetId) {
  if (!assetId) return null;
  try { return await useStore('readonly', store => store.get(assetId)); } catch { return null; }
}

export async function saveLibraryOriginal(assetId, source, options = {}) {
  const sourceBlob = await sourceToBlob(source);
  const blob = await normalizeOriginalBlob(sourceBlob, options.preferredMimeType || null);
  await cacheBlob(assetId, blob);
  let storagePath = null;
  try { storagePath = await persistCloudAsset(assetId, blob); } catch {}
  return {
    originalAssetId: assetId,
    originalStoragePath: storagePath,
    originalMimeType: blob.type || sourceBlob.type || 'application/octet-stream',
    originalBytes: blob.size,
    originalSourceMimeType: sourceBlob.type || null,
  };
}

export async function getLibraryOriginalBlob(entry) {
  const assetId = entry.originalAssetId || entry.id;
  let blob = await cachedBlob(assetId);
  if (!blob && entry.originalStoragePath) {
    blob = await downloadCloudAsset(entry.originalStoragePath, entry.originalStorageBucket || 'studio-assets');
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

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadImageAsPng(source, filename = 'thee-studio.png') {
  const sourceBlob = await sourceToBlob(source);
  const png = await imageBlobToPng(sourceBlob);
  triggerBlobDownload(png, filename.toLowerCase().endsWith('.png') ? filename : `${filename}.png`);
}

export async function downloadLibraryOriginal(entry) {
  let blob = await getLibraryOriginalBlob(entry);
  if (['quick_shoot', 'director', 'prompt_lab', 'scene_flow'].includes(entry.source)) {
    blob = await imageBlobToPng(blob);
  }
  triggerBlobDownload(blob, `thee-studio-${entry.id}.${extensionFor(blob.type || entry.originalMimeType)}`);
}

export async function deleteLibraryOriginal(entry) {
  const assetId = entry?.originalAssetId || entry?.id;
  if (assetId) {
    try { await useStore('readwrite', store => store.delete(assetId)); } catch {}
  }
  if (entry?.originalStoragePath) await removeCloudAsset(entry.originalStoragePath);
}
