import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'src/lib/cloudStore.js'), 'utf8');

describe('cloud Cast reference display contract', () => {
  it('hydrates canonical cloud references from fresh signed URLs', () => {
    expect(source).toContain('hydrateCloudRosterReferenceUrls');
    expect(source).toContain('reference?.signed_url');
    expect(source).toContain('refImages: urls');
    expect(source).toContain('image: urls[0]');
  });

  it('does not downscale cloud creator references for Cast display', () => {
    expect(source).not.toContain("import { compressImage } from './imageUtils.js'");
    expect(source).not.toContain('compressImage(reference.signed_url');
  });

  it('hydrates cloud display URLs before bootstrap resolves', () => {
    expect(source).toContain('await hydrateCloudRosterReferenceUrls(db, userId, epoch);');
  });

  it('never persists cloud display images or expiring signed URLs in ts_characters', () => {
    expect(source).toContain("return { ...character, refImages: [], image: null }");
    expect(source).toContain("const persistedValue = key === 'ts_characters'");
    expect(source).toContain('? compactCloudCharacterDocument(value)');
  });

  it('keeps cloud creators out of the legacy inline-image migration', () => {
    expect(source).toContain('creator.cloudProfile !== true');
  });
});
