import {
  listLibraryItems,
  registerUploadedLibraryItem,
  saveGeneratedLibraryItem,
  softDeleteLibraryItem,
  updateLibraryReview,
} from '../api/library.js';
import { saveLibraryOriginal } from './libraryAssets.js';
import { learnCreatorMemory } from './creatorMemory.js';

const KEY = 'ts_library';
const PNG_ORIGINAL_SOURCES = new Set(['quick_shoot', 'director', 'prompt_lab', 'scene_flow']);
let mutationChain = Promise.resolve();

function enqueueMutation(action) {
  const next = mutationChain.catch(() => undefined).then(action);
  mutationChain = next;
  return next;
}

function writeCache(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {}
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('thee:library-updated', { detail: { count: list.length } }));
  return list;
}

export function loadLibrary() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}

export async function refreshLibrary() {
  return writeCache(await listLibraryItems());
}

export async function deleteFromLibrary(id) {
  return enqueueMutation(async () => {
    await softDeleteLibraryItem(id);
    writeCache(loadLibrary().filter(entry => entry.id !== id));
  });
}

export async function updateLibraryEntry(id, patch) {
  return enqueueMutation(async () => {
    const current = loadLibrary().find(entry => entry.id === id);
    if (!current) return null;
    const item = await updateLibraryReview(id, patch.status ?? current.status ?? 'unreviewed', patch.note ?? current.note ?? null);
    const list = writeCache(loadLibrary().map(entry => entry.id === id ? item : entry));
    if (item.character) learnCreatorMemory(item.character, list);
    return item;
  });
}

export async function saveToLibrary(src, metadata = {}) {
  return enqueueMutation(async () => {
    metadata = { source: '', engine: '', prompt: '', character: '', ...metadata };
    let entry;
    if (metadata.parentBatchId && Number.isInteger(Number(metadata.slotIndex))) {
      // Signed URLs and component lifetimes are display-only. Parent + slot is
      // the immutable server idempotency key for generated results.
      const existing = loadLibrary().find(item => item.parentBatchId === metadata.parentBatchId
        && Number(item.slotIndex) === Number(metadata.slotIndex));
      if (existing) return existing;
      entry = await saveGeneratedLibraryItem({ ...metadata, slotIndex: Number(metadata.slotIndex) });
    } else {
      const id = crypto.randomUUID();
      const preferredMimeType = PNG_ORIGINAL_SOURCES.has(metadata.source) ? 'image/png' : null;
      const original = await saveLibraryOriginal(id, src, { preferredMimeType });
      if (!original.originalStoragePath) throw new Error('The Library asset was not stored.');
      entry = await registerUploadedLibraryItem(original.originalStoragePath, metadata);
    }
    const list = loadLibrary();
    const index = list.findIndex(item => item.id === entry.id);
    if (index >= 0) list[index] = entry;
    else list.unshift(entry);
    writeCache(list);
    return entry;
  });
}
