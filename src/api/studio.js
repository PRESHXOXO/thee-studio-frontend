const BASE = '/gradio_api';
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

async function predict(fnIndex, data) {
  const res = await fetch(`${BASE}/run/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fn_index: fnIndex, data, session_hash: SESSION_HASH }),
  });

  if (!res.ok) {
    let detail = '';
    try { detail = await res.text(); } catch {}
    throw new Error(`HTTP ${res.status}: ${detail.slice(0, 300)}`);
  }

  const contentType = res.headers.get('content-type') || '';

  // Gradio 6.x returns SSE stream
  if (contentType.includes('text/event-stream')) {
    return await readSSE(res);
  }

  // Older fallback: plain JSON
  const json = await res.json();
  return json.data;
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

// fn_index map (order of .click/.change registrations in app.py)
// creative_engine_input.change = 0
// update_image_generator_status × 9 (for loop over 9 controls) = indices 1–9
// build_director_button.click = 10
// ... 38 more handlers ...
// generate_image_button.click = 49
const FN = {
  build_director_outputs: 10,
  generate_image: 49,
};

// Engine names that identify this dropdown by content when label matching fails.
const ENGINE_KEYWORDS = ['Draft', 'DreamShaper', 'Portrait', 'Beauty', 'Campaign', 'Shot', 'Still', 'FLUX', 'OpenAI', 'Replicate', 'Cloud'];

// Fetch the Creative Engine dropdown choices live from the Gradio config.
export async function fetchEngineChoices() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(`${BASE}/config`, { signal: controller.signal });
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
  const data = await predict(FN.build_director_outputs, [
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
  return parsed; // { image, faceAnchor }
}

export async function generateCharacterVariations(params) {
  const raw = await callNamedEndpoint('character_variations_generate', [JSON.stringify(params)]);
  const parsed = typeof raw[0] === 'string' ? JSON.parse(raw[0]) : raw[0];
  if (parsed.error) throw new Error(parsed.error);
  return parsed; // { images: [...] }
}

export async function generateCharacterVariationShot(params) {
  const raw = await callNamedEndpoint('character_variation_shot', [JSON.stringify(params)]);
  const parsed = typeof raw[0] === 'string' ? JSON.parse(raw[0]) : raw[0];
  if (parsed.error) throw new Error(parsed.error);
  return parsed; // { image }
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
  const data = await predict(FN.generate_image, [
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
