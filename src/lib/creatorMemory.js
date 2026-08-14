import { persistCloudDocument } from './cloudStore.js';

export const CREATOR_MEMORY_KEY = 'ts_creator_memory_v1';

export const EMPTY_BRAND_DNA = {
  visualSignature: '',
  colorPalette: '',
  cameraLanguage: '',
  lighting: '',
  wardrobeRules: '',
  locationRules: '',
  hairRules: '',
  makeupRules: '',
  mustKeep: '',
  avoid: '',
};

const SENTINEL_VALUES = new Set([
  '', 'none', 'unspecified', 'n/a', 'na', 'default', 'surprise', 'surprise me',
  'not specified', 'no preference', 'no preference specified', 'choose for me',
  'automatic', 'auto',
]);

function normalizedValue(value) {
  if (value == null) return '';
  const text = String(value).trim().replace(/\s+/g, ' ');
  const sentinelKey = text.toLowerCase().replace(/[.!]+$/g, '').trim();
  return SENTINEL_VALUES.has(sentinelKey) ? '' : text;
}

function uniqueValues(values = []) {
  const seen = new Set();
  return values.reduce((result, value) => {
    const clean = normalizedValue(value);
    const key = clean.toLocaleLowerCase();
    if (!clean || seen.has(key)) return result;
    seen.add(key);
    result.push(clean);
    return result;
  }, []);
}

function sanitizeLearnedItems(items = []) {
  const seen = new Set();
  return (Array.isArray(items) ? items : []).reduce((result, item) => {
    const value = normalizedValue(typeof item === 'object' ? item?.value : item);
    const key = value.toLocaleLowerCase();
    if (!value || seen.has(key)) return result;
    seen.add(key);
    result.push(typeof item === 'object' ? { ...item, value } : { value, count: 1 });
    return result;
  }, []);
}

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
    preferences: Object.fromEntries(Object.entries({ ...EMPTY_BRAND_DNA, ...(current.preferences || {}) })
      .map(([field, value]) => [field, normalizedValue(value)])),
    learned: {
      favoriteScenes: [],
      favoriteMoods: [],
      favoriteWardrobes: [],
      favoriteLocations: [],
      favoriteEngines: [],
      avoidScenes: [],
      ...Object.fromEntries(Object.entries(current.learned || {})
        .map(([field, items]) => [field, sanitizeLearnedItems(items)])),
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
    uniqueValues(values).forEach(value => {
      const key = value.toLocaleLowerCase();
      const current = counts.get(key);
      counts.set(key, { value: current?.value || value, count: (current?.count || 0) + 1 });
    });
  });
  return [...counts.entries()]
    .map(([, item]) => item)
    .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value))
    .slice(0, limit)
    .map(({ value, count }) => ({ value, count }));
}

function sceneValue(entry) {
  const scene = entry.scene || entry.settings?.scene;
  if (typeof scene === 'string') return scene;
  return scene?.setting || scene?.location || '';
}

function moodValue(entry) {
  return entry.mood || entry.settings?.mood || entry.settings?.scene?.vibe || '';
}

function wardrobeValue(entry) {
  return entry.wardrobe || entry.settings?.wardrobe || entry.settings?.outfit || entry.settings?.scene?.wardrobe || '';
}

function locationValue(entry) {
  return entry.location || entry.settings?.location || entry.settings?.scene?.location || '';
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
      favoriteWardrobes: topValues(approved, wardrobeValue),
      favoriteLocations: topValues(approved, locationValue),
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
    normalized[field] = normalizedValue(preferences[field]);
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
  return uniqueValues(sanitizeLearnedItems(items).map(item => item.value)).join(', ');
}

function hasExplicitIntent(value) {
  if (Array.isArray(value)) return value.some(hasExplicitIntent);
  return Boolean(normalizedValue(value));
}

export function creatorMemoryPrompt(memory, context = {}) {
  if (!memory) return '';
  const preferences = Object.fromEntries(Object.entries({ ...EMPTY_BRAND_DNA, ...(memory.preferences || {}) })
    .map(([field, value]) => [field, normalizedValue(value)]));
  const learned = memory.learned || {};
  const roles = new Set((context.referenceRoles || [])
    .map(role => String(typeof role === 'object' ? role?.role : role).trim().toLowerCase())
    .filter(Boolean));
  const explicitScene = hasExplicitIntent(context.explicitScene) || hasExplicitIntent(context.locationIntent) || hasExplicitIntent(context.backgroundIntent);
  const explicitMood = hasExplicitIntent(context.explicitMood);
  const explicitWardrobe = hasExplicitIntent(context.wardrobeIntent) || hasExplicitIntent(context.explicitWardrobe);
  const explicitHair = hasExplicitIntent(context.hairIntent);
  const explicitMakeup = hasExplicitIntent(context.makeupIntent);
  const sceneAuthority = explicitScene || roles.has('background');
  const wardrobeAuthority = explicitWardrobe || roles.has('outfit');
  const hairAuthority = explicitHair || roles.has('hair');
  const makeupAuthority = explicitMakeup || roles.has('makeup');
  const lines = [
    preferences.visualSignature && `Visual signature: ${preferences.visualSignature}`,
    preferences.colorPalette && `Color palette: ${preferences.colorPalette}`,
    preferences.cameraLanguage && `Camera language: ${preferences.cameraLanguage}`,
    preferences.lighting && `Lighting rules: ${preferences.lighting}`,
    !wardrobeAuthority && preferences.wardrobeRules && `Wardrobe rules: ${preferences.wardrobeRules}`,
    !sceneAuthority && preferences.locationRules && `Location rules: ${preferences.locationRules}`,
    !hairAuthority && preferences.hairRules && `Hair rules: ${preferences.hairRules}`,
    !makeupAuthority && preferences.makeupRules && `Makeup rules: ${preferences.makeupRules}`,
    preferences.mustKeep && `Always preserve: ${preferences.mustKeep}`,
    !sceneAuthority && learnedValues(learned.favoriteScenes) && `Learned approved scenes: ${learnedValues(learned.favoriteScenes)}`,
    !sceneAuthority && learnedValues(learned.favoriteLocations) && `Learned approved locations: ${learnedValues(learned.favoriteLocations)}`,
    !explicitMood && learnedValues(learned.favoriteMoods) && `Learned approved moods: ${learnedValues(learned.favoriteMoods)}`,
    !wardrobeAuthority && learnedValues(learned.favoriteWardrobes) && `Learned approved wardrobe: ${learnedValues(learned.favoriteWardrobes)}`,
    preferences.avoid && `Avoid: ${preferences.avoid}`,
    !sceneAuthority && learnedValues(learned.avoidScenes) && `Learned weak/rejected scenes: ${learnedValues(learned.avoidScenes)}`,
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
