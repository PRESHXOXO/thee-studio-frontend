export const CLOUD_MVP_NAV_IDS = new Set([
  'home',
  'characters',
  'memory',
  'images',
  'director',
  'scenes',
  'references',
  'campaigns',
  'library',
  'history',
  'exports',
  'runs',
  'settings',
  'admin-telemetry',
]);

export function isCloudMvpEnabled(env = {}) {
  return env.PROD === true && env.VITE_ALLOW_LOCAL_MODE !== 'true';
}

export function cloudMvpNavItems(items, enabled) {
  void enabled;
  return items;
}
