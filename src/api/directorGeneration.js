import {
  castQuickShootPlain,
  characterGenerate,
  pollCastQuickShootStatus,
  retryCastQuickShootSlot,
} from './studio.js';
import { canonicalCreatorId } from '../lib/cloudCreators.js';
import { referencePromptBlock } from '../lib/directorReferences.js';
import { isTerminalBatchStatus, normalizeGenerationBatch } from '../lib/generationBatch.js';
import { recoverDirectorPendingPointer } from './directorRecovery.js';

const POLL_INTERVAL_MS = 2500;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;
const DATA_IMAGE = /^data:image\/(?:jpeg|png|webp);base64,/i;
const PENDING_STORAGE_PREFIX = 'thee-studio:director-pending:v3:';
const RESULT_STORAGE_PREFIX = 'thee-studio:director-batch:v2:';
const STALE_PENDING_STORAGE_PREFIXES = [
  'thee-studio:director-pending:v2:',
  'thee-studio:director-pending:v1:',
];

function storageKey(prefix, scopeKey) {
  return `${prefix}${encodeURIComponent(scopeKey || 'director')}`;
}

function readRecord(prefix, scopeKey) {
  const key = storageKey(prefix, scopeKey);
  let raw = null;
  try { raw = globalThis.sessionStorage?.getItem(key); } catch {}
  if (!raw && prefix === PENDING_STORAGE_PREFIX) {
    try { raw = globalThis.localStorage?.getItem(key); } catch {}
  }
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}

