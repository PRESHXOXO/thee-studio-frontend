import { getSupabase } from '../lib/supabase.js';

/**
 * Converts a Thee Studio-generated keyframe into a managed Scene Flow video.
 * The backend accepts only signed generation-assets URLs, so arbitrary remote
 * images cannot be smuggled into the video provider through this client.
 *
 * One invocation == one video provider request. There are deliberately no
 * client retries here; another billable attempt must come from a new user
 * action.
 */
export async function generateSceneFlowVideo({
  sourceUrl,
  prompt,
  durationSeconds = 5,
  verticalOutput = true,
  requestKey = crypto.randomUUID(),
} = {}) {
  if (!sourceUrl || typeof sourceUrl !== 'string') {
    throw new Error('Scene Flow needs a generated keyframe before making a video.');
  }
  if (!prompt?.trim()) throw new Error('Scene Flow has no video prompt yet.');

  const duration = [3, 5, 8].includes(Number(durationSeconds)) ? Number(durationSeconds) : 5;
  const { data, error } = await getSupabase().functions.invoke('director-scene-flow-video', {
    body: {
      sourceUrl,
      prompt: prompt.trim(),
      durationSeconds: duration,
      verticalOutput: verticalOutput !== false,
    },
    headers: { 'idempotency-key': requestKey },
  });

  if (error) throw new Error(error.message || 'Scene Flow video generation failed.');
  if (data?.error) throw new Error(data.error);
  if (data?.status !== 'succeeded' || !data?.result_url) {
    throw new Error('Scene Flow video finished without a usable video.');
  }
  return data;
}
