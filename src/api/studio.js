import { referencePromptBlock, serializeDirectorReferences } from '../lib/directorReferences.js';
import { finishUsageTelemetry, startUsageTelemetry } from './usageTelemetry.js';
import { getSupabase, hasSupabaseConfig } from '../lib/supabase.js';

async function invokeCloudFunction(name, body, idempotencyKey = crypto.randomUUID()) {
  const { data, error } = await getSupabase().functions.invoke(name, {
    body,
    headers: { 'idempotency-key': idempotencyKey },
  });
  if (error) throw new Error(error.message || `${name} failed.`);
  if (data?.error) throw new Error(data.error);
  return data;
}

async function signCastAssets(bucket, assets, pathKey = 'storagePath') {
  return Promise.all((assets || []).map(async asset => {
    const { data: signed, error: signError } = await getSupabase().storage
      .from(bucket)
      .createSignedUrl(asset[pathKey], 3600);
    if (signError || !signed?.signedUrl) throw new Error('Could not open a generated image.');
    return signed.signedUrl;
  }));
}

const BASE = '/gradio_api';
const GRADIO_CONFIG_URL = '/config';
const SESSION_HASH = Math.random().toString(36).slice(2);
export const LOCAL_ACTION_UNAVAILABLE = 'This action needs local studio services and is unavailable in cloud. Coming soon.';

export function isLocalStudioServiceEnabled(env = import.meta.env) {
  return env?.DEV === true || env?.VITE_ALLOW_LOCAL_MODE === 'true';
}

function requireLocalStudioService() {
  if (!isLocalStudioServiceEnabled()) throw new Error(LOCAL_ACTION_UNAVAILABLE);
}

// Legacy local-only compatibility. Cloud generation paths do not run prompts
// through this word-replacement layer; they preserve the user's wording and
// rely on the server/provider safety controls instead.
const OPENAI_REPLACEMENTS = [
  [/\bsensual\b/gi, 'refined'],
  [/\bseductive\b/gi, 'magnetic'],
  [/\bsexy\b/gi, 'confident'],
  [/\berotic\b/gi, 'artistic'],
  [/\bexplicit\b/gi, 'editorial'],
  [/\bsuggestive\b/gi, 'editorial'],
  [/\brevealing\b/gi, 'fashion-forward'],
  [/\bnude\b/gi, 'natural'],
  [/\bboudoir[\w\s-]*inspired\b/gi, 'studio-style editorial'],
  [/\bboudoir\b/gi, 'studio editorial'],
  [/\bintimate\b/gi, 'close and personal'],
  [/\bbathroom mirror\b/gi, 'dressing-room mirror'],
  [/\bbedroom\b/gi, 'private suite'],
  [/\bprovocative\b/gi, 'bold editorial'],
  [/\bskin-tight\b/gi, 'fitted'],
  [/\bcleavage\b/gi, 'neckline'],
  [/\bbralette\b/gi, 'fitted top'],
  [/\bbikini\b/gi, 'swimwear'],
  [/\bno nudity\b/gi, 'fully clothed'],
  [/\bnon-sexual(?:ized)?\b/gi, 'wholesome'],
  [/visible pores[^.)]*/gi, 'realistic skin detail'],
  [/natural skin imperfections/gi, 'authentic natural features'],
  [/no plastic or airbrushed appearance/gi, 'natural and authentic'],
  [/realistic skin texture/gi, 'healthy natural skin'],
  [/sheer lace bodysuit/gi, 'fitted editorial bodysuit'],
  [/lace bodysuit/gi, 'fitted bodysuit'],
  [/\bsheer\b/gi, 'lightweight'],
  [/lingerie set[^.)]*/gi, 'editorial fashion set'],
  [/\blingerie\b/gi, 'editorial fashion'],
  [/silk robe[^.)]*/gi, 'silk wrap outfit'],
  [/body confidence/gi, 'editorial presence'],
  [/tasteful editorial boudoir/gi, 'styled editorial'],
];

export function sanitizeForOpenAI(prompt) {
  let safe = prompt;
  for (const [pattern, replacement] of OPENAI_REPLACEMENTS) safe = safe.replace(pattern, replacement);
  return safe;
}

