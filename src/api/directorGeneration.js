import { castQuickShootPlain, characterGenerate, pollCastQuickShootStatus } from './studio.js';
import { canonicalCreatorId } from '../lib/cloudCreators.js';

const POLL_INTERVAL_MS = 2500;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;
const DATA_IMAGE = /^data:image\/(?:jpeg|png|webp);base64,/i;
const PENDING_STORAGE_PREFIX = 'thee-studio:director-pending:v1:';
const pendingSequences = new Map();

function storageKey(scopeKey) {
  return `${PENDING_STORAGE_PREFIX}${encodeURIComponent(scopeKey || 'director')}`;
}

export function getPendingDirectorJob(scopeKey) {
  try {
    const raw = globalThis.sessionStorage?.getItem(storageKey(scopeKey));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function savePendingDirectorJob(scopeKey, record) {
  try {
    globalThis.sessionStorage?.setItem(storageKey(scopeKey), JSON.stringify({
      ...record,
      scopeKey,
      status: 'still_processing',
      updatedAt: new Date().toISOString(),
    }));
    return Boolean(globalThis.sessionStorage?.getItem(storageKey(scopeKey)));
  } catch {
    // Polling still works in-memory when session storage is unavailable.
    return false;
  }
}

function clearPendingDirectorJob(scopeKey) {
  try { globalThis.sessionStorage?.removeItem(storageKey(scopeKey)); } catch {}
}

function pendingError(jobId, persisted) {
  const error = new Error(persisted
    ? 'This render is still processing. Director saved the job and will continue checking it.'
    : 'This render is still processing, but Director could not save the job in this browser session. Keep this tab open and do not submit it again.');
  error.code = 'DIRECTOR_STILL_PROCESSING';
  error.status = 'still_processing';
  error.jobId = jobId;
  error.persisted = persisted;
  return error;
}

function embeddedCreatorIdentity(creator) {
  const values = [
    ...(Array.isArray(creator?.refImages) ? creator.refImages : []),
    creator?.image,
  ];
  return values.find(value => typeof value === 'string' && DATA_IMAGE.test(value)) || null;
}

function usableReferences(references = []) {
  return references.filter(reference => reference?.dataUrl && DATA_IMAGE.test(reference.dataUrl));
}

function normalizedBatchSize(value) {
  const count = Number(value);
  return Number.isInteger(count) && count >= 1 && count <= 4 ? count : 1;
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
  index = 0,
  count = 1,
  completedImages = [],
  pollIntervalMs = POLL_INTERVAL_MS,
  pollTimeoutMs = POLL_TIMEOUT_MS,
  onStatus = null,
} = {}) {
  if (result?.status !== 'pending') return result;
  if (!result.jobId) throw new Error('Director generation did not return a valid job.');
  const persisted = savePendingDirectorJob(scopeKey, { jobId: result.jobId, requestKey, index, count, completedImages });
  onStatus?.({ status: 'still_processing', jobId: result.jobId, index, count, persisted });
  const deadline = Date.now() + pollTimeoutMs;
  while (Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    try {
      const status = await pollCastQuickShootStatus(result.jobId);
      if (status.status === 'succeeded') {
        clearPendingDirectorJob(scopeKey);
        onStatus?.({ status: 'succeeded', jobId: result.jobId, index, count });
        return status;
      }
      if (status.status === 'failed' || status.status === 'cancelled') {
        clearPendingDirectorJob(scopeKey);
        const error = new Error(status.error || (status.status === 'cancelled' ? 'Image generation was cancelled.' : 'Image generation failed.'));
        error.category = status.errorCategory || 'unknown';
        error.status = status.status;
        onStatus?.({ status: status.status, jobId: result.jobId, index, count, error: error.message });
        throw error;
      }
    } catch (error) {
      if (error.status === 'failed' || error.status === 'cancelled') throw error;
      // A transient status-check failure is not proof that provider work
      // failed. Keep same durable job and try again until UI wait expires.
    }
  }
  throw pendingError(result.jobId, persisted);
}

async function generateIdentityBoundSequence({
  count,
  baseRequestKey,
  prompt,
  negativePrompt,
  characterImage,
  anchorReferences,
  mode,
  imageSize,
  creatorId,
  fashionSafetyMode,
  pendingScope,
  pollIntervalMs,
  pollTimeoutMs,
  onStatus,
  startIndex = 0,
  completedImages = [],
}) {
  const images = [...completedImages];
  const sequence = {
    count, baseRequestKey, prompt, negativePrompt, characterImage,
    anchorReferences, mode, imageSize, creatorId, fashionSafetyMode,
    pendingScope, pollIntervalMs, pollTimeoutMs, onStatus,
  };
  try {
    for (let index = startIndex; index < count; index += 1) {
      pendingSequences.set(pendingScope, { sequence, index, completedImages: [...images] });
      onStatus?.({ status: 'generating', index, count });
      const submitted = await characterGenerate({
        engineId: 'openai_image',
        positivePrompt: prompt,
        negativePrompt,
        characterImage,
        anchorReferences,
        mode,
        imageSize,
        // Responses image generation is intentionally serialized here. The
        // provider proved stable for this identity/reference contract one render
        // at a time; Director must not fan multiple heavy vision renders out in
        // parallel and turn a healthy Cast lock into an opaque tool failure.
        batchSize: 1,
        creatorId,
        fashionSafetyMode,
        requestKey: `${baseRequestKey}:director-image-${index + 1}`,
        returnPending: true,
      });
      const result = await awaitGeneration(submitted, {
        scopeKey: pendingScope,
        requestKey: baseRequestKey,
        index,
        count,
        completedImages: images,
        pollIntervalMs,
        pollTimeoutMs,
        onStatus,
      });
      const image = result?.images?.[0];
      if (!image) {
        throw new Error(`Director render ${index + 1} of ${count} finished without an image. The batch was not treated as complete.`);
      }
      images.push(image);
    }
  } catch (error) {
    if (error?.status !== 'still_processing' && error?.code !== 'DIRECTOR_STILL_PROCESSING') {
      pendingSequences.delete(pendingScope);
      clearPendingDirectorJob(pendingScope);
      const status = error?.status === 'cancelled' ? 'cancelled' : 'failed';
      onStatus?.({ status, error: error?.message, count });
    }
    throw error;
  }
  pendingSequences.delete(pendingScope);
  clearPendingDirectorJob(pendingScope);
  onStatus?.({ status: 'succeeded', count, images });
  return { status: 'succeeded', images };
}

export async function resumeDirectorGeneration(scopeKey, options = {}) {
  const pending = getPendingDirectorJob(scopeKey);
  if (!pending?.jobId) return null;
  const result = await awaitGeneration({ status: 'pending', jobId: pending.jobId }, {
    scopeKey,
    requestKey: pending.requestKey,
    index: pending.index,
    count: pending.count,
    completedImages: pending.completedImages || [],
    pollIntervalMs: options.pollIntervalMs,
    pollTimeoutMs: options.pollTimeoutMs,
    onStatus: options.onStatus,
  });
  const image = result?.images?.[0];
  if (!image) throw new Error('Director resumed a completed job without an image.');
  const completedImages = [...(pending.completedImages || []), image];
  const continuation = pendingSequences.get(scopeKey);
  if (continuation && pending.index + 1 < pending.count) {
    return generateIdentityBoundSequence({
      ...continuation.sequence,
      startIndex: pending.index + 1,
      completedImages,
      onStatus: options.onStatus || continuation.sequence.onStatus,
    });
  }
  pendingSequences.delete(scopeKey);
  if (completedImages.length !== pending.count) {
    const error = new Error(`Director resumed job ${pending.jobId}, but the ${pending.count}-image batch stopped at ${completedImages.length}. The partial batch was not accepted and no replacement provider job was started.`);
    error.status = 'failed';
    options.onStatus?.({ status: 'failed', error: error.message, count: pending.count });
    throw error;
  }
  options.onStatus?.({ status: 'succeeded', count: pending.count, images: completedImages });
  return { status: 'succeeded', images: completedImages };
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
    // Cloud Cast identity is loaded server-side from creatorId. Display signed
    // URLs are UI-only and must never masquerade as provider input images.
    characterImage = identity.creatorId ? null : identity.embeddedIdentity;
    anchorReferences = refs.filter(reference => reference.role !== 'identity');
  } else if (identity.explicitIdentity) {
    characterImage = identity.explicitIdentity.dataUrl;
    anchorReferences = refs.filter(reference => reference !== identity.explicitIdentity && reference.role !== 'identity');
  }

  const count = normalizedBatchSize(batchSize);
  const baseRequestKey = requestKey || crypto.randomUUID();
  const scopeKey = pendingScope || `director:${identity.creatorId || 'open'}`;

  if (getPendingDirectorJob(scopeKey)?.jobId) {
    return resumeDirectorGeneration(scopeKey, { pollIntervalMs, pollTimeoutMs, onStatus });
  }

  if (identity.creatorId || characterImage) {
    return await generateIdentityBoundSequence({
      count,
      baseRequestKey,
      prompt,
      negativePrompt,
      characterImage,
      anchorReferences,
      mode,
      imageSize,
      creatorId: identity.creatorId,
      fashionSafetyMode,
      pendingScope: scopeKey,
      pollIntervalMs,
      pollTimeoutMs,
      onStatus,
    });
  }

  if (refs.length) {
    throw new Error('Add an Identity reference before using styling or scene references without a saved Cast member.');
  }

  // Plain text-to-image can safely use the Images API's native n parameter;
  // the serialization rule above is specifically for identity/reference-bound
  // Responses vision renders.
  onStatus?.({ status: 'generating', index: 0, count });
  const submitted = await castQuickShootPlain({
    positivePrompt: prompt,
    negativePrompt,
    batchSize: count,
    imageSize,
    fashionSafetyMode,
    requestKey: baseRequestKey,
    returnPending: true,
  });
  const result = await awaitGeneration(submitted, {
    scopeKey,
    requestKey: baseRequestKey,
    index: 0,
    count,
    pollIntervalMs,
    pollTimeoutMs,
    onStatus,
  });
  if ((result.images || []).length !== count) {
    throw new Error(`Director requested ${count} image${count === 1 ? '' : 's'} but received ${(result.images || []).length}. The partial batch was not accepted.`);
  }
  clearPendingDirectorJob(scopeKey);
  onStatus?.({ status: 'succeeded', count, images: result.images || [] });
  return result;
}
