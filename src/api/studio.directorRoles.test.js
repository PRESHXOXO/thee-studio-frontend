import { beforeEach, describe, expect, it, vi } from 'vitest';

const invoke = vi.fn();
const createSignedUrl = vi.fn(async () => ({ data: { signedUrl: 'https://signed.example/image.png' }, error: null }));

vi.mock('../lib/supabase.js', () => ({
  hasSupabaseConfig: () => true,
  getSupabase: () => ({
    functions: { invoke },
    storage: { from: () => ({ createSignedUrl }) },
  }),
}));

import { characterGenerate, sceneFlowChat } from './studio.js';

const BASE = 'data:image/png;base64,iVBORw0KGgo=';
const refs = ['outfit', 'background', 'makeup', 'hair', 'pose'].map((role, index) => ({
  dataUrl: `${BASE}${index}`,
  role,
  name: `${role}.png`,
}));

describe('Director all-role cloud handoff', () => {
  beforeEach(() => invoke.mockReset());

  it('forwards all five saved-Cast styling authorities in one request', async () => {
    invoke.mockResolvedValueOnce({
      data: { status: 'pending', parentBatchId: 'role-parent', requestedCount: 1 },
      error: null,
    });
    await characterGenerate({
      positivePrompt: 'Amara at dinner.',
      creatorId: 'creator-amara',
      anchorReferences: refs,
      returnPending: true,
      requestKey: 'all-role-test',
    });
    expect(invoke).toHaveBeenCalledTimes(1);
    const [name, options] = invoke.mock.calls[0];
    expect(name).toBe('cast-quick-shoot');
    expect(options.body.creatorId).toBe('creator-amara');
    expect(options.body.anchorReferences).toHaveLength(5);
    expect(options.body.anchorReferences.map(reference => reference.role)).toEqual([
      'outfit', 'background', 'makeup', 'hair', 'pose',
    ]);
    expect(options.body.anchorImages).toBeUndefined();
  });

  it('passes the complete active-role state to Talk It Through while only attaching new image bytes', async () => {
    invoke.mockResolvedValueOnce({ data: { reply: 'Got it.', scene: {}, generate: false, history: [] }, error: null });
    await sceneFlowChat({
      messagesJson: '[]',
      userMessage: 'Keep everything, just make it more candid.',
      referenceImages: [refs[2]],
      activeReferenceRoles: refs.map(reference => reference.role),
    });
    expect(invoke).toHaveBeenCalledTimes(1);
    const [name, options] = invoke.mock.calls[0];
    expect(name).toBe('director-scene-flow-chat');
    expect(options.body.activeReferenceRoles).toEqual(['outfit', 'background', 'makeup', 'hair', 'pose']);
    const attached = JSON.parse(options.body.references);
    expect(attached).toHaveLength(1);
    expect(attached[0].role).toBe('makeup');
  });
});
