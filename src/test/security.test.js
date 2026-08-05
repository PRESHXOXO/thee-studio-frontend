import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { readSupabaseConfig } from '../lib/supabase.js';

function files(root) {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(root, entry.name);
    return entry.isDirectory() ? files(full) : [full];
  });
}

describe('frontend security contract', () => {
  it('supports publishable key with legacy public-key fallback', () => {
    expect(readSupabaseConfig({ VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'public' })).toMatchObject({ configured: true, publishableKey: 'public' });
    expect(readSupabaseConfig({ VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_ANON_KEY: 'legacy-public' })).toMatchObject({ configured: true, publishableKey: 'legacy-public' });
  });

  it('contains no browser server-key or provider credential references', () => {
    const source = files(path.resolve('src'))
      .filter(file => !file.includes(`${path.sep}test${path.sep}`) && !file.includes('.test.'))
      .map(file => fs.readFileSync(file, 'utf8')).join('\n');
    expect(source).not.toMatch(/SERVICE_ROLE|REPLICATE_API_TOKEN|CRISP_STILL_PROVIDER_API_KEY|VITE_.*REPLICATE/i);
    expect(source).not.toContain('api.replicate.com/v1');
  });

  it('tracks no real environment file', () => {
    const tracked = execFileSync('git', ['ls-files', '.env*'], { encoding: 'utf8' }).trim().split(/\r?\n/).filter(Boolean);
    expect(tracked.filter(file => file !== '.env.example')).toEqual([]);
    const example = fs.readFileSync('.env.example', 'utf8');
    expect(example).toContain('your-project-ref');
    expect(example).not.toContain('qkrmkoixgznvxbcljmsx');
  });

  it('does not use Gradio health as cloud connectivity', () => {
    const app = fs.readFileSync('src/App.jsx', 'utf8');
    expect(app).not.toContain('/gradio_api/config');
    expect(app).toContain('Connected');
  });

  it('does not call Gradio from cloud New Creator', () => {
    const creator = fs.readFileSync('src/screens/ImageGenerator.jsx', 'utf8');
    expect(creator).not.toMatch(/gradio_api|generateCharacterSeed|generateCharacterVariationShot|parseCreatorCorrection/);
    expect(creator).toContain('uploadReferenceAsset');
  });

  it('uses Declarative Mode and rejects unstable React Router RSC code paths', () => {
    const source = files(path.resolve('src'))
      .filter(file => !file.includes(`${path.sep}test${path.sep}`) && !file.includes('.test.'))
      .map(file => fs.readFileSync(file, 'utf8')).join('\n');
    const main = fs.readFileSync('src/main.jsx', 'utf8');
    expect(main).toMatch(/BrowserRouter/);
    expect(source).toMatch(/\bRoutes\b/);
    expect(source).toMatch(/\bRoute\b/);
    expect(source).not.toMatch(/from\s+['"]react-router(?:-dom)?\/(?:rsc|unstable|server)/i);
    expect(source).not.toMatch(/unstable_(?:RSC|createCallServer|routeRSCServerRequest)/);
  });
});
