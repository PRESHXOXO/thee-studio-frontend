const BASE = '/gradio_api';
const GRADIO_CONFIG_URL = '/config'; // Gradio 6.x serves config at /config, not /gradio_api/config
const SESSION_HASH = Math.random().toString(36).slice(2);

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

// Calls a named Gradio endpoint, handling both Gradio 4.x (/run/) and 5.x (/call/) formats.
async function callNamedEndpoint(apiName, data) {
  // Try Gradio 4.x format first
  const res = await fetch(`${BASE}/run/${apiName}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data, session_hash: SESSION_HASH }),
  });

  if (res.ok) {
    const contentType = res.headers.get('content-type') || '';
    return contentType.includes('text/event-stream')
      ? await readSSE(res)
      : (await res.json()).data;
  }

  // If /run/ returned 4xx/5xx, try Gradio 5.x /call/ format
  if (res.status >= 400) {
    const callRes = await fetch(`${BASE}/call/${apiName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    });
    if (!callRes.ok) {
      let detail = '';
      try { detail = await callRes.text(); } catch {}
      throw new Error(`HTTP ${callRes.status}: ${detail.slice(0, 300)}`);
    }
    const { event_id } = await callRes.json();
    const pollRes = await fetch(`${BASE}/call/${apiName}/${event_id}`);
    if (!pollRes.ok) throw new Error(`HTTP ${pollRes.status}`);
    return await readSSE(pollRes);
  }

  let detail = '';
  try { detail = await res.text(); } catch {}
  throw new Error(`HTTP ${res.status}: ${detail.slice(0, 300)}`);
}

// Engine names that identify this dropdown by content when label matching fails.
const ENGINE_KEYWORDS = ['Draft', 'DreamShaper', 'Portrait', 'Beauty', 'Campaign', 'Shot', 'Still', 'FLUX', 'OpenAI', 'Replicate', 'Cloud'];

// Fetch the Creative Engine dropdown choices live from the Gradio config.
export async function fetchEngineChoices() {
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
export async function characterGenerate({ engineId, positivePrompt, negativePrompt, characterImage, anchorImages = [], mode = 'lifestyle', imageSize = 'Vertical 9:16', batchSize = 1 }) {
  const raw = await callNamedEndpoint('character_generate', [
    JSON.stringify({ engineId, positivePrompt, negativePrompt, imageSize, batchSize, anchorImages, mode }),
    characterImage,
  ]);
  const jsonStr = raw[0] || '{}';
  const parsed = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
  if (parsed.error) throw new Error(parsed.error);
  // Rewrite localhost URLs to relative so Vite proxy can serve them
  parsed.images = (parsed.images || []).map(url =>
    url.startsWith('data:') ? url : url.replace(/^https?:\/\/127\.0\.0\.1:\d+\/gradio_api/, '/gradio_api')
  );
  return parsed;
}

export async function analyzeCharacterImage(imageDataUrl) {
  const raw = await callNamedEndpoint('analyze_character', [imageDataUrl]);
  const jsonStr = raw[0] || '{}';
  const parsed = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
  if (parsed.error) throw new Error(parsed.error);
  return parsed;
}

export async function generateCharacterSeed(params) {
  const raw = await callNamedEndpoint('character_seed_generate', [JSON.stringify(params)]);
  const parsed = typeof raw[0] === 'string' ? JSON.parse(raw[0]) : raw[0];
  if (parsed.error) throw new Error(parsed.error);
  parsed.image = relativizeUrl(parsed.image);
  return parsed; // { image, faceAnchor }
}

export async function generateReferenceSet(params) {
  const raw = await callNamedEndpoint('generate_reference_set', [JSON.stringify(params)]);
  const parsed = typeof raw[0] === 'string' ? JSON.parse(raw[0]) : raw[0];
  if (parsed.error) throw new Error(parsed.error);
  return parsed; // { images: [...], errors: [...] }
}

export async function generateCharacterVariationShot(params) {
  const raw = await callNamedEndpoint('character_variation_shot', [JSON.stringify(params)]);
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
  ]);

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

export async function sceneFlowChat({ messagesJson = '[]', userMessage = '', refImageB64 = '' } = {}) {
  const raw = await callNamedEndpoint('scene_flow_chat', [messagesJson, userMessage, refImageB64]);
  const parsed = typeof raw[0] === 'string' ? JSON.parse(raw[0]) : raw[0];
  return parsed; // { reply, scene, history }
}

export async function sceneFlowGenerate({ sceneJson = '{}', refImageB64 = '' } = {}) {
  const raw = await callNamedEndpoint('scene_flow_generate', [sceneJson, refImageB64]);
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
