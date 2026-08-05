import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { CLOUD_MVP_NAV_IDS, cloudMvpNavItems, isCloudMvpEnabled } from './cloudMvp.js';

describe('focused cloud MVP', () => {
  it('is production-only unless local mode is explicitly enabled', () => {
    expect(isCloudMvpEnabled({ PROD: true })).toBe(true);
    expect(isCloudMvpEnabled({ PROD: false })).toBe(false);
    expect(isCloudMvpEnabled({ PROD: true, VITE_ALLOW_LOCAL_MODE: 'true' })).toBe(false);
  });

  it('keeps only launch-scope navigation in production cloud mode', () => {
    const items = [
      { section: 'Create' }, { id: 'home' }, { id: 'characters' }, { id: 'images' },
      { id: 'director' }, { id: 'scenes' }, { section: 'Workspace' },
      { id: 'campaigns' }, { id: 'library' }, { id: 'history' }, { id: 'settings' },
    ];
    expect(cloudMvpNavItems(items, true).filter(item => item.id).map(item => item.id))
      .toEqual(['home', 'images', 'campaigns', 'library', 'history']);
    expect([...CLOUD_MVP_NAV_IDS]).not.toEqual(expect.arrayContaining(['characters', 'director', 'scenes', 'settings']));
  });

  it('keeps Prompt Lab and Scene Flow unavailable through the production shell', () => {
    const app = fs.readFileSync(path.resolve('src/App.jsx'), 'utf8');
    expect(app).toContain('!CLOUD_MVP_NAV_IDS.has(id)');
    expect(CLOUD_MVP_NAV_IDS.has('prompt-lab')).toBe(false);
    expect(CLOUD_MVP_NAV_IDS.has('scene-flow')).toBe(false);
  });
});
