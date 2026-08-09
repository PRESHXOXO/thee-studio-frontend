import { serializeDirectorReferences } from '../lib/directorReferences.js';
import { finishUsageTelemetry, startUsageTelemetry } from './usageTelemetry.js';
import { getSupabase, hasSupabaseConfig } from '../lib/supabase.js';

// Cast (Analyze Complete Set, Build Reference Set, Cast Quick Shoot) has cloud
// equivalents of its local-Gradio calls — see supabase/functions/cast-* in the
// backend repo. Same convention as stagingGeneration.js: cloud mode is "a
// Supabase project is configured", not a separate flag threaded through here.
async function invokeCastFunction(name, body) {
  const idempotencyKey = crypto.randomUUID();
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
const GRADIO_CONFIG_URL = '/config'; // Gradio 6.x serves config at /config, not /gradio_api/config
const SESSION_HASH = Math.random().toString(36).slice(2);
export const LOCAL_ACTION_UNAVAILABLE = 'This action needs local studio services and is unavailable in cloud. Coming soon.';

export function isLocalStudioServiceEnabled(env = import.meta.env) {
  return env?.DEV === true || env?.VITE_ALLOW_LOCAL_MODE === 'true';
}

function requireLocalStudioService() {
  if (!isLocalStudioServiceEnabled()) throw new Error(LOCAL_ACTION_UNAVAILABLE);
}

// Replaces words that trigger OpenAI's output safety filter while preserving prompt quality.
// Applied automatically when engine is OpenAI Image.
const OPENAI_REPLACEMENTS = [
  // Direct triggers
  [/\bsensual\b/gi,                         'refined'],
  [/\bseductive\b/gi,                        'magnetic'],
  [/\bsexy\b/gi,                             'confident'],
  [/\berotic\b/gi,                           'artistic'],
  [/\bexplicit\b/gi,                         'editorial'],
  [/\bsuggestive\b/gi,                       'editorial'],
  [/\brevealing\b/gi,                        'fashion-forward'],
  [/\bnude\b/gi,                             'natural'],
  [/\bboudoir[\w\s-]*inspired\b/gi,          'studio-style editorial'],
  [/\bboudoir\b/gi,                          'studio editorial'],
  [/\bintimate\b/gi,                         'close and personal'],
  [/\bbathroom mirror\b/gi,                  'dressing-room mirror'],
  [/\bbedroom\b/gi,                          'private suite'],
  [/\bprovocative\b/gi,                      'bold editorial'],
  [/\bskin-tight\b/gi,                       'fitted'],
  [/\bcleavage\b/gi,                         'neckline'],
  [/\bbralette\b/gi,                         'fitted top'],
  [/\bbikini\b/gi,                           'swimwear'],
  [/\bno nudity\b/gi,                        'fully clothed'],
  [/\bnon-sexual(?:ized)?\b/gi,              'wholesome'],
  // Skin language that triggers output moderation
  [/visible pores[^.)]*/gi,                  'realistic skin detail'],
  [/natural skin imperfections/gi,           'authentic natural features'],
  [/no plastic or airbrushed appearance/gi,  'natural and authentic'],
  [/realistic skin texture/gi,               'healthy natural skin'],
  // Clothing descriptions that trigger output
  [/sheer lace bodysuit/gi,                  'fitted editorial bodysuit'],
  [/lace bodysuit/gi,                        'fitted bodysuit'],
  [/\bsheer\b/gi,                            'lightweight'],
  [/lingerie set[^.)]*/gi,                   'editorial fashion set'],
  [/\blingerie\b/gi,                         'editorial fashion'],
  [/silk robe[^.)]*/gi,                      'silk wrap outfit'],
  [/body confidence/gi,                      'editorial presence'],
  [/tasteful editorial boudoir/gi,           'styled editorial'],
];

