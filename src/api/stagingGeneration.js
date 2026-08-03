import { supabase } from '../lib/supabase.js';

const WORKSPACE_CREATOR = 'Thee Studio Staging Workspace';
const WORKSPACE_PROJECT = 'Thee Studio Staging Image Generator';
const WORKSPACE_SHOT = 'Image Generator';

export const FORMAT_ASPECT = {
  'Vertical 9:16': '9:16',
  'Instagram 4:5': '4:5',
  'Square 1:1': '1:1',
  'Landscape 16:9': '16:9',
};

export function createIdempotencyKey() {
  if (globalThis.crypto?.randomUUID) return `web-still-${globalThis.crypto.randomUUID()}`;
  return `web-still-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function buildGenerationRequest({ prompt, negativePrompt = '', candidateCount = 1, aspectRatio, shot }) {
  const cleanPrompt = prompt?.trim() || '';
  if (!cleanPrompt || cleanPrompt.length > 20_000) throw new Error('Enter a prompt before generating.');
  if (candidateCount !== 1) throw new Error('Staging generation currently supports one image at a time.');
  if (!Object.values(FORMAT_ASPECT).includes(aspectRatio)) throw new Error('Choose a supported image format.');
  if (!shot?.id || !shot?.title) throw new Error('Generation workspace is unavailable.');
  return {
    prompt: cleanPrompt,
    negativePrompt: negativePrompt.trim(),
    candidateCount: 1,
    aspectRatio,
    shot: { id: shot.id, title: shot.title },
  };
}

async function queryOne(query, label) {
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(`Unable to load ${label}.`);
  return data;
}

async function insertOne(query, value, label) {
  const { data, error } = await query.insert(value).select().single();
  if (error || !data) throw new Error(`Unable to create ${label}.`);
  return data;
}

export async function ensureGenerationContext(client = supabase, { prompt, aspectRatio }) {
  if (!client) throw new Error('Staging connection is not configured.');
  let creator = await queryOne(
    client.from('creators').select('id').eq('name', WORKSPACE_CREATOR).order('created_at', { ascending: true }).limit(1),
    'generation creator',
  );
  if (!creator) {
    creator = await insertOne(client.from('creators'), {
      name: WORKSPACE_CREATOR,
      description: 'RLS-owned staging workspace for browser generation',
    }, 'generation creator');
  }

  let project = await queryOne(
    client.from('generation_projects').select('id').eq('title', WORKSPACE_PROJECT).order('created_at', { ascending: true }).limit(1),
    'generation project',
  );
  if (!project) {
    project = await insertOne(client.from('generation_projects'), {
      creator_id: creator.id,
      title: WORKSPACE_PROJECT,
      brief: 'Staging-only browser integration workspace',
      status: 'active',
      default_aspect_ratio: aspectRatio,
    }, 'generation project');
  }

  let shot = await queryOne(
    client.from('generation_shots').select('id,title').eq('project_id', project.id).eq('title', WORKSPACE_SHOT).limit(1),
    'generation shot',
  );
  if (!shot) {
    shot = await insertOne(client.from('generation_shots'), {
      project_id: project.id,
      title: WORKSPACE_SHOT,
      shot_type: 'product',
      prompt_template: prompt.slice(0, 12_000),
      aspect_ratio: aspectRatio,
      position: 1,
    }, 'generation shot');
  } else {
    const { error } = await client.from('generation_shots').update({
      prompt_template: prompt.slice(0, 12_000),
      aspect_ratio: aspectRatio,
    }).eq('id', shot.id);
    if (error) throw new Error('Unable to update generation shot.');
  }
  return { project, shot };
}

export async function createSignedImageUrl(client, storagePath, expiresIn = 300) {
  if (!storagePath || typeof storagePath !== 'string') throw new Error('Generated image path is missing.');
  const { data: userData, error: userError } = await client.auth.getUser();
  const userId = userData?.user?.id;
  if (userError || !userId || !storagePath.startsWith(`${userId}/`)) {
    throw new Error('Generated image ownership could not be verified.');
  }
  const { data, error } = await client.storage.from('generation-assets').createSignedUrl(storagePath, expiresIn);
  if (error || !data?.signedUrl) throw new Error('Generated image could not be displayed securely.');
  return data.signedUrl;
}

async function safeFunctionFailure(error) {
  const response = error?.context;
  let status = response?.status;
  let payload = null;
  if (response && typeof response.clone === 'function') {
    try { payload = await response.clone().json(); } catch {}
  }
  if (status === 401) return 'Your session expired. Sign in again.';
  if (status === 402) return 'This account cannot generate images.';
  if (status === 409) return 'This generation request is already being processed.';
  if (payload?.error === 'Generation cancelled.') return 'Generation was cancelled.';
  return 'Generation could not be completed. No retry was sent.';
}

export async function generateStagingStill(client = supabase, input, dependencies = {}) {
  if (!client) throw new Error('Staging connection is not configured.');
  const ensureContext = dependencies.ensureContext || ensureGenerationContext;
  const signImage = dependencies.signImage || createSignedImageUrl;
  const idempotencyKey = dependencies.idempotencyKey || createIdempotencyKey();
  const aspectRatio = FORMAT_ASPECT[input.format] || input.aspectRatio;
  const context = await ensureContext(client, { prompt: input.prompt, aspectRatio });
  const body = buildGenerationRequest({
    prompt: input.prompt,
    negativePrompt: input.negativePrompt,
    candidateCount: 1,
    aspectRatio,
    shot: context.shot,
  });

  const { data, error } = await client.functions.invoke('crisp-generate-stills', {
    body,
    headers: { 'idempotency-key': idempotencyKey },
  });
  if (error) throw new Error(await safeFunctionFailure(error));
  if (!data || !Array.isArray(data.assets) || data.assets.length !== 1) {
    throw new Error('Generation returned an invalid image response.');
  }
  const asset = data.assets[0];
  if (!asset?.storagePath || asset.externalUrl != null) {
    throw new Error('Generation returned an unsafe image response.');
  }
  const signedUrl = await signImage(client, asset.storagePath, 300);
  return {
    idempotencyKey,
    externalRunId: data.externalRunId ?? null,
    projectId: context.project?.id ?? null,
    shotId: context.shot.id,
    images: [{
      storagePath: asset.storagePath,
      signedUrl,
      width: asset.width ?? null,
      height: asset.height ?? null,
      seed: asset.seed ?? null,
      metadata: asset.metadata ?? {},
    }],
    status: 'Generation complete · usage tracked',
  };
}
