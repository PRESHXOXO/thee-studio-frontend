export const SCENE_FLOW_CONTRACT_VERSION = 'scene_flow_v3';
export const MIN_SCENE_SHOTS = 1;
export const MAX_SCENE_SHOTS = 12;
export const MAX_RENDERABLE_SCENE_SHOTS = 5;
export const SCENE_FLOW_REFERENCE_ROLES = ['identity', 'outfit', 'background', 'makeup', 'hair', 'pose', 'supporting'];

const GLOBAL_FIELDS = ['location', 'outfit', 'hair', 'makeup', 'background', 'mood', 'visualStyle', 'cameraLanguage', 'lighting', 'timeOfDay', 'contentFormat', 'aspectRatio', 'continuity', 'supporting'];
const SHOT_FIELDS = ['purpose', 'action', 'pose', 'expression', 'framing', 'angle', 'crop', 'environment', 'props', 'interaction', 'movement', 'composition', 'note'];
const OVERRIDE_FIELDS = ['location', 'outfit', 'hair', 'makeup', 'background', 'mood', 'visualStyle', 'cameraLanguage', 'lighting', 'timeOfDay', 'pose'];

export class SceneFlowStateError extends Error {
  constructor(message) { super(message); this.name = 'SceneFlowStateError'; }
}

function record(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new SceneFlowStateError(`${label} must be an object.`);
  return value;
}

function onlyKeys(value, allowed, label) {
  const unknown = Object.keys(value).find(key => !allowed.includes(key));
  if (unknown) throw new SceneFlowStateError(`${label} contains unknown field: ${unknown}.`);
}

function text(value, label, max = 2000) {
  if (typeof value !== 'string') throw new SceneFlowStateError(`${label} must be text.`);
  const normalized = value.trim();
  if (normalized.length > max) throw new SceneFlowStateError(`${label} is too long.`);
  return normalized;
}

function id(value, label) {
  const normalized = text(value, label, 100);
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{2,99}$/.test(normalized)) throw new SceneFlowStateError(`${label} is invalid.`);
  return normalized;
}

function strings(value, fields, label, partial = false) {
  const source = record(value, label);
  onlyKeys(source, fields, label);
  return fields.reduce((result, field) => {
    if (partial && source[field] === undefined) return result;
    result[field] = text(source[field] ?? '', `${label}.${field}`);
    return result;
  }, {});
}

export function normalizeSceneFlowAuthority({ creatorId = null, creatorName = '', identityLocked = false, referenceRoles = [] } = {}) {
  return {
    creatorId: typeof creatorId === 'string' && creatorId.trim() ? creatorId.trim().slice(0, 100) : null,
    creatorName: String(creatorName || '').trim().slice(0, 160),
    identityLocked: Boolean(identityLocked),
    referenceRoles: [...new Set(referenceRoles)].filter(role => SCENE_FLOW_REFERENCE_ROLES.includes(role)),
  };
}

