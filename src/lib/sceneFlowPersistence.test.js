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
});
