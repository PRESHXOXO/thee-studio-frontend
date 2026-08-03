import { persistCloudDocument } from './cloudStore.js';

// Persists which creator is "active" across reloads and screens.
// There is no backend session in this app — this is the local-only
// equivalent: survives reload, shared by every screen that reads it.
const KEY = 'ts_active_character_id';

export function loadActiveCreatorId() {
  try { return localStorage.getItem(KEY) || null; } catch { return null; }
}

export function saveActiveCreatorId(id) {
  try {
    if (id == null) {
      localStorage.removeItem(KEY);
      void persistCloudDocument(KEY, null).catch(() => undefined);
    } else {
      localStorage.setItem(KEY, String(id));
      void persistCloudDocument(KEY, String(id)).catch(() => undefined);
    }
  } catch {}
}

// Resolves the active creator against a loaded character list.
// If none is stored and there's exactly one creator, auto-selects it.
export function resolveActiveCreator(characters) {
  if (!characters?.length) return null;
  let id = loadActiveCreatorId();
  if (id == null && characters.length === 1) {
    id = characters[0].id;
    saveActiveCreatorId(id);
  }
  return characters.find(c => String(c.id) === String(id)) || null;
}