export function validateSceneFlowScene(value, authorityInput) {
  const authority = normalizeSceneFlowAuthority(authorityInput);
  const source = record(value, 'scene');
  onlyKeys(source, ['schemaVersion', 'sceneId', 'title', 'sequenceConcept', 'creator', 'referenceRoles', 'globals', 'shots'], 'scene');
  if (source.schemaVersion !== SCENE_FLOW_CONTRACT_VERSION) throw new SceneFlowStateError('Scene schema version is invalid.');
  const creator = record(source.creator, 'scene.creator');
  onlyKeys(creator, ['id', 'name', 'identityLocked'], 'scene.creator');
  if ((creator.id ?? null) !== authority.creatorId || creator.name !== authority.creatorName || creator.identityLocked !== authority.identityLocked) {
    throw new SceneFlowStateError('Scene Cast authority does not match Director.');
  }
  if (!Array.isArray(source.referenceRoles) || JSON.stringify(source.referenceRoles) !== JSON.stringify(authority.referenceRoles)) {
    throw new SceneFlowStateError('Scene reference authority does not match Director.');
  }
  if (!Array.isArray(source.shots) || source.shots.length < MIN_SCENE_SHOTS || source.shots.length > MAX_SCENE_SHOTS) {
    throw new SceneFlowStateError(`Scene must contain ${MIN_SCENE_SHOTS}–${MAX_SCENE_SHOTS} shots.`);
  }
  const shots = source.shots.map((item, index) => {
    const shot = record(item, `shots[${index}]`);
    onlyKeys(shot, ['id', 'index', ...SHOT_FIELDS, 'overrides'], `shots[${index}]`);
    if (shot.index !== index + 1) throw new SceneFlowStateError('Shot indexes must be consecutive and ordered.');
    return {
      id: id(shot.id, `shots[${index}].id`),
      index: index + 1,
      ...strings(Object.fromEntries(SHOT_FIELDS.map(field => [field, shot[field]])), SHOT_FIELDS, `shots[${index}]`),
      overrides: strings(shot.overrides ?? {}, OVERRIDE_FIELDS, `shots[${index}].overrides`, true),
    };
  });
  if (new Set(shots.map(shot => shot.id)).size !== shots.length) throw new SceneFlowStateError('Shot IDs must be unique.');
  if (shots.length >= 4) {
    const signatures = new Set(shots.map(shot => [shot.purpose, shot.action, shot.pose, shot.framing, shot.angle].map(part => part.toLowerCase().replace(/\s+/g, ' ').trim()).join('|')));
    if (signatures.size < 3) throw new SceneFlowStateError('Scene needs at least three materially different shot directions.');
  }
  return {
    schemaVersion: SCENE_FLOW_CONTRACT_VERSION,
    sceneId: id(source.sceneId, 'scene.sceneId'),
    title: text(source.title, 'scene.title', 200),
    sequenceConcept: text(source.sequenceConcept, 'scene.sequenceConcept'),
    creator: { id: authority.creatorId, name: authority.creatorName, identityLocked: authority.identityLocked },
    referenceRoles: authority.referenceRoles,
    globals: strings(source.globals, GLOBAL_FIELDS, 'scene.globals'),
    shots,
  };
}

function newId(prefix = 'shot') {
  const value = globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  return `${prefix}_${value.replace(/-/g, '_')}`;
}

export function createEmptyShot(overrides = {}) {
  const shot = SHOT_FIELDS.reduce((result, field) => ({ ...result, [field]: '' }), {});
  return { id: newId(), index: 1, ...shot, overrides: {}, ...overrides };
}

function reindex(shots) { return shots.map((shot, index) => ({ ...shot, index: index + 1 })); }

export function updateSceneShot(scene, shotId, changes) {
  const index = scene.shots.findIndex(shot => shot.id === shotId);
  if (index < 0) throw new SceneFlowStateError('Shot was not found.');
  const source = record(changes, 'changes');
  onlyKeys(source, [...SHOT_FIELDS, 'overrides'], 'changes');
  const safe = strings(Object.fromEntries(SHOT_FIELDS.filter(field => source[field] !== undefined).map(field => [field, source[field]])), SHOT_FIELDS, 'changes', true);
  const overrides = changes?.overrides === undefined ? scene.shots[index].overrides : {
    ...scene.shots[index].overrides,
    ...strings(changes.overrides, OVERRIDE_FIELDS, 'changes.overrides', true),
  };
  const shots = [...scene.shots];
  shots[index] = { ...shots[index], ...safe, overrides };
  return { ...scene, shots };
}

export function addSceneShot(scene, afterShotId = null, shot = createEmptyShot()) {
  if (scene.shots.length >= MAX_SCENE_SHOTS) throw new SceneFlowStateError('Scene shot limit reached.');
  if (scene.shots.some(item => item.id === shot.id)) throw new SceneFlowStateError('Shot IDs must be unique.');
  const shots = [...scene.shots];
  const index = afterShotId ? shots.findIndex(item => item.id === afterShotId) + 1 : shots.length;
  if (afterShotId && index === 0) throw new SceneFlowStateError('Shot insertion point was not found.');
  shots.splice(index, 0, { ...createEmptyShot(), ...shot, index: 1 });
  return { ...scene, shots: reindex(shots) };
}

export function deleteSceneShot(scene, shotId) {
  if (scene.shots.length <= MIN_SCENE_SHOTS) throw new SceneFlowStateError('A scene must keep at least one shot.');
  if (!scene.shots.some(shot => shot.id === shotId)) throw new SceneFlowStateError('Shot was not found.');
  return { ...scene, shots: reindex(scene.shots.filter(shot => shot.id !== shotId)) };
}

