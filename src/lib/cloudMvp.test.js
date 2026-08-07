import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { CLOUD_MVP_NAV_IDS, cloudMvpNavItems, isCloudMvpEnabled } from './cloudMvp.js';

describe('cloud product shell', () => {
  it('is production-only unless local mode is explicitly enabled', () => {
    expect(isCloudMvpEnabled({ PROD: true })).toBe(true);
    expect(isCloudMvpEnabled({ PROD: false })).toBe(false);
    expect(isCloudMvpEnabled({ PROD: true, VITE_ALLOW_LOCAL_MODE: 'true' })).toBe(false);
  });

  it('keeps approved product navigation visible in production cloud mode', () => {
    const items = [
      { section: 'Create' }, { id: 'home' }, { id: 'characters' }, { id: 'images' },
      { id: 'director' }, { id: 'scenes' }, { section: 'Workspace' },
      { id: 'campaigns' }, { id: 'library' }, { id: 'history' }, { id: 'settings' },
    ];
    expect(cloudMvpNavItems(items, true).filter(item => item.id).map(item => item.id))
      .toEqual(['home', 'characters', 'images', 'director', 'scenes', 'campaigns', 'library', 'history', 'settings']);
    expect([...CLOUD_MVP_NAV_IDS]).toEqual(expect.arrayContaining(['characters', 'director', 'scenes', 'settings']));
  });

  it('keeps Director modes and direct routes available through the production shell', () => {
    const app = fs.readFileSync(path.resolve('src/App.jsx'), 'utf8');
    expect(app).not.toContain('!CLOUD_MVP_NAV_IDS.has(id)');
    expect(app).toContain("'prompt-lab': 'director'");
    expect(app).toContain("'scene-flow': 'director'");
  });
});