async function readSSE(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6).trim();
      if (!raw || raw === '[DONE]') continue;
      try {
        const event = JSON.parse(raw);
        if (event.msg === 'process_completed') {
          if (event.output?.error) throw new Error(event.output.error);
          return event.output?.data ?? [];
        }
      } catch (e) {
        if (e.message && !e.message.startsWith('Unexpected token')) throw e;
      }
    }
  }
  throw new Error('Stream ended without completion');
}

const ENDPOINT_TIMEOUT_MS = 180000;
const IMAGE_GENERATION_TIMEOUT_MS = 360000;
const REFERENCE_SET_TIMEOUT_MS = 900000;
const QUICK_SHOOT_POLL_INTERVAL_MS = 2500;
const QUICK_SHOOT_POLL_TIMEOUT_MS = 5 * 60 * 1000;

export async function withEndpointTimeout(task, timeoutMs = ENDPOINT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await task(controller.signal);
  } catch (e) {
    if (controller.signal.aborted || e.name === 'AbortError') {
      throw new Error(`Timed out after ${Math.round(timeoutMs / 1000)}s — the generation backend didn’t respond. It may be overloaded; try again.`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

async function callNamedEndpoint(apiName, data, timeoutMs = ENDPOINT_TIMEOUT_MS, telemetryRequestKey) {
  requireLocalStudioService();
  const telemetry = await startUsageTelemetry(apiName, data, telemetryRequestKey);
  try {
    const result = await withEndpointTimeout(async signal => {
      const res = await fetch(`${BASE}/run/${apiName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, session_hash: SESSION_HASH }),
        signal,
      });
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        return contentType.includes('text/event-stream') ? await readSSE(res) : (await res.json()).data;
      }
      const callRes = await fetch(`${BASE}/call/${apiName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
        signal,
      });
      if (!callRes.ok) {
        let detail = '';
        try { detail = await callRes.text(); } catch {}
        throw new Error(`HTTP ${callRes.status}: ${detail.slice(0, 300)}`);
      }
      const { event_id } = await callRes.json();
      if (!event_id) throw new Error('Generation backend did not return an event id.');
      const pollRes = await fetch(`${BASE}/call/${apiName}/${event_id}`, { signal });
      if (!pollRes.ok) throw new Error(`HTTP ${pollRes.status}`);
      return await readSSE(pollRes);
    }, timeoutMs);
    await finishUsageTelemetry(telemetry, result);
    return result;
  } catch (error) {
    try { await finishUsageTelemetry(telemetry, null, error); }
    catch (auditError) { throw new Error(`${error.message} Usage audit also failed: ${auditError.message}`); }
    throw error;
  }
}

const ENGINE_KEYWORDS = ['Draft', 'DreamShaper', 'Portrait', 'Beauty', 'Campaign', 'Shot', 'Still', 'FLUX', 'OpenAI', 'Replicate', 'Cloud'];

export async function fetchEngineChoices() {
  if (!isLocalStudioServiceEnabled()) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(GRADIO_CONFIG_URL, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const config = await res.json();
    const components = config.components || [];
    for (const comp of components) {
      const props = comp.props || {};
      if (props.label === 'Creative Engine' && Array.isArray(props.choices) && props.choices.length) return props.choices.map(c => (Array.isArray(c) ? c[0] : c));
    }
    for (const comp of components) {
      const choices = comp.props?.choices;
      if (!Array.isArray(choices) || choices.length < 3) continue;
      const vals = choices.map(c => (Array.isArray(c) ? c[0] : String(c)));
      if (vals.filter(v => ENGINE_KEYWORDS.some(kw => v.includes(kw))).length >= 2) return vals;
    }
  } catch (e) { console.warn('fetchEngineChoices:', e?.message); }
  return null;
}

export async function buildDirectorOutputs({ vision = '', contentType = '', mood = '', outputGoal = '', character = 'None', scene = 'None', useIdentityLock = false } = {}) {
  const data = await callNamedEndpoint('build_director_outputs', [vision, contentType, mood, outputGoal, character || 'None', scene || 'None', useIdentityLock]);
  return { positivePrompt: data[0] || '', negativePrompt: data[1] || '', recommendedEngine: data[2] || '', reason: data[3] || '' };
}

function relativizeUrl(url) {
  if (!url || url.startsWith('data:')) return url;
  return url.replace(/^https?:\/\/127\.0\.0\.1:\d+\/gradio_api/, '/gradio_api');
}

function normalizeGenerationReferences(references = []) {
  return references
    .filter(reference => reference?.dataUrl)
    .map(reference => ({
      dataUrl: reference.dataUrl,
      role: reference.role || 'supporting',
      name: reference.name || 'Reference',
    }));
}

export async function characterGenerate({
  engineId,
  positivePrompt,
  negativePrompt,
  characterImage,
  anchorImages = [],
  anchorReferences = [],
  mode = 'lifestyle',
  imageSize = 'Vertical 9:16',
  batchSize = 1,
  creatorId = null,
  fashionSafetyMode = 'auto',
  requestKey = null,
}) {
  const structuredReferences = normalizeGenerationReferences(anchorReferences)
    .slice(0, characterImage || creatorId ? 3 : 4);
  const referenceImages = structuredReferences.length
    ? structuredReferences.map(reference => reference.dataUrl)
    : anchorImages;

  if (hasSupabaseConfig()) {
    const data = await invokeCloudFunction('cast-quick-shoot', {
      creatorId,
      prompt: positivePrompt,
      negativePrompt,
      characterImage,
      anchorImages: structuredReferences.length ? undefined : anchorImages,
      anchorReferences: structuredReferences.length
        ? structuredReferences.map(reference => ({
            image: reference.dataUrl,
            role: reference.role,
            name: reference.name,
          }))
        : undefined,
      batchSize,
      imageSize,
      fashionSafetyMode,
      shootMode: mode,
    }, requestKey || crypto.randomUUID());
    if (data.status === 'succeeded') {
      const images = await signCastAssets('generation-assets', data.assets);
      return { status: 'succeeded', images, summary: data.summary || '' };
    }
    if (data.status === 'failed' || data.status === 'cancelled') throw new Error(data.error || 'Generation failed.');
    const submission = { status: 'pending', jobId: data.jobId, images: [] };
    // Ad-hoc Director/Prompt-Lab reference edits do not have a saved creator
    // UUID to resume from another screen, so resolve their durable job here.
    // Saved Cast Quick Shoot keeps the existing pending-return contract.
    return creatorId ? submission : awaitCastQuickShootResult(submission);
  }

  const localReferenceBlock = structuredReferences.length
    ? referencePromptBlock(structuredReferences, { startsAfterIdentity: Boolean(characterImage) })
    : '';
  const localPositivePrompt = localReferenceBlock
    ? `${positivePrompt}\n\n${localReferenceBlock}`
    : positivePrompt;
  const raw = await callNamedEndpoint('character_generate', [JSON.stringify({
    engineId,
    positivePrompt: localPositivePrompt,
    negativePrompt,
    imageSize,
    batchSize,
    anchorImages: referenceImages,
    mode,
  }), characterImage], IMAGE_GENERATION_TIMEOUT_MS);
  const parsed = typeof raw[0] === 'string' ? JSON.parse(raw[0] || '{}') : (raw[0] || {});
  if (parsed.error) throw new Error(parsed.error);
  parsed.images = (parsed.images || []).map(url => url.startsWith('data:') ? url : relativizeUrl(url));
  parsed.status = 'succeeded';
  return parsed;
}

export async function pollCastQuickShootStatus(jobId) {
  const { data, error } = await getSupabase().functions.invoke('cast-quick-shoot-status', { body: { jobId } });
  if (error) throw new Error(error.message || 'cast-quick-shoot-status failed.');
  if (data.status === 'succeeded') {
    const images = await signCastAssets('generation-assets', data.assets);
    return { status: 'succeeded', images, summary: data.summary || '' };
  }
  if (data.status === 'failed' || data.status === 'cancelled') {
    return { status: 'failed', error: data.error || 'Image generation failed. The provider did not return a specific reason.', errorCategory: data.errorCategory || 'unknown' };
  }
  return { status: 'pending' };
}

async function awaitCastQuickShootResult(submission, timeoutMs = QUICK_SHOOT_POLL_TIMEOUT_MS) {
  if (submission?.status === 'succeeded') return submission;
  if (submission?.status !== 'pending' || !submission.jobId) throw new Error('Generation did not return a valid job.');
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, QUICK_SHOOT_POLL_INTERVAL_MS));
    const status = await pollCastQuickShootStatus(submission.jobId);
    if (status.status === 'succeeded') return status;
    if (status.status === 'failed') {
      const error = new Error(status.error || 'Generation failed.');
      error.category = status.errorCategory || 'unknown';
      throw error;
    }
  }
  throw new Error('Generation is still processing after five minutes. The job was preserved; check History/Jobs before submitting it again.');
}