export function moveSceneShot(scene, shotId, direction) {
  const index = scene.shots.findIndex(shot => shot.id === shotId);
  const target = direction === 'up' ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= scene.shots.length) return scene;
  const shots = [...scene.shots];
  [shots[index], shots[target]] = [shots[target], shots[index]];
  return { ...scene, shots: reindex(shots) };
}

export function resolvedSceneShot(scene, shot) {
  return { ...scene.globals, ...shot.overrides, ...SHOT_FIELDS.reduce((result, field) => ({ ...result, [field]: shot[field] }), {}) };
}

const ROLE_AUTHORITY = {
  outfit: 'OUTFIT: Preserve the assigned Outfit reference exactly as wardrobe authority. Use its visible garments and styling. Do not invent or substitute clothing.',
  background: 'BACKGROUND: Preserve the assigned Background reference as environment authority. Location intent may refine it; never copy a person from it.',
  makeup: 'MAKEUP: Preserve the assigned Makeup reference as beauty-styling authority only. Do not copy its identity.',
  hair: 'HAIR: Preserve the assigned Hair reference as hairstyle authority only. Do not copy its identity.',
  pose: 'POSE: Preserve the assigned Pose reference as composition/body-language authority for applicable shots only.',
  supporting: 'SUPPORTING: Use only relevant supporting cues. Never override a specific authority.',
};

function line(label, value) { return value ? `${label}: ${value}` : ''; }

export function buildSceneFlowPrompts(sceneInput, authorityInput) {
  const scene = validateSceneFlowScene(sceneInput, authorityInput);
  const roles = new Set(scene.referenceRoles);
  const globalLines = [
    scene.creator.identityLocked ? `IDENTITY: ${scene.creator.name || 'The selected Cast member'} is the mandatory canonical subject. Never recast identity or invent physical characteristics.` : '',
    line('SEQUENCE', scene.sequenceConcept),
    line('LOCATION INTENT', scene.globals.location),
    roles.has('outfit') ? ROLE_AUTHORITY.outfit : line('OUTFIT', scene.globals.outfit),
    roles.has('background') ? ROLE_AUTHORITY.background : line('BACKGROUND', scene.globals.background),
    roles.has('makeup') ? ROLE_AUTHORITY.makeup : line('MAKEUP', scene.globals.makeup),
    roles.has('hair') ? ROLE_AUTHORITY.hair : line('HAIR', scene.globals.hair),
    roles.has('supporting') ? ROLE_AUTHORITY.supporting : line('SUPPORTING', scene.globals.supporting),
    line('MOOD', scene.globals.mood), line('VISUAL STYLE', scene.globals.visualStyle),
    line('CAMERA LANGUAGE', scene.globals.cameraLanguage), line('LIGHTING', scene.globals.lighting),
    line('TIME', scene.globals.timeOfDay), line('FORMAT', scene.globals.contentFormat),
    line('ASPECT', scene.globals.aspectRatio), line('CONTINUITY', scene.globals.continuity),
  ].filter(Boolean);
  const globalPrompt = ['GLOBAL CONTINUITY — applies to every shot unless explicitly overridden:', ...globalLines].join('\n');
  const shotPrompts = scene.shots.map(shot => {
    const resolved = resolvedSceneShot(scene, shot);
    const shotLines = SHOT_FIELDS.map(field => line(field.toUpperCase(), resolved[field])).filter(Boolean);
    const roleControlled = new Set(['outfit', 'hair', 'makeup', 'background'].filter(role => roles.has(role)));
    const overrideLines = Object.entries(shot.overrides)
      .filter(([field, value]) => value && !roleControlled.has(field))
      .map(([field, value]) => `${field.toUpperCase()} OVERRIDE: ${value}`);
    return {
      shotId: shot.id,
      prompt: [globalPrompt, `SHOT ${shot.index} — ${shot.id}:`, ...shotLines, ...overrideLines, roles.has('pose') ? ROLE_AUTHORITY.pose : ''].filter(Boolean).join('\n'),
    };
  });
  return { globalPrompt, shotPrompts };
}

export function associateBatchSlotsWithShots(batch, scene) {
  const shots = scene?.shots || [];
  return {
    ...batch,
    slots: (batch?.slots || []).map(slot => ({ ...slot, sceneShotId: slot.sceneShotId || shots[slot.slotIndex]?.id || null })),
  };
}
