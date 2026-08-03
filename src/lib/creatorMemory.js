import { persistCloudDocument } from './cloudStore.js';

export const CREATOR_MEMORY_KEY = 'ts_creator_memory_v1';

export const EMPTY_BRAND_DNA = {
  visualSignature: '',
  colorPalette: '',
  cameraLanguage: '',
  lighting: '',
  wardrobeRules: '',
  locationRules: '',
  mustKeep: '',
  avoid: '',
};

function readStore() {
  try { return JSON.parse(localStorage.getItem(CREATOR_MEMORY_KEY) || '{}'); }
  catch { return {}; }
}

function writeStore(store) {
  const value = JSON.stringify(store);
  localStorage.setItem(CREATOR_MEMORY_KEY, value);
  void persistCloudDocument(CREATOR_MEMORY_KEY, value).catch(() => undefined);
}

const keyFor = creatorId => String(creatorId || '');

export function getCreatorMemory(creatorId) {
  const creatorKey = keyFor(creatorId);
  const current = readStore()[creatorKey] || {};
  return {
    creatorId: creatorKey,
    version: current.version || 1,
    preferences: { ...EMPTY_BRAND_DNA, ...(current.preferences || {}) },
    learned: {
      favoriteScenes: [],
      favoriteMoods: [],
      favoriteEngines: [],
      avoidScenes: [],
      ...(current.learned || {}),
    },
    feedback: {
      total: 0,
      approved: 0,
      needsFix: 0,
      rejected: 0,
      ...(current.feedback || {}),
    },
    history: current.history || [],
    updatedAt: current.updatedAt || null,
  };
}

function topValues(entries, getter, limit = 4) {
  const counts = new Map();
  entries.forEach(entry => {
    const raw = getter(entry);
    const values = Array.isArray(raw) ? raw : [raw];
    values.filter(Boolean).forEach(value => {
      const normalized = String(value).trim();
      if (normalized) counts.set(normalized, (counts.get(normalized) || 0) + 1);
    });
  });
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([value, count]) => ({ value, count }));
}

function sceneValue(entry) {
  const scene = entry.scene || entry.settings?.scene;
  if (typeof scene === 'string') return scene;
  return scene?.setting || scene?.location || '';
}

function moodValue(entry) {
  return entry.mood || entry.settings?.mood || entry.settings?.scene?.vibe || '';
}

export function learnCreatorMemory(creatorId, libraryEntries) {
  const creatorKey = keyFor(creatorId);
  if (!creatorKey) return null;
  const relevant = libraryEntries.filter(entry => keyFor(entry.character) === creatorKey);
  const approved = relevant.filter(entry => entry.status === 'approved');
  const needsFix = relevant.filter(entry => entry.status === 'needs_fix');
  const rejected = relevant.filter(entry => entry.status === 'rejected');
  const current = getCreatorMemory(creatorKey);
  const next = {
    ...current,
    learned: {
      favoriteScenes: topValues(approved, sceneValue),
      favoriteMoods: topValues(approved, moodValue),
      favoriteEngines: topValues(approved, entry => entry.engine),
      avoidScenes: topValues([...needsFix, ...rejected], sceneValue),
    },
    feedback: {
      total: relevant.length,
      approved: approved.length,
      needsFix: needsFix.length,
      rejected: rejected.length,
    },
    updatedAt: new Date().toISOString(),
  };
  const store = readStore();
  store[creatorKey] = next;
  writeStore(store);
  return next;
}

export function learnAllCreatorMemories(libraryEntries) {
  const ids = new Set(libraryEntries.map(entry => keyFor(entry.character)).filter(Boolean));
  return [...ids].map(id => learnCreatorMemory(id, libraryEntries));
}

export function saveCreatorMemory(creatorId, preferences) {
  const creatorKey = keyFor(creatorId);
  if (!creatorKey) throw new Error('Choose a creator before saving memory.');
  const current = getCreatorMemory(creatorKey);
  const normalized = { ...EMPTY_BRAND_DNA };
  Object.keys(normalized).forEach(field => {
    normalized[field] = String(preferences[field] || '').trim();
  });
  const changed = JSON.stringify(normalized) !== JSON.stringify(current.preferences);
  const version = changed ? current.version + 1 : current.version;
  const history = changed
    ? [...current.history, {
      version: current.version,
      savedAt: current.updatedAt || new Date().toISOString(),
      preferences: current.preferences,
    }].slice(-10)
    : current.history;
  const next = {
    ...current,
    creatorId: creatorKey,
    version,
    preferences: normalized,
    history,
    updatedAt: new Date().toISOString(),
  };
  const store = readStore();
  store[creatorKey] = next;
  writeStore(store);
  return next;
}

function learnedValues(items = []) {
  return items.map(item => item.value).filter(Boolean).join(', ');
}

export function creatorMemoryPrompt(memory) {
  if (!memory) return '';
  const preferences = memory.preferences || EMPTY_BRAND_DNA;
  const learned = memory.learned || {};
  const lines = [
    preferences.visualSignature && `Visual signature: ${preferences.visualSignature}`,
    preferences.colorPalette && `Color palette: ${preferences.colorPalette}`,
    preferences.cameraLanguage && `Camera language: ${preferences.cameraLanguage}`,
    preferences.lighting && `Lighting rules: ${preferences.lighting}`,
    preferences.wardrobeRules && `Wardrobe rules: ${preferences.wardrobeRules}`,
    preferences.locationRules && `Location rules: ${preferences.locationRules}`,
    preferences.mustKeep && `Always preserve: ${preferences.mustKeep}`,
    learnedValues(learned.favoriteScenes) && `Learned approved scenes: ${learnedValues(learned.favoriteScenes)}`,
    learnedValues(learned.favoriteMoods) && `Learned approved moods: ${learnedValues(learned.favoriteMoods)}`,
    preferences.avoid && `Avoid: ${preferences.avoid}`,
    learnedValues(learned.avoidScenes) && `Learned weak/rejected scenes: ${learnedValues(learned.avoidScenes)}`,
  ].filter(Boolean);
  return lines.length
    ? `CREATOR MEMORY — APPLY CONSISTENTLY:\n${lines.join('\n')}`
    : '';
}

export function memoryConfidence(memory) {
  const reviewed = (memory?.feedback?.approved || 0)
    + (memory?.feedback?.needsFix || 0)
    + (memory?.feedback?.rejected || 0);
  const filled = Object.values(memory?.preferences || {}).filter(Boolean).length;
  return Math.min(100, reviewed * 8 + filled * 6);
}
