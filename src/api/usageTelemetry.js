import { getSupabase, hasSupabaseConfig } from '../lib/supabase.js';

const TRACKED = new Set([
  'build_director_outputs', 'scene_flow_chat', 'prompt_lab_build',
  'analyze_character', 'parse_creator_correction', 'outfit_describe', 'face_anchor_extract',
  'character_seed_generate', 'generate_reference_set', 'character_variations_generate',
  'character_variation_shot', 'character_generate', 'generate_image', 'scene_flow_generate',
]);

async function invoke(body) {
  const { data, error } = await getSupabase().functions.invoke('thee-track-operation', { body });
  if (error) throw new Error(`Usage audit unavailable: ${error.message}`);
  if (data?.error) throw new Error(`Usage audit unavailable: ${data.error}`);
  return data;
}

export function createTelemetryRequestKey() {
  return crypto.randomUUID();
}

export async function startUsageTelemetry(apiName, data, requestKey = createTelemetryRequestKey()) {
  if (!hasSupabaseConfig() || !TRACKED.has(apiName)) return { tracked: false, requestKey };
  const payload = JSON.stringify(data);
  let requestOptions = {};
  if (typeof data?.[0] === 'string') {
    try { requestOptions = JSON.parse(data[0]) || {}; } catch {}
  }
  const outputType = String(requestOptions.content_type || requestOptions.contentType || '').toLowerCase();
  const requestedCount = Number(requestOptions.count || requestOptions.batchSize || requestOptions.batch_size || 1);
  const result = await invoke({
    action: 'start', apiName, requestKey,
    payloadBytes: new Blob([payload]).size,
    requestFingerprint: `${apiName}:${payload.length}:${requestKey}`,
    route: window.location.pathname,
    outputType: outputType === 'video' ? 'video' : undefined,
    requestedCount: Number.isFinite(requestedCount) ? requestedCount : 1,
  });
  return { ...result, requestKey, apiName };
}

export async function finishUsageTelemetry(context, result, error = null) {
  if (!context?.tracked || !context.attemptId) return;
  let applicationError = null;
  const parsedPayloads = [];
  if (!error && Array.isArray(result)) {
    for (const value of result) {
      if (typeof value !== 'string') continue;
      try {
        const parsed = JSON.parse(value);
        parsedPayloads.push(parsed);
        if (!applicationError && parsed?.error) applicationError = parsed.error;
      } catch {}
    }
  }
  const finalError = error || (applicationError ? new Error(applicationError) : null);
  const serialized = finalError ? '' : JSON.stringify(result ?? null);
  const providerTelemetry = parsedPayloads.find(payload => payload?._telemetry)?._telemetry || {};
  const imageCount = finalError ? 0 : Math.max(
    Array.isArray(result?.[0]) ? result[0].length : 0,
    ...parsedPayloads.map(payload => Array.isArray(payload?.images) ? payload.images.length : payload?.image ? 1 : 0),
    context.apiName === 'scene_flow_generate' && result?.[0] ? 1 : 0,
  );
  await invoke({
    action: 'finish',
    attemptId: context.attemptId,
    status: finalError ? 'failed' : 'succeeded',
    failureCode: finalError ? 'studio_request_failed' : null,
    failureReason: finalError?.message || null,
    chargedStatus: ['yes', 'no'].includes(providerTelemetry.chargedStatus) ? providerTelemetry.chargedStatus : 'unknown',
    providerRequestId: providerTelemetry.providerRequestId || null,
    inputTokens: providerTelemetry.inputTokens || 0,
    cachedInputTokens: providerTelemetry.cachedInputTokens || 0,
    outputTokens: providerTelemetry.outputTokens || 0,
    textInputTokens: providerTelemetry.textInputTokens || 0,
    cachedTextInputTokens: providerTelemetry.cachedTextInputTokens || 0,
    imageInputTokens: providerTelemetry.imageInputTokens || 0,
    cachedImageInputTokens: providerTelemetry.cachedImageInputTokens || 0,
    imageOutputTokens: providerTelemetry.imageOutputTokens || 0,
    imageCount,
    responseBytes: serialized ? new Blob([serialized]).size : 0,
  });
}

export async function trackStorageOperation({
  requestKey = createTelemetryRequestKey(),
  storageOperation,
  status = 'succeeded',
  storageDeltaBytes = 0,
  bucket = '',
  objectType = '',
  failureReason = null,
}) {
  if (!hasSupabaseConfig()) return;
  await invoke({
    action: 'storage', requestKey, storageOperation, status,
    storageDeltaBytes, bucket, objectType, failureReason,
  });
}
