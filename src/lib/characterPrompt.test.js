import { describe, expect, it } from 'vitest';
import { buildCharacterPrompt } from './characterPrompt.js';
import { referencePromptBlock } from './directorReferences.js';

const creator = {
  name: 'CHERRY.',
  faceAnchor: 'Recognizable face anchor.',
  fields: {
    gender: 'Woman',
    face: 'Recognizable face.',
    tone: 'warm golden brown',
    hair: 'long braids',
    personality: 'confident creator presence',
    niche: 'fashion and lifestyle',
    wardrobe: 'saved creator wardrobe default that must not leak into an outfit-board shot',
  },
};

describe('lifestyle prompt styling ownership', () => {
  it('does not inject saved creator wardrobe when an Outfit image is authoritative', () => {
    const prompt = buildCharacterPrompt(
      creator,
      'luxury store',
      'Clean',
      true,
      null,
      'lifestyle',
    );

    expect(prompt).toContain('OUTFIT SOURCE:');
    expect(prompt).toContain('role-labeled OUTFIT reference');
    expect(prompt).not.toContain('saved creator wardrobe default that must not leak');
  });

  it('still uses saved wardrobe when no explicit outfit direction exists', () => {
    const prompt = buildCharacterPrompt(
      creator,
      'luxury store',
      'Clean',
      true,
      undefined,
      'lifestyle',
    );

    expect(prompt).toContain('OUTFIT:');
    expect(prompt).toContain('saved creator wardrobe default that must not leak');
  });

  it('uses a selected text outfit instead of the saved wardrobe fallback', () => {
    const prompt = buildCharacterPrompt(
      creator,
      'luxury store',
      'Clean',
      true,
      'a tailored navy suit',
      'lifestyle',
    );

    expect(prompt).toContain('a tailored navy suit');
    expect(prompt).not.toContain('saved creator wardrobe default that must not leak');
  });

  it('keeps portrait generation face-focused', () => {
    const prompt = buildCharacterPrompt(
      creator,
      '',
      'Clean',
      true,
      'front-facing',
      'portrait',
    );

    expect(prompt).toContain('PORTRAIT: Realistic photographic portrait.');
    expect(prompt).toContain('Plain opaque crew-neck top');
    expect(prompt).not.toContain('saved creator wardrobe default that must not leak');
  });
});

describe('role-labeled shot references', () => {
  it('makes an Outfit image authoritative over identity clothing and creator memory', () => {
    const block = referencePromptBlock([
      { role: 'outfit', name: 'Look board', dataUrl: 'data:image/jpeg;base64,outfit' },
    ], { startsAfterIdentity: true });

    expect(block).toContain('Image 2 — OUTFIT:');
    expect(block).toContain('OUTFIT AUTHORITY:');
    expect(block).toContain('creator-memory wardrobe defaults');
    expect(block).toContain('Identity images establish the person only.');
  });

  it('keeps makeup, hair, background, and pose references scoped to their own jobs', () => {
    const block = referencePromptBlock([
      { role: 'makeup', dataUrl: 'makeup' },
      { role: 'hair', dataUrl: 'hair' },
      { role: 'background', dataUrl: 'background' },
      { role: 'pose', dataUrl: 'pose' },
    ]);

    expect(block).toContain('MAKEUP AUTHORITY:');
    expect(block).toContain('HAIR AUTHORITY:');
    expect(block).toContain('BACKGROUND AUTHORITY:');
    expect(block).toContain('POSE AUTHORITY:');
  });
});
