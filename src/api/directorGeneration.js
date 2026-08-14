import { castQuickShootPlain, characterGenerate, pollCastQuickShootStatus } from './studio.js';
import { canonicalCreatorId } from '../lib/cloudCreators.js';

const POLL_INTERVAL_MS = 2500;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;
const DATA_IMAGE = /^data:image\/(?:jpeg|png|webp);base64,/i;

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

async function awaitGeneration(result) {
  if (result?.status !== 'pending') return result;
  if (!result.jobId) throw new Error('Director generation did not return a valid job.');
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
    const status = await pollCastQuickShootStatus(result.jobId);
    if (status.status === 'succeeded') return status;
    if (status.status === 'failed') {
      const error = new Error(status.error || 'Image generation failed.');
      error.category = status.errorCategory || 'unknown';
      throw error;
    }
  }
  throw new Error('Generation is taking longer than expected. The job is preserved; check Jobs before submitting it again.');
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
}) {
  const images = [];
  for (let index = 0; index < count; index += 1) {
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
    });
    const result = await awaitGeneration(submitted);
    const image = result?.images?.[0];
    if (!image) {
      throw new Error(`Director render ${index + 1} of ${count} finished without an image. The batch was not treated as complete.`);
    }
    images.push(image);
  }
  return { status: 'succeeded', images };
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
    });
  }

  if (refs.length) {
    throw new Error('Add an Identity reference before using styling or scene references without a saved Cast member.');
  }

  // Plain text-to-image can safely use the Images API's native n parameter;
  // the serialization rule above is specifically for identity/reference-bound
  // Responses vision renders.
  return await castQuickShootPlain({
    positivePrompt: prompt,
    negativePrompt,
    batchSize: count,
    imageSize,
    fashionSafetyMode,
    requestKey: baseRequestKey,
  });
}
