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

  if (identity.creatorId || characterImage) {
    const submitted = await characterGenerate({
      engineId: 'openai_image',
      positivePrompt: prompt,
      negativePrompt,
      characterImage,
      anchorReferences,
      mode,
      imageSize,
      batchSize,
      creatorId: identity.creatorId,
      fashionSafetyMode,
      requestKey: requestKey || crypto.randomUUID(),
    });
    return await awaitGeneration(submitted);
  }

  if (refs.length) {
    throw new Error('Add an Identity reference before using styling or scene references without a saved Cast member.');
  }

  return await castQuickShootPlain({
    positivePrompt: prompt,
    negativePrompt,
    batchSize,
    imageSize,
    fashionSafetyMode,
    requestKey: requestKey || crypto.randomUUID(),
  });
}
