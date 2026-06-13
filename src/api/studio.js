import { Client } from '@gradio/client';

const GRADIO_URL = 'http://127.0.0.1:7860';

let _client = null;
async function getClient() {
  if (!_client) _client = await Client.connect(GRADIO_URL);
  return _client;
}

// fn_index map (order of event handler registrations in app.py)
const FN = {
  build_director_outputs: 2,  // build_director_button.click — line 11696
  generate_image:         42, // generate_image_button.click — line 12194
};

// Build director prompts
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
  const client = await getClient();
  const result = await client.predict(FN.build_director_outputs, {
    vision,
    content_type: contentType,
    mood,
    output_goal: outputGoal,
    character_or_group: character,
    scene_name: scene,
    use_identity_lock: useIdentityLock,
  });
  const data = result.data;
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
  const client = await getClient();
  const result = await client.predict(FN.generate_image, [
    engine, performanceMode, comfyServerUrl, comfyWorkflowPath,
    imageStyle, positivePrompt, negativePrompt, imageSize,
    quality, batchSize, seed, cfg, steps, width, height,
  ]);
  const data = result.data;
  return {
    images: data[0] || [],
    status: data[1] || '',
  };
}
