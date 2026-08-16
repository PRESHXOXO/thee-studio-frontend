import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const source = fs.readFileSync(path.resolve(process.cwd(), 'src/components/shoot/ShootBuilder.jsx'), 'utf8');
const directorSource = fs.readFileSync(path.resolve(process.cwd(), 'src/screens/TheeDirector.jsx'), 'utf8');
const batchResultsSource = fs.readFileSync(path.resolve(process.cwd(), 'src/components/director/GenerationBatchResults.jsx'), 'utf8');

describe('Guided Director contract', () => {
  it('treats selected Cast identity as a real render precondition', () => {
    expect(source).toContain('creatorIdentityBound');
    expect(source).toContain('canonicalCreatorId(creator)');
    expect(source).toContain('if (!creatorIdentityBound) throw new Error(identityWarning)');
    expect(source).toContain('identityLocked={Boolean(creator)}');
    expect(source).not.toContain('identityLocked={!!creator?.locked}');
  });

  it('uses the backend parent-batch model and preserves partial results', () => {
    expect(source).toContain("import { generateDirectorPhoto } from '../../api/directorGeneration.js';");
    expect(source).toContain('result = await generateDirectorPhoto({');
    expect(source).toContain('batchSize,');
    expect(source).toContain('pendingScope,');
    expect(source).toContain('GenerationBatchResults');
    expect(source).toContain('acceptGeneratedBatch');
    expect(source).not.toContain('images.length !== batchSize');
  });

  it('exposes all five styling roles for saved Cast and Identity plus five for open subjects', () => {
    expect(source).toContain('MAX_SAVED_CAST_STYLING_REFERENCES');
    expect(source).toContain('MAX_DIRECTOR_REFERENCES');
    expect(source).not.toContain('maxReferences={creator ? 3 : 4}');
    expect(source).toContain('Add up to five Outfit, Background, Hair, Makeup, or Pose references.');
  });

  it('advertises and downloads actual PNG bytes instead of renaming a provider artifact', () => {
    expect(source).toContain('format="PNG"');
    expect(source).toContain("import { downloadImageAsPng } from '../../lib/libraryAssets.js';");
    expect(source).toContain('downloadImageAsPng(url, `thee-studio-${Date.now()}-${slotIndex + 1}.png`)');
    expect(batchResultsSource).toContain('Download PNG');
    expect(source).not.toContain('<a href={url} download=');
  });

  it('does not persist generated anchor base64 into canonical cloud Cast roster storage', () => {
    expect(directorSource).toContain('selectedChar && !canonicalCreatorId(selectedChar) ? handleSaveAsAnchorForActive : undefined');
    expect(directorSource).toContain('directorIdentityState(selectedChar, []).locked');
  });

  it('allows only the visible Director mode to recover or poll generation', () => {
    expect(directorSource).toContain("recoveryEnabled={mode === 'guided'}");
    expect(directorSource).toContain("recoveryEnabled={mode === 'describe'}");
    expect(directorSource).toContain("recoveryEnabled={mode === 'talk'}");
  });
});
