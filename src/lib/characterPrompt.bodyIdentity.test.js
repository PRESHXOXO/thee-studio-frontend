import { describe, expect, it } from 'vitest';
import { buildCharacterPrompt } from './characterPrompt.js';

const creator = {
  name: 'Test Creator',
  faceAnchor: 'Warm brown skin, almond eyes, full lips.',
  fields: {
    gender: 'Woman',
    body: 'Curvy hourglass build with a defined waist, fuller bust, full hips and thighs, and softly toned arms.',
    hair: 'Long pink waves',
    wardrobe: 'polished eveningwear',
  },
};

describe('buildCharacterPrompt body identity lock', () => {
  it('treats saved body analysis as locked creator identity', () => {
    const prompt = buildCharacterPrompt(creator, 'Rooftop', 'Clean', true, undefined, 'lifestyle', []);

    expect(prompt).toContain('BODY IDENTITY — LOCKED');
    expect(prompt).toContain(creator.fields.body);
    expect(prompt).toContain('Do not slim the creator down');
    expect(prompt).toContain('body build, silhouette, and established proportions');
  });

  it('keeps body identity authoritative when an Outfit reference controls clothing', () => {
    const prompt = buildCharacterPrompt(creator, 'Poolside', 'Editorial', true, null, 'lifestyle', ['outfit']);

    expect(prompt).toContain('OUTFIT SOURCE');
    expect(prompt).toContain('The Outfit reference controls garments only');
    expect(prompt).toContain('BODY IDENTITY — LOCKED');
    expect(prompt).toContain(creator.fields.body);
    expect(prompt).not.toContain('Style Test Creator in polished eveningwear');
  });
});