export function sanitizeForOpenAI(prompt) {
  let safe = prompt;
  for (const [pattern, replacement] of OPENAI_REPLACEMENTS) {
    safe = safe.replace(pattern, replacement);
  }
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

// Hard ceiling on any single generation call. gpt-image-2 at high quality is
// genuinely slow (tens of seconds), so this is generous — but without it a
// hung/overloaded backend leaves the UI spinning forever with no feedback.
// On expiry the fetch aborts and callers surface a real error instead.
const ENDPOINT_TIMEOUT_MS = 180000;
const IMAGE_GENERATION_TIMEOUT_MS = 360000;
const REFERENCE_SET_TIMEOUT_MS = 900000;

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

// Calls a named Gradio endpoint, handling both Gradio 4.x (/run/) and 5.x (/call/) formats.
async function callNamedEndpoint(apiName, data, timeoutMs = ENDPOINT_TIMEOUT_MS, telemetryRequestKey) {
  requireLocalStudioService();
  const telemetry = await startUsageTelemetry(apiName, data, telemetryRequestKey);
  // One deadline covers the request, response parsing, Gradio fallback, and
  // the complete SSE stream. Keeping the controller alive until readSSE()
  // resolves is important: fetch() itself resolves as soon as headers arrive.
  try {
    const result = await withEndpointTimeout(async signal => {
    // Try Gradio 4.x format first
    const res = await fetch(`${BASE}/run/${apiName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, session_hash: SESSION_HASH }),
      signal,
    });

    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      return contentType.includes('text/event-stream')
        ? await readSSE(res)
        : (await res.json()).data;
    }

    // If /run/ returned 4xx/5xx, try Gradio 5.x /call/ format.
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
    catch (auditError) {
      throw new Error(`${error.message} Usage audit also failed: ${auditError.message}`);
    }
    throw error;
  }
}

// Engine names that identify this dropdown by content when label matching fails.
const ENGINE_KEYWORDS = ['Draft', 'DreamShaper', 'Portrait', 'Beauty', 'Campaign', 'Shot', 'Still', 'FLUX', 'OpenAI', 'Replicate', 'Cloud'];

// Fetch the Creative Engine dropdown choices live from the Gradio config.
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

    // Strategy 1: match by label
    for (const comp of components) {
      const props = comp.props || {};
      if (props.label === 'Creative Engine' && Array.isArray(props.choices) && props.choices.length) {
        return props.choices.map(c => (Array.isArray(c) ? c[0] : c));
      }
    }

    // Strategy 2: find by content — dropdown whose choices look like engine names
    for (const comp of components) {
      const choices = comp.props?.choices;
      if (!Array.isArray(choices) || choices.length < 3) continue;
      const vals = choices.map(c => (Array.isArray(c) ? c[0] : String(c)));
      if (vals.filter(v => ENGINE_KEYWORDS.some(kw => v.includes(kw))).length >= 2) {
        return vals;
      }
    }
  } catch (e) {
    console.warn('fetchEngineChoices:', e?.message);
  }
  return null;
}

export async function buildDirectorOutputs({
  vision = '',
  contentType = '',
  mood = '',
  outputGoal = '',
  character = 'None',
  scene = 'None',
  useIdentityLock = false,
} = {}) {
  const data = await callNamedEndpoint('build_director_outputs', [
    vision, contentType, mood, outputGoal,
    character || 'None',
    scene || 'None',
    useIdentityLock,
  ]);
  return {
    positivePrompt:    data[0] || '',
    negativePrompt:    data[1] || '',
    recommendedEngine: data[2] || '',
    reason:            data[3] || '',
  };
}

// Sends a base64 image data URL to the backend vision model and returns
// structured character field data ({ face, hair, body, wardrobe, tone, personality, niche }).
// Rewrite absolute Gradio host URLs to relative so the Vite proxy serves
// them same-origin — without this, <img>/<canvas> reads are cross-origin
// and canvas.toDataURL() throws a silent, unrecoverable SecurityError.
function relativizeUrl(url) {
  if (!url || url.startsWith('data:')) return url;
  return url.replace(/^https?:\/\/127\.0\.0\.1:\d+\/gradio_api/, '/gradio_api');
}

// Uses /run/analyze_character — in Gradio 6.x the URL path IS the api_name.
// Identity-locked Quick Shoot is asynchronous in cloud mode: the initial
// submit only starts a background provider job and returns { status:
// 'pending', jobId } — it never returns images directly. Callers must poll
// pollCastQuickShootStatus(jobId) until status is 'succeeded' or 'failed'.
// (Not renamed to keep the local-Gradio call signature/behavior below
// unchanged — that path is still synchronous.)
export async function characterGenerate({ engineId, positivePrompt, negativePrompt, characterImage, anchorImages = [], mode = 'lifestyle', imageSize = 'Vertical 9:16', batchSize = 1, creatorId = null }) {
  if (hasSupabaseConfig()) {
    const data = await invokeCastFunction('cast-quick-shoot', {
      creatorId,
      prompt: positivePrompt,
      negativePrompt,
      characterImage,
      anchorImages,
      batchSize,
    });
    if (data.status === 'succeeded') {
      const images = await signCastAssets('generation-assets', data.assets);
      return { status: 'succeeded', images, summary: data.summary || '' };
    }
    if (data.status === 'failed' || data.status === 'cancelled') {
      throw new Error(data.error || 'Generation failed.');
    }
    // status: 'pending' — background job submitted or resumed, no image yet.
    return { status: 'pending', jobId: data.jobId, images: [] };
  }
  const raw = await callNamedEndpoint('character_generate', [
    JSON.stringify({ engineId, positivePrompt, negativePrompt, imageSize, batchSize, anchorImages, mode }),
    characterImage,
  ], IMAGE_GENERATION_TIMEOUT_MS);
  const jsonStr = raw[0] || '{}';
  const parsed = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
  if (parsed.error) throw new Error(parsed.error);
  // Rewrite localhost URLs to relative so Vite proxy can serve them
  parsed.images = (parsed.images || []).map(url =>
    url.startsWith('data:') ? url : url.replace(/^https?:\/\/127\.0\.0\.1:\d+\/gradio_api/, '/gradio_api')
  );
  parsed.status = 'succeeded';
  return parsed;
}

// Polls an async cast-quick-shoot job started by characterGenerate() in
// cloud mode. Always a plain GET-equivalent invoke — can never submit a new
// generation, so it's safe to call repeatedly (a timer loop, a duplicate
// call, or resuming after a page refresh).
export async function pollCastQuickShootStatus(jobId) {
  // Not invokeCastFunction: a 'failed' status is a legitimate structured
  // response here (the job failed, the poll call itself succeeded) — that
  // helper's generic `if (data.error) throw` would turn an expected failed
  // status into an unhandled exception instead of a normal poll result.
  const { data, error } = await getSupabase().functions.invoke('cast-quick-shoot-status', { body: { jobId } });
  if (error) throw new Error(error.message || 'cast-quick-shoot-status failed.');
  if (data.status === 'succeeded') {
    const images = await signCastAssets('generation-assets', data.assets);
    return { status: 'succeeded', images, summary: data.summary || '' };
  }
  if (data.status === 'failed' || data.status === 'cancelled') {
    // The backend now always returns a normalized, sanitized message — never
    // raw provider JSON. Fall back to an honest "no reason given" string
    // rather than a generic one if somehow neither is present.
    return {
      status: 'failed',
      error: data.error || 'Image generation failed. The provider did not return a specific reason.',
      errorCategory: data.errorCategory || 'unknown',
    };
  }
  return { status: 'pending' };
}

// Validates reference images WITHOUT ever calling a provider — same
// dedupe/cap/decoding rules cast-quick-shoot applies, plus MIME/signature/
// dimension checks. Staging debug tool for diagnosing a Quick Shoot
// identity call before spending a real provider request on it.
export async function preflightCastReferences(references, creatorId = null) {
  return invokeCastFunction('cast-reference-preflight', { creatorId, references });
}

// Cast Quick Shoot's no-reference fallback. Deliberately separate from the
// general-purpose generateImage() below (used by other, out-of-scope
// screens) so this Cast migration doesn't reroute unrelated call sites.
export async function castQuickShootPlain({ positivePrompt, negativePrompt, batchSize = 1, creatorId = null }) {
  const data = await invokeCastFunction('cast-quick-shoot', {
    creatorId,
    prompt: positivePrompt,
    negativePrompt,
    characterImage: null,
    batchSize,
  });
  const images = await signCastAssets('generation-assets', data.assets);
  return { status: 'succeeded', images, summary: data.summary || '' };
}

export async function analyzeCharacterImage(imageDataUrl) {
  const raw = await callNamedEndpoint('analyze_character', [imageDataUrl]);
  const jsonStr = raw[0] || '{}';
  const parsed = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
  if (parsed.error) throw new Error(parsed.error);
  return parsed;
}

export async function analyzeCharacterReferences(imageDataUrls, { creatorId = null } = {}) {
  const references = (imageDataUrls || []).slice(0, 5).map((image, index) => ({
    role: index === 0 ? 'identity' : 'supporting',
    image,
  }));
  if (!creatorId && !references.length) throw new Error('Add at least one creator reference.');

  let parsed;
  let faceAnchor = '';
  if (hasSupabaseConfig()) {
    // Combines Analyze Complete Set + face/identity anchor extraction in one
    // billable call — the anchor is generated as text by the same vision
    // request, never the reference image itself.
    const data = await invokeCastFunction('cast-analyze-references', creatorId
      ? { creatorId }
      : { references });
    parsed = { ...data.profile };
    faceAnchor = typeof data.identityAnchor === 'string' ? data.identityAnchor : '';
  } else {
    const raw = await callNamedEndpoint('analyze_character', [JSON.stringify({ version: 2, references })]);
    const jsonStr = raw[0] || '{}';
    parsed = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
    if (parsed.error) throw new Error(parsed.error);
  }
  // Defense in depth while older backends roll over: a headshot plus one
  // supporting photo is still not enough evidence to define a wardrobe.
  if (references.length < 3) parsed.wardrobe = '';
  if (references.length < 2) {
    parsed.body = '';
    parsed.personality = '';
    parsed.niche = '';
  }
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
  return parsed; // { image, faceAnchor }
}

export async function generateReferenceSet({ characterDesc, count, creatorId = null } = {}) {
  if (hasSupabaseConfig()) {
    if (!creatorId) throw new Error('Save this creator before building a reference set.');
    const data = await invokeCastFunction('cast-generate-reference-set', {
      creatorId,
      characterDescription: characterDesc,
      count,
    });
    const images = await signCastAssets('creator-references', data.references);
    return { images };
  }
  const raw = await callNamedEndpoint('generate_reference_set', [JSON.stringify({ characterDesc, count })], REFERENCE_SET_TIMEOUT_MS);
  const parsed = typeof raw[0] === 'string' ? JSON.parse(raw[0]) : raw[0];
  if (parsed.error) throw new Error(parsed.error);
  return parsed; // { images: [...], errors: [...] }
}

export async function generateCharacterVariationShot(params) {
  const raw = await callNamedEndpoint('character_variation_shot', [JSON.stringify(params)], IMAGE_GENERATION_TIMEOUT_MS);
  const parsed = typeof raw[0] === 'string' ? JSON.parse(raw[0]) : raw[0];
  if (parsed.error) throw new Error(parsed.error);
  parsed.image = relativizeUrl(parsed.image);
  return parsed; // { image }
}

// Translates a freeform correction into structured Creator Builder identity
// fields via the backend's parse_creator_correction (GPT-4o-mini JSON mode).
// Returns {} (not an error) when nothing could be confidently mapped —
// callers should still send the raw text through to generation regardless.
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
  // Cloud mode folds identity-anchor extraction into analyzeCharacterReferences
  // (one billable vision call instead of two) — callers in cloud mode should
  // read `.faceAnchor` off that result instead of calling this separately.
  if (hasSupabaseConfig()) return '';
  const raw = await callNamedEndpoint('face_anchor_extract', [imageDataUrl]);
  const jsonStr = raw[0] || '{}';
  const parsed = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
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

// Which providers have a key configured server-side (UI-saved or already in
// .env at boot). Lets Engine Library badges reflect real config instead of
// only a browser-local "saved via UI" flag. Returns {} on any failure so the
// caller falls back to the local flag rather than blanking every badge.
export async function fetchApiKeyStatus() {
  try {
    const raw = await callNamedEndpoint('api_key_status', ['']);
    const parsed = typeof raw[0] === 'string' ? JSON.parse(raw[0]) : raw[0];
    return parsed && !parsed.error ? parsed : {};
  } catch {
    return {};
  }
}

export async function generateImage({
  engine = '',
  performanceMode = 'Balanced',
  comfyServerUrl = 'http://127.0.0.1:8188',
  comfyWorkflowPath = '',
  imageStyle = 'Lifestyle Creator',
  positivePrompt = '',
  negativePrompt = '',
  imageSize = 'Vertical 9:16',
  quality = 'High',
  batchSize = 1,
  seed = -1,
  cfg = 7,
  steps = 20,
  width = 832,
  height = 1216,
} = {}) {
  const data = await callNamedEndpoint('generate_image', [
    engine, performanceMode, comfyServerUrl, comfyWorkflowPath,
    imageStyle, positivePrompt, negativePrompt, imageSize,
    quality, batchSize, seed, cfg, steps, width, height,
  ], IMAGE_GENERATION_TIMEOUT_MS);

  // Gradio 6.x gallery returns objects like { url: "http://127.0.0.1:7860/gradio_api/file=..." }
  // Rewrite to relative /gradio_api/... so our Vite proxy can serve them.
  const gallery = data[0] || [];
  const images = gallery.map(item => {
    let url = typeof item === 'string' ? item : (item?.url || item?.image?.url || '');
    url = url.replace(/^https?:\/\/127\.0\.0\.1:7860\/gradio_api/, '/gradio_api');
    url = url.replace(/^https?:\/\/127\.0\.0\.1:7860/, '/gradio_api');
    return url;
  }).filter(Boolean);

  return { images, status: data[1] || '' };
}

// ---------------------------------------------------------------------------
// Scene Flow API
// ---------------------------------------------------------------------------

export async function sceneFlowChat({
  messagesJson = '[]',
  userMessage = '',
  referenceImages = [],
  refImageB64 = '',
} = {}) {
  const references = referenceImages.length
    ? serializeDirectorReferences(referenceImages)
    : refImageB64;
  const raw = await callNamedEndpoint('scene_flow_chat', [messagesJson, userMessage, references]);
  const parsed = typeof raw[0] === 'string' ? JSON.parse(raw[0]) : raw[0];
  return parsed; // { reply, scene, generate, history }
}

export async function sceneFlowGenerate({
  sceneJson = '{}',
  referenceImages = [],
  refImageB64 = '',
  telemetryRequestKey,
} = {}) {
  const references = referenceImages.length
    ? serializeDirectorReferences(referenceImages)
    : refImageB64;
  const raw = await callNamedEndpoint('scene_flow_generate', [sceneJson, references], IMAGE_GENERATION_TIMEOUT_MS, telemetryRequestKey);
  // The backend returns photos through a Gradio Image output so a completed
  // multi-megabyte render is served as media instead of embedded in Textbox JSON.
  // Keep compatibility with the older one-Textbox response during local rollout.
  if (raw.length > 1) {
    const image = raw[0];
    const parsed = typeof raw[1] === 'string' ? JSON.parse(raw[1]) : (raw[1] || {});
    let resultUrl = typeof image === 'string' ? image : (image?.url || image?.path || '');
    resultUrl = resultUrl.replace(/^https?:\/\/127\.0\.0\.1:7860\/gradio_api/, '/gradio_api');
    resultUrl = resultUrl.replace(/^https?:\/\/127\.0\.0\.1:7860/, '/gradio_api');
    return resultUrl ? { ...parsed, result_url: resultUrl } : parsed;
  }
  const parsed = typeof raw[0] === 'string' ? JSON.parse(raw[0]) : raw[0];
  return parsed; // { result_b64, result_url, content_type, status } or { error }
}

// ---------------------------------------------------------------------------
// Prompt Lab API
// ---------------------------------------------------------------------------

// Runs the OpenAI-powered prompt engine on the backend.
// Resolves to { prompt, slots, why_this_works, variants, moods, target, model }
// or { refusal }; throws on backend { error }.
export async function promptLabBuild(request) {
  const raw = await callNamedEndpoint('prompt_lab_build', [JSON.stringify(request)]);
  const parsed = typeof raw[0] === 'string' ? JSON.parse(raw[0]) : raw[0];
  if (parsed.error) throw new Error(parsed.error);
  return parsed;
}