export async function preflightCastReferences(references, creatorId = null) {
  return invokeCloudFunction('cast-reference-preflight', { creatorId, references });
}

export async function castQuickShootPlain({ positivePrompt, negativePrompt, batchSize = 1, creatorId = null, imageSize = 'Vertical 9:16', fashionSafetyMode = 'auto', requestKey = null } = {}) {
  const data = await invokeCloudFunction('cast-quick-shoot', {
    creatorId,
    prompt: positivePrompt,
    negativePrompt,
    characterImage: null,
    batchSize,
    imageSize,
    fashionSafetyMode,
  }, requestKey || crypto.randomUUID());
  if (data.status === 'pending') return awaitCastQuickShootResult({ status: 'pending', jobId: data.jobId });
  if (data.status === 'failed' || data.status === 'cancelled') throw new Error(data.error || 'Generation failed.');
  const images = await signCastAssets('generation-assets', data.assets);
  return { status: 'succeeded', images, summary: data.summary || '' };
}

export async function analyzeCharacterImage(imageDataUrl) {
  const raw = await callNamedEndpoint('analyze_character', [imageDataUrl]);
  const parsed = typeof raw[0] === 'string' ? JSON.parse(raw[0] || '{}') : (raw[0] || {});
  if (parsed.error) throw new Error(parsed.error);
  return parsed;
}

