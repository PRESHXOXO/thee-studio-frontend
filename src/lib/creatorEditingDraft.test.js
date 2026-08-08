import { describe, expect, it } from 'vitest';
import { buildEditingDraft, resolveEditingDraft } from './creatorEditingDraft.js';

const SIENNA = {
  id: 1786164668018,
  name: 'SIENNA.',
  cloudCreatorId: '75ec949c-6241-4739-ba81-fa561f3137cb',
  refImages: ['data:image/png;base64,AAA', 'data:image/png;base64,BBB'],
  faceAnchor: 'Oval face, warm brown eyes.',
  fields: { face: 'Oval', hair: 'Black', body: '', wardrobe: '', tone: '', personality: '', niche: '' },
};

describe('resolveEditingDraft — regression for "Cannot read properties of null (reading \'refImages\')"', () => {
  it('does not crash with editingDraft=null and no active creator either (genuinely blank slate)', () => {
    expect(() => resolveEditingDraft(null, null)).not.toThrow();
    const draft = resolveEditingDraft(null, null);
    expect(draft.refImages).toEqual([]);
  });

  it('editingDraft=null but a real active creator is loaded: seeds from and preserves its existing references', () => {
    const draft = resolveEditingDraft(null, SIENNA);
    expect(draft.refImages).toEqual(SIENNA.refImages);
    expect(draft.name).toBe('SIENNA.');
    expect(draft.faceAnchor).toBe(SIENNA.faceAnchor);
  });

  it('an existing editing draft is returned unchanged — never overwritten by the active creator', () => {
    const inProgress = { name: 'Draft in progress', refImages: ['data:image/png;base64,NEW'], fields: {} };
    const draft = resolveEditingDraft(inProgress, SIENNA);
    expect(draft).toBe(inProgress); // same reference — a true no-op
    expect(draft.refImages).toEqual(['data:image/png;base64,NEW']);
  });

  it('simulates the actual crash scenario: an upload resolves while editing is still null and an active creator is loaded', () => {
    // Mirrors handlePrimaryUpload's setEditing updater body.
    const compressed = 'data:image/png;base64,NEWLY_UPLOADED';
    const apply = (ed, activeCreator) => {
      const base = resolveEditingDraft(ed, activeCreator);
      return { ...base, refImages: [compressed, ...(base.refImages || []).slice(1)] };
    };
    expect(() => apply(null, SIENNA)).not.toThrow();
    const result = apply(null, SIENNA);
    expect(result.refImages[0]).toBe(compressed);
    // Sienna's second reference photo is preserved, not dropped.
    expect(result.refImages[1]).toBe(SIENNA.refImages[1]);
  });

  it('adding a reference after cloud-link works the same way (cloudCreatorId is irrelevant to this local draft logic)', () => {
    const withoutCloudLink = { ...SIENNA, cloudCreatorId: undefined };
    const result = resolveEditingDraft(null, withoutCloudLink);
    expect(result.refImages).toEqual(SIENNA.refImages);
  });
});

describe('buildEditingDraft', () => {
  it('migrates a legacy single-image creator into the refImages array shape', () => {
    const legacy = { name: 'Legacy', image: 'data:image/png;base64,ONLY', fields: {} };
    expect(buildEditingDraft(legacy).refImages).toEqual(['data:image/png;base64,ONLY']);
  });

  it('a creator with no images at all yields an empty refImages array, not a crash', () => {
    expect(() => buildEditingDraft({ name: 'Blank', fields: {} })).not.toThrow();
    expect(buildEditingDraft({ name: 'Blank', fields: {} }).refImages).toEqual([]);
  });

  it('preserves an already-populated refImages array as-is', () => {
    expect(buildEditingDraft(SIENNA).refImages).toEqual(SIENNA.refImages);
  });
});