function writeRecord(prefix, scopeKey, record) {
  const key = storageKey(prefix, scopeKey);
  const value = JSON.stringify({
    ...record,
    scopeKey,
    updatedAt: new Date().toISOString(),
  });
  let persisted = false;
  try { globalThis.sessionStorage?.setItem(key, value); persisted = true; } catch {}
  if (prefix === PENDING_STORAGE_PREFIX) {
    // Cross-session fallback stores pointer metadata only. Never persist
    // signed asset URLs, image payloads, or private reference snapshots.
    const pointerValue = JSON.stringify({
      parentBatchId: record.parentBatchId || record.jobId,
      jobId: record.parentBatchId || record.jobId,
      requestedCount: record.requestedCount || 1,
      requestKey: record.requestKey || null,
      status: record.status || 'running',
      scopeKey,
      createdAt: record.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    try { globalThis.localStorage?.setItem(key, pointerValue); persisted = true; } catch {}
  }
  return persisted;
}

function removeRecord(prefix, scopeKey) {
  const key = storageKey(prefix, scopeKey);
  try { globalThis.sessionStorage?.removeItem(key); } catch {}
  try { globalThis.localStorage?.removeItem(key); } catch {}
}

function directorContextForScope(scopeKey = '') {
  const [workflow, , outputType] = String(scopeKey).split(':');
  if (workflow !== 'describe' && workflow !== 'talk' && workflow !== 'guided') return null;
  return {
    workflow,
    outputType: workflow === 'talk' ? outputType || 'photo' : 'photo',
  };
}

export function getPendingDirectorJob(scopeKey) {
  const current = readRecord(PENDING_STORAGE_PREFIX, scopeKey);
  if (current?.parentBatchId || current?.jobId) return current;
  // v1/v2 pointers predate strict workflow tagging. Reusing them can attach a
  // hidden Director mode to unrelated legacy work and start status-driven
  // continuation before the user presses Generate.
  STALE_PENDING_STORAGE_PREFIXES.forEach(prefix => removeRecord(prefix, scopeKey));
  return null;
}

export function getDirectorBatchSnapshot(scopeKey) {
  return readRecord(RESULT_STORAGE_PREFIX, scopeKey);
}

function savePendingDirectorJob(scopeKey, record) {
  return writeRecord(PENDING_STORAGE_PREFIX, scopeKey, {
    ...record,
    createdAt: record.createdAt || new Date().toISOString(),
  });
}

function saveDirectorBatchSnapshot(scopeKey, batch) {
  return writeRecord(RESULT_STORAGE_PREFIX, scopeKey, {
    parentBatchId: batch.parentBatchId,
    requestedCount: batch.requestedCount,
    status: batch.status,
    batch,
  });
}

function clearPendingDirectorJob(scopeKey) {
  removeRecord(PENDING_STORAGE_PREFIX, scopeKey);
}

function clearDirectorBatchSnapshot(scopeKey) {
  removeRecord(RESULT_STORAGE_PREFIX, scopeKey);
}

function pendingError(parentBatchId, persisted) {
  const error = new Error(persisted
    ? 'This render is still processing. Director saved the job and will continue checking it.'
    : 'This render is still processing, but Director could not save the job in this browser session. Keep this tab open and do not submit it again.');
  error.code = 'DIRECTOR_STILL_PROCESSING';
  error.status = 'still_processing';
  error.jobId = parentBatchId;
  error.parentBatchId = parentBatchId;
  error.persisted = persisted;
  return error;
}

function embeddedCreatorIdentity(creator) {
  const values = [...(Array.isArray(creator?.refImages) ? creator.refImages : []), creator?.image];
  return values.find(value => typeof value === 'string' && DATA_IMAGE.test(value)) || null;
}

function usableReferences(references = []) {
  return references.filter(reference => reference?.dataUrl && DATA_IMAGE.test(reference.dataUrl));
}

function normalizedBatchSize(value) {
  const count = Number(value);
  return Number.isInteger(count) && count >= 1 && count <= 5 ? count : 1;
}

function emitBatch(onStatus, batch, extra = {}) {
  onStatus?.({ ...extra, status: batch.status, batch, parentBatchId: batch.parentBatchId, count: batch.requestedCount });
}

export function directorIdentityState(creator, references = []) {
  const creatorId = canonicalCreatorId(creator);
  const embeddedIdentity = embeddedCreatorIdentity(creator);
  const explicitIdentity = usableReferences(references).find(reference => reference.role === 'identity') || null;
  const selectedCreator = Boolean(creator);
  const locked = selectedCreator ? Boolean(creatorId || embeddedIdentity) : Boolean(explicitIdentity);
  const warning = selectedCreator && !locked
    ? `${creator?.name || 'The selected Cast member'} is selected, but Director cannot bind a canonical or embedded identity to the render. No generation will start until identity is available.`
    : (!selectedCreator && references.length > 0 && !explicitIdentity
      ? 'These references have styling or scene roles, but there is no Identity reference. Add Identity or remove the references before generating.'
      : '');
  return { creatorId, embeddedIdentity, explicitIdentity, selectedCreator, locked, warning };
}

export async function awaitGeneration(result, {
  scopeKey = 'director',
  requestKey = null,
  requestedCount = 1,
  pollIntervalMs = POLL_INTERVAL_MS,
  pollTimeoutMs = POLL_TIMEOUT_MS,
  onStatus = null,
} = {}) {
  let batch = normalizeGenerationBatch(result, { requestedCount });
  const parentBatchId = batch.parentBatchId;
  if (isTerminalBatchStatus(batch.status)) {
    clearPendingDirectorJob(scopeKey);
    saveDirectorBatchSnapshot(scopeKey, batch);
    emitBatch(onStatus, batch);
    return batch;
  }
  if (!parentBatchId) throw new Error('Director generation did not return a valid parent batch.');

  const baseRecord = {
    parentBatchId,
    jobId: parentBatchId,
    requestedCount: batch.requestedCount,
    requestKey,
    status: batch.status,
    batch,
  };
  let persisted = savePendingDirectorJob(scopeKey, baseRecord);
  clearDirectorBatchSnapshot(scopeKey);
  emitBatch(onStatus, batch, { persisted });

  const deadline = Date.now() + pollTimeoutMs;
  while (Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    let status;
    try {
      status = await pollCastQuickShootStatus(parentBatchId, { continueBatch: true });
    } catch {
      // Transient status-check failure is not evidence the parent failed.
      continue;
    }
    batch = normalizeGenerationBatch(status, {
      parentBatchId,
      requestedCount: batch.requestedCount,
    });
    if (isTerminalBatchStatus(batch.status)) {
      clearPendingDirectorJob(scopeKey);
      saveDirectorBatchSnapshot(scopeKey, batch);
      emitBatch(onStatus, batch);
      return batch;
    }
    persisted = savePendingDirectorJob(scopeKey, { ...baseRecord, status: batch.status, batch });
    emitBatch(onStatus, batch, { persisted });
  }
  throw pendingError(parentBatchId, persisted);
}

export async function resumeDirectorGeneration(scopeKey, options = {}) {
  const pending = getPendingDirectorJob(scopeKey);
  const parentBatchId = pending?.parentBatchId || pending?.jobId;
  if (!parentBatchId) return getDirectorBatchSnapshot(scopeKey)?.batch || null;
  return awaitGeneration(pending.batch || {
    status: pending.status || 'running',
    parentBatchId,
    requestedCount: pending.requestedCount || 1,
  }, {
    scopeKey,
    requestKey: pending.requestKey,
    requestedCount: pending.requestedCount || 1,
    pollIntervalMs: options.pollIntervalMs,
    pollTimeoutMs: options.pollTimeoutMs,
    onStatus: options.onStatus,
  });
}

export async function retryDirectorGenerationSlot(scopeKey, slotIndex, options = {}) {
  const pending = getPendingDirectorJob(scopeKey);
  const snapshot = getDirectorBatchSnapshot(scopeKey);
  const record = pending || snapshot;
  const parentBatchId = options.parentBatchId || record?.parentBatchId || record?.jobId;
  if (!parentBatchId) throw new Error('Director cannot retry this image because its parent batch is unavailable.');
  const previous = record?.batch || normalizeGenerationBatch({}, { parentBatchId, requestedCount: slotIndex + 1 });
  const slot = previous.slots?.find(item => item.slotIndex === slotIndex);
  if (slot && !['provider_blocked', 'failed'].includes(slot.status)) {
    throw new Error('Only provider-blocked or failed images can be retried.');
  }

  await retryCastQuickShootSlot(parentBatchId, slotIndex);
  const retrying = normalizeGenerationBatch({
    ...previous,
    status: 'running',
    batchStatus: 'running',
    succeededCount: undefined,
    providerBlockedCount: undefined,
    failedCount: undefined,
    cancelledCount: undefined,
    slots: previous.slots.map(item => item.slotIndex === slotIndex
      ? { ...item, status: 'running', imageUrl: null }
      : item),
  }, { parentBatchId, requestedCount: previous.requestedCount });
  savePendingDirectorJob(scopeKey, {
    parentBatchId,
    jobId: parentBatchId,
    requestedCount: previous.requestedCount,
    status: 'running',
    batch: retrying,
  });
  clearDirectorBatchSnapshot(scopeKey);
  emitBatch(options.onStatus, retrying);
  return awaitGeneration(retrying, {
    scopeKey,
    requestedCount: previous.requestedCount,
    pollIntervalMs: options.pollIntervalMs,
    pollTimeoutMs: options.pollTimeoutMs,
    onStatus: options.onStatus,
  });
}

export async function generateDirectorPhoto({
  creator = null,
  prompt = '',
  negativePrompt = '',
  references = [],
  imageSize = 'Vertical 9:16',
  batchSize = 1,
  requestKey = null,
  mode = 'lifestyle',
  fashionSafetyMode = 'auto',
  pendingScope = null,
  pollIntervalMs = POLL_INTERVAL_MS,
  pollTimeoutMs = POLL_TIMEOUT_MS,
  onStatus = null,
} = {}) {
  if (!prompt.trim()) throw new Error('Director has no generation prompt yet.');
  const refs = usableReferences(references);
  const identity = directorIdentityState(creator, refs);
  if (identity.warning) throw new Error(identity.warning);

  let characterImage = null;
  let anchorReferences = refs;
  if (identity.selectedCreator) {
    // Canonical Cast identity resolves server-side. Display signed URLs remain
    // UI-only and are never sent as provider identity inputs.
    characterImage = identity.creatorId ? null : identity.embeddedIdentity;
    anchorReferences = refs.filter(reference => reference.role !== 'identity');
  } else if (identity.explicitIdentity) {
    characterImage = identity.explicitIdentity.dataUrl;
    anchorReferences = refs.filter(reference => reference !== identity.explicitIdentity && reference.role !== 'identity');
  }

  // The renderer receives the actual images with structured roles. Add the
  // same mandatory role contract to the provider prompt so Makeup/Hair/Pose
  // cannot degrade into loose "inspiration" while Outfit/Background dominate.
  const roleBlock = anchorReferences.length
    ? referencePromptBlock(anchorReferences, { startsAfterIdentity: Boolean(identity.locked) })
    : '';
  const providerPrompt = [prompt.trim(), roleBlock].filter(Boolean).join('\n\n');

  const count = normalizedBatchSize(batchSize);
  const baseRequestKey = requestKey || crypto.randomUUID();
  const scopeKey = pendingScope || `director:${identity.creatorId || 'open'}`;
  if (getPendingDirectorJob(scopeKey)) {
    return resumeDirectorGeneration(scopeKey, { pollIntervalMs, pollTimeoutMs, onStatus });
  }
  // Describe/Talk can lose every browser pointer after a refresh or storage
  // eviction. Discover before provider submission at the shared gateway so a
  // UI timing race can never create a second paid parent batch.
  if (scopeKey.startsWith('describe:') || scopeKey.startsWith('talk:')) {
    await recoverDirectorPendingPointer(scopeKey);
    if (getPendingDirectorJob(scopeKey)) {
      return resumeDirectorGeneration(scopeKey, { pollIntervalMs, pollTimeoutMs, onStatus });
    }
  }
  clearDirectorBatchSnapshot(scopeKey);
  onStatus?.({ status: 'generating', count, requestedCount: count });
  const directorContext = directorContextForScope(scopeKey);

  let submitted;
  if (identity.creatorId || characterImage) {
    submitted = await characterGenerate({
      engineId: 'openai_image',
      positivePrompt: providerPrompt,
      negativePrompt,
      characterImage,
      anchorReferences,
      mode,
      imageSize,
      batchSize: count,
      creatorId: identity.creatorId,
      fashionSafetyMode,
      requestKey: baseRequestKey,
      returnPending: true,
      directorContext,
    });
  } else {
    if (refs.length) throw new Error('Add an Identity reference before using styling or scene references without a saved Cast member.');
    submitted = await castQuickShootPlain({
      positivePrompt: providerPrompt,
      negativePrompt,
      batchSize: count,
      imageSize,
      fashionSafetyMode,
      requestKey: baseRequestKey,
      returnPending: true,
      directorContext,
    });
  }

  return awaitGeneration(submitted, {
    scopeKey,
    requestKey: baseRequestKey,
    requestedCount: count,
    pollIntervalMs,
    pollTimeoutMs,
    onStatus,
  });
}
