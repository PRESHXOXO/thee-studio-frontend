import { persistCloudDocument } from './cloudStore.js';

const KEY = 'ts_library';
const MAX = 60;

export function loadLibrary() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}

export function deleteFromLibrary(id) {
  const list = loadLibrary().filter(e => e.id !== id);
  try {
    const value = JSON.stringify(list);
    localStorage.setItem(KEY, value);
    void persistCloudDocument(KEY, value).catch(() => undefined);
  } catch {}
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
  let url;
  try {
    url = await compressForLibrary(src);
  } catch {
    url = src; // fallback: store as-is
  }

  const list = loadLibrary();
  const entry = {
    id: `lib_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    url,
    savedAt: new Date().toISOString(),
    ...metadata,
  };
  list.unshift(entry);
  if (list.length > MAX) list.splice(MAX);

  let value = JSON.stringify(list);
  try {
    localStorage.setItem(KEY, value);
  } catch {
    // Storage pressure — drop oldest half and retry
    list.splice(Math.floor(MAX / 2));
    value = JSON.stringify(list);
    try { localStorage.setItem(KEY, value); } catch {}
  }
  await persistCloudDocument(KEY, value);
  return entry;
}
