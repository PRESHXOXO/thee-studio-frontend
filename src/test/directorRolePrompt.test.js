import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  characterGenerate: vi.fn(),
  castQuickShootPlain: vi.fn(),
  pollCastQuickShootStatus: vi.fn(),
  retryCastQuickShootSlot: vi.fn(),
}));

vi.mock('../api/studio.js', () => mocks);

import { generateDirectorPhoto } from '../api/directorGeneration.js';

const IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB';

function ref(role, index) {
  return { id: `${role}-${index}`, dataUrl: `${IMAGE}${index}`, role, name: `${role}.png` };
}

describe('Director provider prompt carries all visual authorities', () => {
  beforeEach(() => {
    mocks.characterGenerate.mockReset();
    mocks.castQuickShootPlain.mockReset();
    mocks.pollCastQuickShootStatus.mockReset();
    mocks.retryCastQuickShootSlot.mockReset();
    sessionStorage.clear();
    mocks.characterGenerate.mockResolvedValue({
      status: 'succeeded',
      requestedCount: 1,
      succeededCount: 1,
      assets: [{ url: 'https://example.com/result.png', slotIndex: 0 }],
      slots: [{ slotIndex: 0, status: 'succeeded', imageUrl: 'https://example.com/result.png' }],
    });
  });

  it('adds the strict Outfit Background Makeup Hair Pose map to the renderer prompt', async () => {
    const references = [
      ref('identity', 0),
      ref('outfit', 1),
      ref('background', 2),
      ref('makeup', 3),
      ref('hair', 4),
      ref('pose', 5),
    ];
    await generateDirectorPhoto({
      prompt: 'The selected subject at a Paris rooftop dinner.',
      references,
      batchSize: 1,
      pendingScope: 'qa:all-authorities',
      requestKey: 'qa-all-authorities',
    });

    expect(mocks.characterGenerate).toHaveBeenCalledTimes(1);
    const request = mocks.characterGenerate.mock.calls[0][0];
    expect(request.anchorReferences.map(reference => reference.role)).toEqual([
      'outfit', 'background', 'makeup', 'hair', 'pose',
    ]);
    expect(request.positivePrompt).toContain('MANDATORY OUTFIT AUTHORITY');
    expect(request.positivePrompt).toContain('BACKGROUND AUTHORITY');
    expect(request.positivePrompt).toContain('MAKEUP AUTHORITY');
    expect(request.positivePrompt).toContain('eyeshadow');
    expect(request.positivePrompt).toContain('blush');
    expect(request.positivePrompt).toContain('lip liner');
    expect(request.positivePrompt).toContain('HAIR AUTHORITY');
    expect(request.positivePrompt).toContain('do not fall back to their default hair');
    expect(request.positivePrompt).toContain('POSE AUTHORITY');
    expect(request.positivePrompt).toContain('hand placement');
    expect(request.positivePrompt).toContain('weight distribution');
  });
});
