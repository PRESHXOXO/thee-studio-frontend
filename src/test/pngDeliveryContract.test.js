import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const assets = fs.readFileSync(path.resolve(process.cwd(), 'src/lib/libraryAssets.js'), 'utf8');
const library = fs.readFileSync(path.resolve(process.cwd(), 'src/lib/library.js'), 'utf8');

describe('Director PNG delivery contract', () => {
  it('converts image provider artifacts to a real PNG Blob when PNG delivery is requested', () => {
    expect(assets).toContain("canvas.toBlob(result => {");
    expect(assets).toContain("}, 'image/png');");
    expect(assets).toContain("preferredMimeType === 'image/png'");
    expect(assets).toContain('return imageBlobToPng(blob);');
    expect(assets).toContain('export async function downloadImageAsPng');
    expect(assets).toContain('triggerBlobDownload(png');
  });

  it('normalizes uploaded originals and delivers generated Library downloads as real PNG without recopying provider assets', () => {
    expect(library).toContain("new Set(['quick_shoot', 'director', 'prompt_lab', 'scene_flow'])");
    expect(library).toContain("preferredMimeType = PNG_ORIGINAL_SOURCES.has(metadata.source) ? 'image/png' : null");
    expect(library).toContain('saveLibraryOriginal(id, src, { preferredMimeType })');
    expect(library).toContain('saveGeneratedLibraryItem');
    expect(assets).toContain("['quick_shoot', 'director', 'prompt_lab', 'scene_flow'].includes(entry.source)");
    expect(assets).toContain('blob = await imageBlobToPng(blob)');
  });
});
