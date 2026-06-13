const BASE = '/gradio';

async function callNamed(apiName, data) {
  const res = await fetch(`${BASE}/run/${apiName}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const json = await res.json();
  return json.data;
}

// Fetch available character names from the Gradio /info endpoint
export async function getCharacters() {
  try {
    const res = await fetch(`${BASE}/info`);
    if (!res.ok) return [];
    const info = await res.json();
    // Look for character choices in the named_endpoints or component info
    const endpoints = info?.named_endpoints || info?.unnamed_endpoints || [];
    // Fall back: just return empty — Characters screen loads from backend state
    return [];
  } catch {
    return [];
  }
}

// Build director prompts
// Inputs: vision, content_type, mood, output_goal, character_or_group, scene_name, use_identity_lock
// Returns: { positivePrompt, negativePrompt, recommendedEngine, reason }
export async function buildDirectorOutputs({
  vision = '',
  contentType = '',
  mood = '',
  outputGoal = '',
  character = '',
  scene = '',
  useIdentityLock = false,
} = {}) {
  const data = await callNamed('build_director_outputs', [
    vision,
    contentType,
    mood,
    outputGoal,
    character,
    scene,
    useIdentityLock,
  ]);
  return {
    positivePrompt:    data[0] || '',
    negativePrompt:    data[1] || '',
    recommendedEngine: data[2] || '',
    reason:            data[3] || '',
  };
}

// Generate image via ComfyUI / cloud engine
// Inputs match generate_image_with_comfyui handler
export async function generateImage({
  engine = 'FLUX Schnell',
  performanceMode = 'Balanced',
  comfyServerUrl = 'http://127.0.0.1:8188',
  comfyWorkflowPath = '',
  imageStyle = 'Editorial',
  positivePrompt = '',
  negativePrompt = '',
  imageSize = '512x768',
  quality = 'High',
  batchSize = 1,
  seed = -1,
  cfg = 7,
  steps = 20,
  width = 512,
  height = 768,
} = {}) {
  const data = await callNamed('generate_image', [
    engine,
    performanceMode,
    comfyServerUrl,
    comfyWorkflowPath,
    imageStyle,
    positivePrompt,
    negativePrompt,
    imageSize,
    quality,
    batchSize,
    seed,
    cfg,
    steps,
    width,
    height,
  ]);
  return {
    images: data[0] || [],
    status: data[1] || '',
  };
}
