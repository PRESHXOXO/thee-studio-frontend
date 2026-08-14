import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const source = fs.readFileSync(path.resolve(process.cwd(), 'src/components/shoot/ShootBuilder.jsx'), 'utf8');

describe('Guided Director contract', () => {
  it('treats selected Cast identity as a real render precondition', () => {
    expect(source).toContain('creatorIdentityBound');
    expect(source).toContain('canonicalCreatorId(creator)');
    expect(source).toContain('if (!creatorIdentityBound) throw new Error(identityWarning)');
    expect(source).toContain('identityLocked={Boolean(creator)}');
    expect(source).not.toContain('identityLocked={!!creator?.locked}');
  });

  it('does not silently accept incomplete cloud batches', () => {
    expect(source).toContain('images.length !== batchSize');
    expect(source).toContain('The incomplete batch was not silently accepted.');
    expect(source).toContain('castQuickShootPlain({');
  });

  it('advertises and downloads cloud image results as PNG', () => {
    expect(source).toContain('format="PNG"');
    expect(source).toContain('.png`}');
    expect(source).toContain('Download PNG');
    expect(source).not.toContain('.jpg`}');
  });
});
