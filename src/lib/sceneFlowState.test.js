import { describe, expect, it } from 'vitest';
import {
  addSceneShot, associateBatchSlotsWithShots, buildSceneFlowPrompts,
  deleteSceneShot, moveSceneShot, resolvedSceneShot, updateSceneShot, validateSceneFlowScene,
} from './sceneFlowState.js';

const authority = {
  creatorId: 'creator-sienna', creatorName: 'Sienna', identityLocked: true,
  referenceRoles: ['outfit', 'background', 'makeup', 'hair', 'pose'],
};

function shot(index) {
  return { id: `shot_${index}`, index, purpose: `moment ${index}`, action: `action ${index}`, pose: '', expression: '', framing: index === 1 ? 'establishing' : 'candid', angle: '', crop: '', environment: '', props: '', interaction: '', movement: '', composition: '', note: '', overrides: {} };
}

function scene(count = 5) {
  return {
    schemaVersion: 'scene_flow_v3', sceneId: 'scene_sienna_miami', title: 'Miami dinner', sequenceConcept: 'Sienna gets ready for dinner',
    creator: { id: 'creator-sienna', name: 'Sienna', identityLocked: true },
    referenceRoles: authority.referenceRoles,
    globals: { location: 'Miami', outfit: '', hair: '', makeup: '', background: '', mood: 'lived-in', visualStyle: 'iPhone camera roll', cameraLanguage: 'varied candid frames', lighting: 'evening', timeOfDay: 'evening', contentFormat: 'photo sequence', aspectRatio: '9:16', continuity: 'same night and styling', supporting: '' },
    shots: Array.from({ length: count }, (_, index) => shot(index + 1)),
  };
}

describe('Scene Flow structured state', () => {
  it('validates five stable shots and all styling authorities', () => {
    const result = validateSceneFlowScene(scene(), authority);
    expect(result.shots).toHaveLength(5);
    expect(result.referenceRoles).toEqual(['outfit', 'background', 'makeup', 'hair', 'pose']);
    expect(result.creator).toEqual({ id: 'creator-sienna', name: 'Sienna', identityLocked: true });
  });

  it('edits only shot two', () => {
    const before = scene();
    const after = updateSceneShot(before, 'shot_2', { action: 'mirror selfie', framing: 'mirror phone view' });
    expect(after.shots[1].action).toBe('mirror selfie');
    expect(after.shots[0]).toEqual(before.shots[0]);
    expect(after.shots.slice(2)).toEqual(before.shots.slice(2));
    expect(after.globals).toEqual(before.globals);
  });

  it('adds deletes and reorders without replacing stable IDs', () => {
    const before = scene(3);
    const added = addSceneShot(before, 'shot_2', { ...shot(1), id: 'shot_inserted', action: 'car arrival' });
    expect(added.shots.map(item => item.id)).toEqual(['shot_1', 'shot_2', 'shot_inserted', 'shot_3']);
    const moved = moveSceneShot(added, 'shot_1', 'down');
    expect(moved.shots.map(item => item.id)).toEqual(['shot_2', 'shot_1', 'shot_inserted', 'shot_3']);
    const removed = deleteSceneShot(moved, 'shot_inserted');
    expect(removed.shots.map(item => item.id)).toEqual(['shot_2', 'shot_1', 'shot_3']);
    expect(removed.shots.map(item => item.index)).toEqual([1, 2, 3]);
  });

  it('separates global continuity from shot direction and never invents assigned roles', () => {
    const state = scene(2);
    state.globals.outfit = 'invented silk dress';
    state.shots[0].overrides = { outfit: 'invented leather jacket', hair: 'invented bob' };
    const prompts = buildSceneFlowPrompts(state, authority);
    expect(prompts.globalPrompt).toContain('GLOBAL CONTINUITY');
    expect(prompts.globalPrompt).toContain('Sienna is the mandatory canonical subject');
    expect(prompts.globalPrompt).toContain('Preserve the assigned Outfit reference exactly');
    expect(prompts.globalPrompt).toContain('Preserve the assigned Background reference');
    expect(prompts.globalPrompt).toContain('Preserve the assigned Makeup reference');
    expect(prompts.globalPrompt).toContain('Preserve the assigned Hair reference');
    expect(prompts.shotPrompts.map(item => item.shotId)).toEqual(['shot_1', 'shot_2']);
    expect(prompts.shotPrompts[0].prompt).toContain('SHOT 1 — shot_1');
    expect(prompts.shotPrompts[0].prompt).not.toContain('invented silk dress');
    expect(prompts.shotPrompts[0].prompt).not.toContain('invented leather jacket');
    expect(prompts.shotPrompts[0].prompt).not.toContain('invented bob');
  });

  it('maps partial-success slots back to stable shot IDs in order', () => {
    const batch = associateBatchSlotsWithShots({ status: 'partial_success', slots: [
      { slotIndex: 0, status: 'succeeded' }, { slotIndex: 1, status: 'provider_blocked' }, { slotIndex: 2, status: 'succeeded' },
    ] }, scene(3));
    expect(batch.slots.map(item => [item.sceneShotId, item.status])).toEqual([
      ['shot_1', 'succeeded'], ['shot_2', 'provider_blocked'], ['shot_3', 'succeeded'],
    ]);
  });

  it('applies a per-shot Pose override after the base shot direction', () => {
    const state = scene(2);
    state.shots[0].pose = 'standing toward camera';
    state.shots[0].overrides = { pose: 'seated side profile' };
    expect(resolvedSceneShot(state, state.shots[0]).pose).toBe('seated side profile');
    const prompt = buildSceneFlowPrompts(state, authority).shotPrompts[0].prompt;
    expect(prompt).toContain('POSE: seated side profile');
    expect(prompt).not.toContain('POSE: standing toward camera');
    expect(prompt).not.toContain('POSE OVERRIDE:');
  });

  it('fails closed when server slot identity conflicts with stable scene order', () => {
    expect(() => associateBatchSlotsWithShots({ slots: [
      { slotIndex: 0, status: 'succeeded', sceneShotId: 'shot_2' },
    ] }, scene(2))).toThrow(/conflicting Scene Flow shot ID/);
    expect(() => associateBatchSlotsWithShots({ slots: [
      { slotIndex: 3, status: 'failed' },
    ] }, scene(2))).toThrow(/cannot be matched/);
  });

  it('recovers slot associations without a local draft only from complete durable IDs', () => {
    const batch = associateBatchSlotsWithShots({ slots: [
      { slotIndex: 0, status: 'succeeded', sceneShotId: 'shot_1' },
      { slotIndex: 1, status: 'provider_blocked', sceneShotId: 'shot_2' },
    ] }, null);
    expect(batch.slots.map(slot => slot.sceneShotId)).toEqual(['shot_1', 'shot_2']);
    expect(() => associateBatchSlotsWithShots({ slots: [
      { slotIndex: 0, status: 'succeeded' },
    ] }, null)).toThrow(/missing their durable Scene Flow shot IDs/);
  });

  it('fails closed for duplicate IDs, bad count, invalid role, and Cast displacement', () => {
    const duplicate = scene(2); duplicate.shots[1].id = 'shot_1';
    const badRole = scene(); badRole.referenceRoles = ['outfit', 'identity'];
    const badCast = scene(); badCast.creator.name = 'generic model';
    for (const value of [{ ...scene(), shots: [] }, duplicate, badRole, badCast]) {
      expect(() => validateSceneFlowScene(value, authority)).toThrow();
    }
  });
});
