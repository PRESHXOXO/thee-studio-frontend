import { describe, expect, it } from 'vitest';
import { serializeSceneFlowDraft } from './sceneFlowPersistence.js';

describe('Scene Flow persistence safety', () => {
  it('persists stable scene/reference metadata without private image payloads or signed URLs', () => {
    const serialized = serializeSceneFlowDraft({
      scene: { schemaVersion: 'scene_flow_v3', sceneId: 'scene_1' },
      references: [{ id: 'ref-1', role: 'outfit', name: 'outfit.png', dataUrl: 'data:image/png;base64,PRIVATE', signedUrl: 'https://signed.example/private?token=secret', storagePath: 'user/assets/outfit.png' }],
      messages: [{ role: 'assistant', text: 'Ready' }],
      history: [{ role: 'user', content: 'Make it candid' }],
    });
    const text = JSON.stringify(serialized);
    expect(text).not.toContain('PRIVATE');
    expect(text).not.toContain('signed.example');
    expect(text).toContain('user/assets/outfit.png');
    expect(serialized.references[0]).toEqual(expect.objectContaining({ id: 'ref-1', role: 'outfit' }));
  });

  it('preserves planning dialogue, shot order, stable IDs, and role metadata', () => {
    const serialized = serializeSceneFlowDraft({
      scene: {
        schemaVersion: 'scene_flow_v3', sceneId: 'scene_1',
        shots: [{ id: 'shot_4', index: 1 }, { id: 'shot_2', index: 2 }],
      },
      messages: [{ role: 'user', text: 'Change shot four only.' }, { role: 'assistant', text: 'Shot four updated.' }],
      history: [{ role: 'user', content: 'Keep everything else.' }],
      references: ['outfit', 'background', 'makeup', 'hair', 'pose'].map((role, index) => ({ id: `ref_${index}`, role, name: `${role}.png`, dataUrl: 'data:image/png;base64,PRIVATE' })),
    });
    expect(serialized.scene.shots.map(shot => shot.id)).toEqual(['shot_4', 'shot_2']);
    expect(serialized.messages).toHaveLength(2);
    expect(serialized.history).toHaveLength(1);
    expect(serialized.references.map(reference => reference.role)).toEqual(['outfit', 'background', 'makeup', 'hair', 'pose']);
  });
});
