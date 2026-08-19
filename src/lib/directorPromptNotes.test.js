import { describe, expect, it } from 'vitest';
import { directorNotesForReferences } from './directorPromptNotes.js';

describe('directorNotesForReferences', () => {
  it('removes stale swimsuit wardrobe direction when an Outfit reference is active', () => {
    const notes = 'Luxury poolside Instagram photo. Preserve her exact face and long pastel-pink hair. Use the exact pink swimsuit from the outfit reference and the uploaded pool as the environment. Natural realistic sunlight and a relaxed full-body pose.';

    const result = directorNotesForReferences(notes, ['outfit', 'background']);

    expect(result).toContain('Luxury poolside Instagram photo.');
    expect(result).toContain('Preserve her exact face and long pastel-pink hair.');
    expect(result).toContain('Natural realistic sunlight and a relaxed full-body pose.');
    expect(result.toLowerCase()).not.toContain('swimsuit');
  });

  it('removes stale dress or swimwear sentences while preserving unrelated direction', () => {
    const notes = 'Put her in the red dress from before. Keep the side-part waves. Use resort swimwear styling. Shoot at golden hour.';

    expect(directorNotesForReferences(notes, ['outfit'])).toBe('Keep the side-part waves. Shoot at golden hour.');
  });

  it('keeps wardrobe notes when no Outfit reference is active', () => {
    const notes = 'Use the exact pink swimsuit and keep her hair long.';
    expect(directorNotesForReferences(notes, ['background'])).toBe(notes);
  });
});
