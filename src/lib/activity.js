// Local activity feed for the notifications bell. No backend event stream
// exists — this is computed from the same ts_library/ts_campaigns data the
// Library and Campaigns screens already read, not a fake/static list.
function loadJSON(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}

// Same source vocabulary History/Library display. Unknown values fall back
// to underscore→title-case so a raw internal value like "quick_shoot" can
// never leak into the activity panel.
const SOURCE_LABELS = {
  generator:   'New Creator',
  quick_shoot: 'Quick Shoot',
  scene_flow:  'Scene Flow',
  prompt_lab:  'Describe It',
  director:    'Thee Director',
};
function humanizeSource(source) {
  if (!source) return 'Generated';
  return SOURCE_LABELS[source]
    || source.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function buildActivityFeed(limit = 8) {
  const items = [];

  loadJSON('ts_library').forEach(entry => items.push({
    id: `lib_${entry.id}`,
    icon: 'image-plus',
    title: entry.campaign ? 'New campaign shot' : 'New shot generated',
    subtitle: entry.scene ? `Scene: ${entry.scene}` : humanizeSource(entry.source),
    at: entry.savedAt,
    navId: 'library',
  }));

  loadJSON('ts_campaigns').forEach(camp => items.push({
    id: `camp_${camp.id}`,
    icon: 'megaphone',
    title: 'Campaign created',
    subtitle: camp.name || 'Untitled campaign',
    at: camp.createdAt,
    navId: 'campaigns',
  }));

  return items
    .filter(i => i.at)
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, limit);
}

export function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}
