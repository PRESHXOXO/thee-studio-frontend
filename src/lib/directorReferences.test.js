import { describe, expect, it } from 'vitest';
import {
  DIRECTOR_REFERENCE_ROLES,
  MAX_DIRECTOR_REFERENCES,
  MAX_SAVED_CAST_STYLING_REFERENCES,
  referencePromptBlock,
  serializeDirectorReferences,
} from './directorReferences.js';

const PIXEL = 'data:image/png;base64,abc';

function ref(role, index) {
  return { id: `${role}-${index}`, dataUrl: `${PIXEL}${index}`, role, name: `${role}.png` };
}

describe('Director visual authority contract', () => {
  it('supports Identity plus all five styling/scene authority roles', () => {
    expect(MAX_DIRECTOR_REFERENCES).toBe(6);
    expect(MAX_SAVED_CAST_STYLING_REFERENCES).toBe(5);
    expect(DIRECTOR_REFERENCE_ROLES.map(role => role.id)).toEqual([
      'identity', 'outfit', 'background', 'makeup', 'hair', 'pose', 'supporting',
    ]);
  });

  it('keeps Supporting subordinate to every specific authority', () => {
    const block = referencePromptBlock([ref('supporting', 0), ref('outfit', 1)], { startsAfterIdentity: true });
    expect(block).toContain('SUPPORTING CUES ONLY');
    expect(block).toContain('Supporting must never recast Identity');
    expect(block).toContain('MANDATORY OUTFIT AUTHORITY');
  });

  it('serializes the complete six-role board without truncating Makeup Hair or Pose', () => {
    const refs = ['identity', 'outfit', 'background', 'makeup', 'hair', 'pose'].map(ref);
    const serialized = JSON.parse(serializeDirectorReferences(refs));
    expect(serialized).toHaveLength(6);
    expect(serialized.map(item => item.role)).toEqual(['identity', 'outfit', 'background', 'makeup', 'hair', 'pose']);
  });

  it('makes beauty and pose references mandatory observable transfer rules', () => {
    const refs = ['outfit', 'background', 'makeup', 'hair', 'pose'].map(ref);
    const block = referencePromptBlock(refs, { startsAfterIdentity: true });
    expect(block).toContain('MANDATORY MAKEUP AUTHORITY');
    expect(block).toMatch(/eyeshadow colors\/placement\/shape\/intensity/i);
    expect(block).toMatch(/blush hue\/placement\/intensity/i);
    expect(block).toMatch(/lip liner\/color\/gloss/i);
    expect(block).toContain('Do not neutralize bold makeup colors');
    expect(block).toContain('MANDATORY HAIR AUTHORITY');
    expect(block).toMatch(/parting, texture\/pattern, color, length/i);
    expect(block).toContain('do not fall back to their default hair');
    expect(block).toContain('MANDATORY POSE AUTHORITY');
    expect(block).toMatch(/hand placement, weight distribution/i);
    expect(block).toMatch(/camera height/i);
    expect(block).toContain('MANDATORY OUTFIT AUTHORITY');
    expect(block).toContain('BACKGROUND AUTHORITY');
  });
});