export async function analyzeCharacterReferences(imageDataUrls, { creatorId = null } = {}) {
  const references = (imageDataUrls || []).slice(0, 5).map((image, index) => ({ role: index === 0 ? 'identity' : 'supporting', image }));
  if (!creatorId && !references.length) throw new Error('Add at least one creator reference.');
  let parsed;
  let faceAnchor = '';
  if (hasSupabaseConfig()) {
    const data = await invokeCloudFunction('cast-analyze-references', creatorId ? { creatorId } : { references });
    parsed = { ...data.profile };
    faceAnchor = typeof data.identityAnchor === 'string' ? data.identityAnchor : '';
  } else {
    const raw = await callNamedEndpoint('analyze_character', [JSON.stringify({ version: 2, references })]);
    parsed = typeof raw[0] === 'string' ? JSON.parse(raw[0] || '{}') : (raw[0] || {});
    if (parsed.error) throw new Error(parsed.error);
  }
  if (references.length < 3) parsed.wardrobe = '';
  if (references.length < 2) { parsed.body = ''; parsed.personality = ''; parsed.niche = ''; }
  if (![parsed.face, parsed.hair, parsed.tone].some(value => typeof value === 'string' && value.trim())) {
    throw new Error('The analysis finished but could not read the creator’s identity. Check that the first image clearly shows their face, then try again.');
  }
  parsed.faceAnchor = faceAnchor;
  return parsed;
}

export async function generateCharacterSeed(params) {
  const raw = await callNamedEndpoint('character_seed_generate', [JSON.stringify(params)], IMAGE_GENERATION_TIMEOUT_MS);
  const parsed = typeof raw[0] === 'string' ? JSON.parse(raw[0]) : raw[0];
  if (parsed.error) throw new Error(parsed.error);
  parsed.image = relativizeUrl(parsed.image);
  return parsed;
}

export async function generateReferenceSet({ characterDesc, count, creatorId = null } = {}) {
  if (hasSupabaseConfig()) {
    if (!creatorId) throw new Error('Save this creator before building a reference set.');
    const data = await invokeCloudFunction('cast-generate-reference-set', { creatorId, characterDescription: characterDesc, count });
    const images = await signCastAssets('creator-references', data.references);
    return { images, ...data };
  }
  const raw = await callNamedEndpoint('generate_reference_set', [JSON.stringify({ characterDesc, count })], REFERENCE_SET_TIMEOUT_MS);
  const parsed = typeof raw[0] === 'string' ? JSON.parse(raw[0]) : raw[0];
  if (parsed.error) throw new Error(parsed.error);
  return parsed;
}

