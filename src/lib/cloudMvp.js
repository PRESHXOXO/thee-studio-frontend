export const CLOUD_MVP_NAV_IDS = new Set([
  'home',
  'images',
  'campaigns',
  'library',
  'history',
]);

export function isCloudMvpEnabled(env = {}) {
  return env.PROD === true && env.VITE_ALLOW_LOCAL_MODE !== 'true';
}

export function cloudMvpNavItems(items, enabled) {
  if (!enabled) return items;
  const filtered = items.filter(item => !item.id || CLOUD_MVP_NAV_IDS.has(item.id));
  return filtered.filter((item, index) => {
    if (!item.section) return true;
    return filtered.slice(index + 1).some(next => next.id) && (index === 0 || filtered[index - 1]?.id);
  });
}
