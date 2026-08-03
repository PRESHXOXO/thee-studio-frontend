import { persistCloudDocument } from './cloudStore.js';
import { deleteLibraryOriginal, saveLibraryOriginal } from './libraryAssets.js';
import { learnCreatorMemory } from './creatorMemory.js';

const KEY = 'ts_library';
const MAX = 60;

export function loadLibrary() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}

export function deleteFromLibrary(id) {
  const current = loadLibrary();
  const removed = current.find(entry => entry.id === id);
  const list = current.filter(entry => entry.id !== id);
  if (removed) void deleteLibraryOriginal(removed);
  try {
    const value = JSON.stringify(list);
    localStorage.setItem(KEY, value);
    void persistCloudDocument(KEY, value).catch(() => undefined);
  } catch {}
  if (removed?.character) learnCreatorMemory(removed.character, list);
}

// Review workflow: patch an entry (status, notes, etc.) in place.
// status: 'unreviewed' | 'approved' | 'needs_fix' | 'rejected'
export function updateLibraryEntry(id, patch) {
  const list = loadLibrary();
  const idx = list.findIndex(e => e.id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...patch, reviewedAt: new Date().toISOString() };
  try {
    const value = JSON.stringify(list);
    localStorage.setItem(KEY, value);
    void persistCloudDocument(KEY, value).catch(() => undefined);
  } catch {}
  if (list[idx].character) learnCreatorMemory(list[idx].character, list);
  return list[idx];
}

function _compressDataUrl(dataUrl, maxPx, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

// Compress any image src to a small JPEG data URL.
// Fetches non-data URLs first so Gradio file paths don't expire.
export async function compressForLibrary(src, maxPx = 640, quality = 0.82) {
  let dataUrl = src;
  if (!src.startsWith('data:')) {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
    const blob = await res.blob();
    dataUrl = await new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.onerror = rej;
      fr.readAsDataURL(blob);
    });
  }
  return _compressDataUrl(dataUrl, maxPx, quality);
}

export async function saveToLibrary(src, metadata = {}) {
  metadata = { source: '', engine: '', prompt: '', character: '', ...metadata };
  const id = `lib_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const [url, original] = await Promise.all([
    compressForLibrary(src).catch(() => src),
    saveLibraryOriginal(id, src).catch(() => ({
      originalAssetId: id,
      originalUrl: src.startsWith('data:') ? undefined : src,
    })),
  ]);
  const list = loadLibrary();
  const entry = {
    id,
    url,
    savedAt: new Date().toISOString(),
    ...original,
    ...metadata,
  };
  list.unshift(entry);
  if (list.length > MAX) {
    const pruned = list.splice(MAX);
    pruned.forEach(item => void deleteLibraryOriginal(item));
  }

  let value = JSON.stringify(list);
  try {
    localStorage.setItem(KEY, value);
  } catch {
    // Storage pressure — drop oldest half and retry
    const pruned = list.splice(Math.floor(MAX / 2));
    pruned.forEach(item => void deleteLibraryOriginal(item));
    value = JSON.stringify(list);
    try { localStorage.setItem(KEY, value); } catch {}
  }
  await persistCloudDocument(KEY, value);
  if (entry.character) learnCreatorMemory(entry.character, list);
  return entry;
}