export async function generateCharacterVariationShot(params) {
  const raw = await callNamedEndpoint('character_variation_shot', [JSON.stringify(params)], IMAGE_GENERATION_TIMEOUT_MS);
  const parsed = typeof raw[0] === 'string' ? JSON.parse(raw[0]) : raw[0];
  if (parsed.error) throw new Error(parsed.error);
  parsed.image = relativizeUrl(parsed.image);
  return parsed;
}

export async function parseCreatorCorrection(text, gender) {
  const raw = await callNamedEndpoint('parse_creator_correction', [JSON.stringify({ text, gender })]);
  const parsed = typeof raw[0] === 'string' ? JSON.parse(raw[0]) : raw[0];
  if (parsed.error) throw new Error(parsed.error);
  return parsed;
}

export async function describeOutfitImage(imageDataUrl) {
  const raw = await callNamedEndpoint('outfit_describe', [imageDataUrl]);
  const parsed = typeof raw[0] === 'string' ? JSON.parse(raw[0]) : raw[0];
  if (parsed.error) throw new Error(parsed.error);
  return parsed.outfitDescription || '';
}

export async function extractFaceAnchor(imageDataUrl) {
  if (hasSupabaseConfig()) return '';
  const raw = await callNamedEndpoint('face_anchor_extract', [imageDataUrl]);
  const parsed = typeof raw[0] === 'string' ? JSON.parse(raw[0] || '{}') : (raw[0] || {});
  if (parsed.error) throw new Error(parsed.error);
  return parsed.faceAnchor || '';
}

export async function saveApiKey(key) {
  const raw = await callNamedEndpoint('save_api_key', [key]);
  const parsed = typeof raw[0] === 'string' ? JSON.parse(raw[0]) : raw[0];
  if (parsed.error) throw new Error(parsed.error);
  return parsed;
}
export async function saveGeminiKey(key) {
  const raw = await callNamedEndpoint('save_gemini_key', [key]);
  const parsed = typeof raw[0] === 'string' ? JSON.parse(raw[0]) : raw[0];
  if (parsed.error) throw new Error(parsed.error);
  return parsed;
}
export async function saveReplicateKey(key) {
  const raw = await callNamedEndpoint('save_replicate_key', [key]);
  const parsed = typeof raw[0] === 'string' ? JSON.parse(raw[0]) : raw[0];
  if (parsed.error) throw new Error(parsed.error);
  return parsed;
}
export async function saveFalKey(key) {
  const raw = await callNamedEndpoint('save_fal_key', [key]);
  const parsed = typeof raw[0] === 'string' ? JSON.parse(raw[0]) : raw[0];
  if (parsed.error) throw new Error(parsed.error);
  return parsed;
}

export async function fetchApiKeyStatus() {
  if (!isLocalStudioServiceEnabled()) return {};
  try {
    const raw = await callNamedEndpoint('api_key_status', ['']);
    const parsed = typeof raw[0] === 'string' ? JSON.parse(raw[0]) : raw[0];
    return parsed && !parsed.error ? parsed : {};
  } catch { return {}; }
}

export async function generateImage({
  engine = '', performanceMode = 'Balanced', comfyServerUrl = 'http://127.0.0.1:8188', comfyWorkflowPath = '',
  imageStyle = 'Lifestyle Creator', positivePrompt = '', negativePrompt = '', imageSize = 'Vertical 9:16',
  quality = 'High', batchSize = 1, seed = -1, cfg = 7, steps = 20, width = 832, height = 1216,
} = {}) {
  if (hasSupabaseConfig()) return castQuickShootPlain({ positivePrompt, negativePrompt, batchSize, imageSize });
  const data = await callNamedEndpoint('generate_image', [
    engine, performanceMode, comfyServerUrl, comfyWorkflowPath, imageStyle, positivePrompt, negativePrompt,
    imageSize, quality, batchSize, seed, cfg, steps, width, height,
  ], IMAGE_GENERATION_TIMEOUT_MS);
  const gallery = data[0] || [];
  const images = gallery.map(item => {
    let url = typeof item === 'string' ? item : (item?.url || item?.image?.url || '');
    url = url.replace(/^https?:\/\/127\.0\.0\.1:7860\/gradio_api/, '/gradio_api');
    url = url.replace(/^https?:\/\/127\.0\.0\.1:7860/, '/gradio_api');
    return url;
  }).filter(Boolean);
  return { images, status: data[1] || '' };
}

