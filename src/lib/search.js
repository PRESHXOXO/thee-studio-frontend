// Global search index — pulls from the same localStorage sources each
// screen already reads (no new data model), plus static nav destinations.
const SCREENS = [
  { id: 'home',       label: 'Studio' },
  { id: 'images',     label: 'New Creator' },
  { id: 'director',   label: 'Thee Director' },
  { id: 'characters', label: 'Cast' },
  { id: 'memory',     label: 'Creator Memory' },
  { id: 'scenes',      label: 'Scenes' },
  { id: 'references', label: 'References' },
  { id: 'campaigns',  label: 'Campaigns' },
  { id: 'library',    label: 'Library' },
  { id: 'history',    label: 'History' },
  { id: 'exports',    label: 'Exports' },
  { id: 'runs',       label: 'Jobs' },
  { id: 'settings',   label: 'Usage & Credits' },
];

function loadJSON(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}

export function buildSearchIndex() {
  const items = [];

  SCREENS.forEach(s => items.push({
    type: 'Screen', id: `screen_${s.id}`, label: s.label, sublabel: 'Go to screen',
    icon: 'compass', navId: s.id, navData: undefined,
  }));

  loadJSON('ts_characters').forEach(c => items.push({
    type: 'Creator', id: `char_${c.id}`, label: c.name || 'Unnamed creator', sublabel: 'Creator',
    icon: 'sparkles', navId: 'characters', navData: undefined,
  }));

  loadJSON('ts_campaigns').forEach(camp => items.push({
    type: 'Campaign', id: `camp_${camp.id}`, label: camp.name || 'Unnamed campaign',
    sublabel: camp.category ? `Campaign · ${camp.category}` : 'Campaign',
    icon: 'megaphone', navId: 'campaigns', navData: undefined,
  }));

  loadJSON('ts_references').forEach(ref => items.push({
    type: 'Reference', id: `ref_${ref.id}`, label: ref.caption || ref.creator || 'Reference',
    sublabel: 'Reference', icon: 'images', navId: 'references', navData: undefined,
  }));

  const charNames = new Map(loadJSON('ts_characters').map(c => [String(c.id), c.name]));
  const memories = loadJSON('ts_creator_memory_v1');
  Object.entries(memories && !Array.isArray(memories) ? memories : {}).forEach(([creatorId, memory]) => {
    const creator = charNames.get(String(creatorId)) || 'Creator';
    items.push({
      type: 'Memory',
      id: `memory_${creatorId}`,
      label: `${creator} Brand DNA`,
      sublabel: `Creator Memory · version ${memory.version || 1}`,
      icon: 'brain',
      navId: 'memory',
      navData: undefined,
      haystack: [
        ...Object.values(memory.preferences || {}),
        ...(memory.learned?.favoriteScenes || []).map(item => item.value),
        ...(memory.learned?.favoriteMoods || []).map(item => item.value),
        ...(memory.learned?.avoidScenes || []).map(item => item.value),
      ].filter(Boolean).join(' '),
    });
  });
  loadJSON('ts_library').forEach(entry => {
    const creator = charNames.get(String(entry.character));
    const settings = entry.settings || {};
    items.push({
      type: 'Library', id: `lib_${entry.id}`,
      label: entry.prompt ? entry.prompt.slice(0, 60) : `${entry.source || 'Shot'} · ${entry.scene || 'shot'}`,
      sublabel: creator ? `Library shot · ${creator}` : 'Library shot',
      icon: 'folder-open', navId: 'library', navData: undefined,
      haystack: [
        entry.prompt,
        entry.scene,
        entry.source,
        entry.engine,
        entry.mood,
        creator,
        settings.rawInput,
        settings.notes,
        settings.lighting,
        settings.outfit,
        settings.outputType,
        settings.scene?.setting,
        settings.scene?.location,
        settings.scene?.wardrobe,
        settings.scene?.vibe,
      ].filter(Boolean).join(' '),
    });
  });

  return items;
}

export function searchIndex(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return buildSearchIndex()
    .filter(item =>
      item.label.toLowerCase().includes(q) ||
      item.sublabel.toLowerCase().includes(q) ||
      (item.haystack && item.haystack.toLowerCase().includes(q))
    )
    .slice(0, 20);
}
