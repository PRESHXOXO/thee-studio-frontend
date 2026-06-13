const BASE = '/gradio';

async function callFn(fnIndex, data) {
  const res = await fetch(`${BASE}/run/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fn_index: fnIndex, data }),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const json = await res.json();
  return json.data;
}

export async function getCharacters() {
  try {
    const data = await callFn(0, []);
    return data[0] || [];
  } catch {
    return [];
  }
}

export async function buildDirectorOutputs(character, scene, style, mood, extra) {
  const data = await callFn(1, [character, scene, style, mood, extra]);
  return {
    positivePrompt: data[0] || '',
    negativePrompt: data[1] || '',
    systemPrompt: data[2] || '',
    sceneDesc: data[3] || '',
  };
}

export async function generateImages(params) {
  const {
    character, scene, style, mood, extra,
    provider, model, width, height, seed, steps, cfg, batchSize,
  } = params;
  const data = await callFn(2, [
    character, scene, style, mood, extra,
    provider, model, width, height, seed, steps, cfg, batchSize,
  ]);
  return {
    images: data[0] || [],
    log: data[1] || '',
  };
}

export async function loadIdentity(character, strength) {
  const data = await callFn(3, [character, strength]);
  return data[0] || {};
}
