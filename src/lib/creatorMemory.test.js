import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./cloudStore.js', () => ({ persistCloudDocument: vi.fn(() => Promise.resolve()) }));

import { creatorMemoryPrompt, learnCreatorMemory, saveCreatorMemory } from './creatorMemory.js';

const memory = {
  preferences: {
    visualSignature: 'Quiet editorial texture',
    wardrobeRules: 'Tailored neutrals',
    locationRules: 'Warm boutique interiors',
    hairRules: 'Long center-part waves',
    makeupRules: 'Soft bronze beauty',
  },
  learned: {
    favoriteScenes: [{ value: 'None', count: 5 }, { value: 'Rooftop dinner', count: 2 }, { value: 'rooftop dinner', count: 1 }],
    favoriteLocations: [{ value: 'Unspecified', count: 3 }, { value: 'Paris terrace', count: 2 }],
    favoriteMoods: [{ value: 'Surprise Me', count: 4 }, { value: 'Candid', count: 2 }],
    favoriteWardrobes: [{ value: 'Default', count: 3 }, { value: 'Cream tailoring', count: 2 }],
    avoidScenes: [{ value: 'N/A', count: 2 }, { value: 'Generic white studio', count: 1 }],
  },
};

describe('creatorMemoryPrompt authority and sanitation', () => {
  beforeEach(() => localStorage.clear());

  it('never learns sentinel scenes and deduplicates learned values case-insensitively', () => {
    const learned = learnCreatorMemory('cast-1', [
      { character: 'cast-1', status: 'approved', scene: 'None', mood: 'Unspecified' },
      { character: 'cast-1', status: 'approved', scene: 'Rooftop dinner', mood: 'Candid' },
      { character: 'cast-1', status: 'approved', scene: 'rooftop dinner', mood: 'candid' },
    ]);
    expect(learned.learned.favoriteScenes).toEqual([{ value: 'Rooftop dinner', count: 2 }]);
    expect(learned.learned.favoriteMoods).toEqual([{ value: 'Candid', count: 2 }]);
  });

  it('does not save default placeholders as Brand DNA', () => {
    const saved = saveCreatorMemory('cast-1', { wardrobeRules: 'Default', locationRules: ' N/A ' });
    expect(saved.preferences.wardrobeRules).toBe('');
    expect(saved.preferences.locationRules).toBe('');
  });

  it('never emits sentinel values and removes case-insensitive duplicates', () => {
    const prompt = creatorMemoryPrompt(memory);
    expect(prompt).not.toMatch(/None|Unspecified|Surprise Me|Default|N\/A/i);
    expect(prompt.match(/Rooftop dinner/gi)).toHaveLength(1);
    expect(prompt).toContain('Learned approved moods: Candid');
  });

  it('suppresses learned scene and location memory when scene is explicit', () => {
    const prompt = creatorMemoryPrompt(memory, { explicitScene: 'Brooklyn brownstone kitchen' });
    expect(prompt).not.toContain('Rooftop dinner');
    expect(prompt).not.toContain('Paris terrace');
    expect(prompt).not.toContain('Warm boutique interiors');
  });

  it('suppresses learned mood when current mood is explicit', () => {
    expect(creatorMemoryPrompt(memory, { explicitMood: 'Melancholy' })).not.toContain('Candid');
  });

  it('gives Outfit role authority over wardrobe memory', () => {
    const prompt = creatorMemoryPrompt(memory, { referenceRoles: ['outfit'] });
    expect(prompt).not.toContain('Tailored neutrals');
    expect(prompt).not.toContain('Cream tailoring');
  });

  it('gives Background role authority over scene and location memory', () => {
    const prompt = creatorMemoryPrompt(memory, { referenceRoles: [{ role: 'background' }] });
    expect(prompt).not.toContain('Warm boutique interiors');
    expect(prompt).not.toContain('Rooftop dinner');
    expect(prompt).not.toContain('Paris terrace');
  });

  it('gives Hair and Makeup roles authority over matching saved defaults', () => {
    const prompt = creatorMemoryPrompt(memory, { referenceRoles: ['hair', 'makeup'] });
    expect(prompt).not.toContain('Long center-part waves');
    expect(prompt).not.toContain('Soft bronze beauty');
  });

  it('does not backfill wardrobe, hair, or makeup when a caller supplies authoritative empty styling state', () => {
    const prompt = creatorMemoryPrompt(memory, {
      wardrobeIntent: '',
      hairIntent: '',
      makeupIntent: '',
      explicitScene: 'Miami condo',
    });
    expect(prompt).toContain('Visual signature: Quiet editorial texture');
    expect(prompt).not.toContain('Tailored neutrals');
    expect(prompt).not.toContain('Cream tailoring');
    expect(prompt).not.toContain('Long center-part waves');
    expect(prompt).not.toContain('Soft bronze beauty');
  });
});