export async function sceneFlowChat({ messagesJson = '[]', userMessage = '', referenceImages = [], refImageB64 = '' } = {}) {
  const references = referenceImages.length ? serializeDirectorReferences(referenceImages) : refImageB64;
  if (hasSupabaseConfig()) return invokeCloudFunction('director-scene-flow-chat', { messagesJson, userMessage, references });
  const raw = await callNamedEndpoint('scene_flow_chat', [messagesJson, userMessage, references]);
  return typeof raw[0] === 'string' ? JSON.parse(raw[0]) : raw[0];
}

export async function sceneFlowGenerate({ sceneJson = '{}', referenceImages = [], refImageB64 = '', telemetryRequestKey, creatorId = null } = {}) {
  const references = referenceImages.length ? referenceImages.slice(0, 4) : [];
  if (hasSupabaseConfig()) {
    const scene = typeof sceneJson === 'string' ? JSON.parse(sceneJson || '{}') : (sceneJson || {});
    const contentType = scene.content_type || 'photo';
    if (contentType === 'video') throw new Error('Cloud video generation is not enabled in Scene Flow yet. Photo generation is available.');
    const positivePrompt = scene.full_prompt || [scene.setting, scene.wardrobe, scene.location, scene.vibe].filter(Boolean).join('. ');
    if (!positivePrompt.trim()) throw new Error('Scene Flow has no generation prompt yet.');
    const identity = references.find(reference => reference.role === 'identity' && reference.dataUrl);
    if (identity) {
      const completed = await characterGenerate({
        creatorId,
        mode: 'lifestyle',
        positivePrompt,
        negativePrompt: '',
        characterImage: identity.dataUrl,
        anchorReferences: references.filter(reference => reference !== identity && reference.dataUrl),
        imageSize: scene.imageSize || scene.aspect || scene.aspect_ratio || 'Vertical 9:16',
        batchSize: 1,
        requestKey: telemetryRequestKey || crypto.randomUUID(),
      });
      const resolved = await awaitCastQuickShootResult(completed);
      return { result_url: resolved.images?.[0] || null, content_type: 'photo', status: 'succeeded' };
    }
    const completed = await castQuickShootPlain({
      positivePrompt,
      negativePrompt: '',
      batchSize: 1,
      imageSize: scene.imageSize || scene.aspect || scene.aspect_ratio || 'Vertical 9:16',
      requestKey: telemetryRequestKey || crypto.randomUUID(),
    });
    return { result_url: completed.images?.[0] || null, content_type: 'photo', status: 'succeeded' };
  }

  const serialized = referenceImages.length ? serializeDirectorReferences(referenceImages) : refImageB64;
  const raw = await callNamedEndpoint('scene_flow_generate', [sceneJson, serialized], IMAGE_GENERATION_TIMEOUT_MS, telemetryRequestKey);
  if (raw.length > 1) {
    const image = raw[0];
    const parsed = typeof raw[1] === 'string' ? JSON.parse(raw[1]) : (raw[1] || {});
    let resultUrl = typeof image === 'string' ? image : (image?.url || image?.path || '');
    resultUrl = resultUrl.replace(/^https?:\/\/127\.0\.0\.1:7860\/gradio_api/, '/gradio_api');
    resultUrl = resultUrl.replace(/^https?:\/\/127\.0\.0\.1:7860/, '/gradio_api');
    return resultUrl ? { ...parsed, result_url: resultUrl } : parsed;
  }
  return typeof raw[0] === 'string' ? JSON.parse(raw[0]) : raw[0];
}

export async function promptLabBuild(request) {
  if (hasSupabaseConfig()) return invokeCloudFunction('director-prompt-lab', request);
  const raw = await callNamedEndpoint('prompt_lab_build', [JSON.stringify(request)]);
  const parsed = typeof raw[0] === 'string' ? JSON.parse(raw[0]) : raw[0];
  if (parsed.error) throw new Error(parsed.error);
  return parsed;
}
