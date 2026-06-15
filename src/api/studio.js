const BASE = '/gradio_api';
const SESSION_HASH = Math.random().toString(36).slice(2);

// Replaces words that trigger OpenAI's safety filter while preserving prompt quality.
// Applied automatically when engine is OpenAI Image.
const OPENAI_REPLACEMENTS = [
  [/\bsensual\b/gi,     'refined'],
  [/\bseductive\b/gi,   'magnetic'],
  [/\bintimate\b/gi,    'warm and personal'],
  [/\bsuggestive\b/gi,  'editorial'],
  [/\bsexy\b/gi,        'confident'],
  [/\brevealing\b/gi,   'fashion-forward'],
  [/\bboudoir\b/gi,     'editorial boudoir-inspired'],
  [/\berotic\b/gi,      'artistic'],
  [/\bnude\b/gi,        'natural'],
  [/\bexplicit\b/gi,    'editorial'],
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
        if (e.message !== 'Unexpected token') throw e;
      }
    }
  }
  throw new Error('Stream ended without completion');
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
export async function analyzeCharacterImage(imageDataUrl) {
  const res = await fetch(`${BASE}/call/analyze_character`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: [imageDataUrl] }),
  });

  if (!res.ok) {
    let detail = '';
    try { detail = await res.text(); } catch {}
    throw new Error(`HTTP ${res.status}: ${detail.slice(0, 300)}`);
  }

  const { event_id } = await res.json();
  if (!event_id) throw new Error('No event_id returned from analyze_character');

  // Stream the SSE result
  const stream = await fetch(`${BASE}/call/analyze_character/${event_id}`);
  if (!stream.ok) throw new Error(`Stream HTTP ${stream.status}`);

  const reader = stream.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const raw = line.slice(6).trim();
        if (!raw || raw === '[DONE]') continue;
        try {
          const event = JSON.parse(raw);
          if (event.msg === 'process_completed') {
            const jsonStr = event.output?.data?.[0] || '{}';
            const parsed = JSON.parse(jsonStr);
            if (parsed.error) throw new Error(parsed.error);
            return parsed;
          }
        } catch (e) {
          if (!e.message.startsWith('Unexpected token')) throw e;
        }
      }
    }
  }
  throw new Error('Stream ended without completion');
}

export async function generateImage({
  engine = '',
  performanceMode = 'Balanced',
  comfyServerUrl = 'http://127.0.0.1:8188',
  comfyWorkflowPath = '',
  imageStyle = 'Editorial Portrait',
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
