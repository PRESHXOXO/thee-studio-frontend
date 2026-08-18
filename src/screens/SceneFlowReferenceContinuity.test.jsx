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
    batch: null,
    renderStatus: 'idle',
    statusMessage: '',
    retryingSlots: new Set(),
    retrySlot: vi.fn(),
    handleStatus: mocks.handleStatus,
    setBatch: mocks.setBatch,
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
const OUTFIT_REFERENCE = {
  id: 'outfit-ref',
  role: 'outfit',
  name: 'outfit.png',
  pending: false,
  dataUrl: 'data:image/png;base64,OUTFIT',
};

function shot(index) {
  return {
    id: `shot_${index}`,
    index,
    purpose: `moment ${index}`,
    action: index === 4 ? 'walking toward the door in the visible skirt' : `action ${index}`,
    pose: index === 4 ? 'posed' : '',
    expression: '',
    framing: 'candid',
    angle: '',
    crop: '',
    environment: '',
    props: '',
    interaction: '',
    movement: '',
    composition: '',
    note: '',
    overrides: {},
  };
}

function scene() {
  return {
    schemaVersion: 'scene_flow_v3',
    sceneId: 'scene_sienna_outfit',
    title: 'Dinner sequence',
    sequenceConcept: 'Sienna gets ready for dinner',
    creator: { id: CREATOR.id, name: CREATOR.name, identityLocked: true },
    referenceRoles: ['outfit'],
    globals: {
      location: 'Miami',
      outfit: 'Preserve the assigned Outfit reference exactly as wardrobe authority. Do not invent or substitute clothing.',
      hair: '',
      makeup: '',
      background: '',
      mood: 'lived-in',
      visualStyle: 'iPhone camera roll',
      cameraLanguage: 'varied candid',
      lighting: 'evening',
      timeOfDay: 'evening',
      contentFormat: 'photo sequence',
      aspectRatio: '9:16',
      continuity: 'same identity and outfit',
      supporting: '',
    },
    shots: Array.from({ length: 5 }, (_, index) => shot(index + 1)),
  };
}

describe('Scene Flow visual reference continuity', () => {
  beforeEach(() => {
    Object.values(mocks).forEach(mock => mock?.mockReset?.());
    mocks.saveSceneFlowDraft.mockResolvedValue(undefined);
    mocks.loadSceneFlowDraft.mockResolvedValue({
      scene: scene(),
      references: [OUTFIT_REFERENCE],
      messages: [],
      history: [],
      outputType: 'photo',
    });
    const revised = scene();
    revised.shots[3] = { ...revised.shots[3], action: 'walking toward the door in the visible skirt', pose: 'unposed movement' };
    mocks.sceneFlowChat.mockResolvedValue({
      reply: 'Shot four is looser; everything else stays put.',
      scene: revised,
      history: [],
      automaticGenerationAllowed: false,
    });
  });

  it('resends settled visual authorities on later chat turns without generating', async () => {
    render(<SceneFlowV2 creator={CREATOR} recoveryEnabled={false} />);
    await screen.findByLabelText('Scene Flow shot board');

    const input = screen.getByPlaceholderText(/Describe the sequence/i);
    fireEvent.change(input, { target: { value: 'Make shot four less posed; keep everything else.' } });
    fireEvent.click(screen.getByTitle('Send'));

    await waitFor(() => expect(mocks.sceneFlowChat).toHaveBeenCalledTimes(1));
    const request = mocks.sceneFlowChat.mock.calls[0][0];
    expect(request.activeReferenceRoles).toEqual(['outfit']);
    expect(request.referenceImages).toEqual([
      expect.objectContaining({ id: 'outfit-ref', role: 'outfit', pending: false, dataUrl: OUTFIT_REFERENCE.dataUrl }),
    ]);
    expect(mocks.generateDirectorPhoto).not.toHaveBeenCalled();
  });
});
