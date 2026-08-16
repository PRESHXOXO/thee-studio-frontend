import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  sceneFlowChat: vi.fn(),
  generateDirectorPhoto: vi.fn(),
  generateSceneFlowVideo: vi.fn(),
  saveSceneFlowDraft: vi.fn(),
  loadSceneFlowDraft: vi.fn(),
  clearSceneFlowDraft: vi.fn(),
  handleStatus: vi.fn(),
  setBatch: vi.fn(),
  setRenderStatus: vi.fn(),
}));

vi.mock('../api/studio.js', () => ({ sceneFlowChat: mocks.sceneFlowChat }));
vi.mock('../api/directorGeneration.js', async importOriginal => {
  const actual = await importOriginal();
  return { ...actual, generateDirectorPhoto: mocks.generateDirectorPhoto };
});
vi.mock('../api/sceneFlowVideo.js', () => ({ generateSceneFlowVideo: mocks.generateSceneFlowVideo }));
vi.mock('../hooks/useDirectorPendingGeneration.js', () => ({
  useDirectorPendingGeneration: () => ({
    batch: null, renderStatus: 'idle', statusMessage: '', retryingSlots: new Set(),
    retrySlot: vi.fn(), handleStatus: mocks.handleStatus, setBatch: mocks.setBatch,
    setRenderStatus: mocks.setRenderStatus,
  }),
}));
vi.mock('../lib/sceneFlowPersistence.js', () => ({
  loadSceneFlowDraft: mocks.loadSceneFlowDraft,
  saveSceneFlowDraft: mocks.saveSceneFlowDraft,
  clearSceneFlowDraft: mocks.clearSceneFlowDraft,
}));
vi.mock('../lib/library.js', () => ({ saveToLibrary: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../lib/creatorMemory.js', () => ({ getCreatorMemory: vi.fn(() => null), creatorMemoryPrompt: vi.fn(() => '') }));

import { SceneFlowV2 } from './SceneFlowV2.jsx';

const CREATOR = { id: '11111111-1111-4111-8111-111111111111', name: 'Sienna', cloudProfile: true };

function shot(index) {
  return { id: `shot_${index}`, index, purpose: `moment ${index}`, action: `action ${index}`, pose: '', expression: '', framing: index === 2 ? 'mirror selfie' : 'candid', angle: '', crop: '', environment: '', props: '', interaction: '', movement: '', composition: '', note: '', overrides: {} };
}

function scene() {
  return {
    schemaVersion: 'scene_flow_v3', sceneId: 'scene_sienna_dinner', title: 'Dinner sequence', sequenceConcept: 'Sienna gets ready for dinner',
    creator: { id: CREATOR.id, name: 'Sienna', identityLocked: true }, referenceRoles: [],
    globals: { location: 'Miami', outfit: '', hair: '', makeup: '', background: '', mood: 'lived-in', visualStyle: 'iPhone camera roll', cameraLanguage: 'varied candid', lighting: 'evening', timeOfDay: 'evening', contentFormat: 'photo sequence', aspectRatio: '9:16', continuity: 'same identity and styling', supporting: '' },
    shots: Array.from({ length: 5 }, (_, index) => shot(index + 1)),
  };
}

describe('Scene Flow planning versus rendering', () => {
  beforeEach(() => {
    Object.values(mocks).forEach(mock => mock?.mockReset?.());
    mocks.loadSceneFlowDraft.mockResolvedValue(null);
    mocks.saveSceneFlowDraft.mockResolvedValue(undefined);
    mocks.sceneFlowChat.mockResolvedValue({
      reply: 'Five-shot board ready. Review it below.', scene: scene(),
      history: [{ role: 'user', content: 'Give me five photos' }, { role: 'assistant', content: 'Board ready' }],
      generate: true,
      automaticGenerationAllowed: false,
    });
    mocks.generateDirectorPhoto.mockResolvedValue({
      status: 'succeeded', parentBatchId: 'parent-one', requestedCount: 5, succeededCount: 5,
      slots: Array.from({ length: 5 }, (_, slotIndex) => ({ slotIndex, status: 'succeeded', imageUrl: `https://example.test/${slotIndex}.png` })),
    });
  });

  it('mount, chat, and shot edits never generate; only Generate submits one five-shot parent request', async () => {
    render(<SceneFlowV2 creator={CREATOR} recoveryEnabled={false} />);
    const input = await screen.findByPlaceholderText(/Describe the sequence/i);
    fireEvent.change(input, { target: { value: 'Give me five photos of Sienna getting ready for dinner.' } });
    fireEvent.click(screen.getByTitle('Send'));
    await screen.findByLabelText('Scene Flow shot board');
    expect(mocks.sceneFlowChat).toHaveBeenCalledTimes(1);
    expect(mocks.generateDirectorPhoto).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Shot 2 action'), { target: { value: 'mirror selfie at home' } });
    fireEvent.click(screen.getByLabelText('Move shot 2 down'));
    fireEvent.click(screen.getAllByText('+ Add after')[0]);
    expect(mocks.generateDirectorPhoto).not.toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText('Delete shot 1'));
    expect(screen.getAllByText('+ Add after')).toHaveLength(5);
    fireEvent.click(screen.getByRole('button', { name: 'Generate 5 shots' }));

    await waitFor(() => expect(mocks.generateDirectorPhoto).toHaveBeenCalledTimes(1));
    expect(mocks.generateDirectorPhoto).toHaveBeenCalledWith(expect.objectContaining({
      creator: CREATOR,
      batchSize: 5,
      shotPrompts: expect.arrayContaining([expect.objectContaining({ shotId: expect.any(String), prompt: expect.stringContaining('GLOBAL CONTINUITY') })]),
    }));
  }, 15_000);

  it('restores an editing draft without submitting generation', async () => {
    mocks.loadSceneFlowDraft.mockResolvedValue({ scene: scene(), references: [], messages: [], history: [], outputType: 'photo' });
    render(<SceneFlowV2 creator={CREATOR} recoveryEnabled={false} />);
    await screen.findByLabelText('Scene Flow shot board');
    expect(mocks.generateDirectorPhoto).not.toHaveBeenCalled();
    expect(mocks.sceneFlowChat).not.toHaveBeenCalled();
  });
});
