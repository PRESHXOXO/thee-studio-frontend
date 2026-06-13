const BASE = '/gradio_api';

// Stable session hash for this browser session
const SESSION_HASH = Math.random().toString(36).slice(2);

async function predict(fnIndex, data) {
  const res = await fetch(`${BASE}/run/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fn_index: fnIndex, data, session_hash: SESSION_HASH }),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const json = await res.json();
  return json.data;
}

// fn_index map (determined by event handler registration order in app.py)
const FN = {
  build_director_outputs: 2,  // build_director_button.click — line 11696
  generate_image:         42, // generate_image_button.click — line 12194
};

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
  const data = await predict(FN.build_director_outputs, [
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

// Generate image
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
  const data = await predict(FN.generate_image, [
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
