const BASE = '/gradio_api';
const SESSION_HASH = Math.random().toString(36).slice(2);

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

// Fetch the Creative Engine dropdown choices live from the Gradio config.
// Falls back to null if the backend is unreachable.
export async function fetchEngineChoices() {
  try {
    const res = await fetch(`${BASE}/config`);
    if (!res.ok) return null;
    const config = await res.json();
    for (const comp of config.components || []) {
      if (comp.props?.label === 'Creative Engine' && comp.props?.choices) {
        return comp.props.choices.map(c => (Array.isArray(c) ? c[0] : c));
      }
    }
  } catch {}
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
  return { images: data[0] || [], status: data[1] || '' };
}
