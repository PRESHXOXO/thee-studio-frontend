import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const source = fs.readFileSync(path.resolve(process.cwd(), 'src/components/shoot/ShootBuilder.jsx'), 'utf8');
const directorSource = fs.readFileSync(path.resolve(process.cwd(), 'src/screens/TheeDirector.jsx'), 'utf8');

describe('Guided Director contract', () => {
  it('treats selected Cast identity as a real render precondition', () => {
    expect(source).toContain('creatorIdentityBound');
    expect(source).toContain('canonicalCreatorId(creator)');
    expect(source).toContain('if (!creatorIdentityBound) throw new Error(identityWarning)');
    expect(source).toContain('identityLocked={Boolean(creator)}');
    expect(source).not.toContain('identityLocked={!!creator?.locked}');
  });

  it('serializes identity-bound cloud batches and does not silently accept incomplete results', () => {
    expect(source).toContain("import { generateDirectorPhoto } from '../../api/directorGeneration.js';");
    expect(source).toContain('result = await generateDirectorPhoto({');
    expect(source).toContain('batchSize,');
    expect(source).toContain('pendingScope,');
    expect(source).toContain('images.length !== batchSize');
    expect(source).toContain('The incomplete batch was not silently accepted.');
  });

  it('advertises and downloads actual PNG bytes instead of renaming a provider artifact', () => {
    expect(source).toContain('format="PNG"');
    expect(source).toContain("import { downloadImageAsPng } from '../../lib/libraryAssets.js';");
    expect(source).toContain('downloadImageAsPng(url, `thee-studio-${Date.now()}-${i + 1}.png`)');
    expect(source).toContain('Download PNG');
    expect(source).not.toContain('<a href={url} download=');
  });

  it('does not persist generated anchor base64 into canonical cloud Cast roster storage', () => {
    expect(directorSource).toContain('selectedChar && !canonicalCreatorId(selectedChar) ? handleSaveAsAnchorForActive : undefined');
    expect(directorSource).toContain('directorIdentityState(selectedChar, []).locked');
  });
});
