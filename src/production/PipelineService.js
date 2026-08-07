import { creatorMemoryPrompt } from '../lib/creatorMemory.js';

const now = () => new Date().toISOString();
export const MAX_GENERATION_ATTEMPTS = 3;

export class PipelineService {
  constructor(repository, providers) {
    this.repository = repository;
    this.providers = providers;
  }

  async generateStills(shot, identity, count, options = {}) {
    const memory = options.memory;
    const memoryBlock = creatorMemoryPrompt(memory ? {
      ...memory,
      learned: memory.learned || memory.learned_signals,
      feedback: memory.feedback || memory.feedback_counts,
      history: memory.history || memory.version_history,
    } : null);
    const prompt = [
      identity?.identity_notes,
      identity?.locked_traits?.join(', '),
      memoryBlock,
      shot.prompt_template,
      shot.framing,
      shot.environment,
      shot.styling_notes,
      shot.lighting_notes,
      shot.realism_notes,
    ].filter(Boolean).join('. ');
    const negativePrompt = [
      identity?.do_not_change_notes,
      shot.negative_constraints,
      'identity drift, plastic skin, malformed hands, warped objects, text artifacts',
    ].filter(Boolean).join(', ');
    const provider = this.providers.still;
    const request = {
      shotId: shot.id, prompt, negativePrompt,
      shotTitle: shot.title, candidateCount: count, aspectRatio: shot.aspect_ratio,
      memoryVersion: memory?.version || null,
    };
    if (this.repository.reserveLocalCredits) await this.repository.reserveLocalCredits(count * 2);
    const run = await this.repository.createProviderRun({
      provider_type: 'still', provider_key: provider.key,
      operation: 'generate_candidates', request_payload: request,
      status: 'running', started_at: now(), progress: 5,
      retry_of: options.retryOf || null,
      attempt: options.attempt || 1,
      idempotency_key: crypto.randomUUID(),
    });
    const generation = await this.repository.createStillGeneration({
      shot_id: shot.id, provider_run_id: run.id, provider_key: provider.key,
      prompt, negative_prompt: negativePrompt, candidate_count: count, status: 'running',
    });
    await this.repository.addRunEvent(run.id, 'started', `Generating ${count} still candidates.`);
    try {
      const result = await provider.generate({
        runId: run.id,
        shot, identity, prompt, negativePrompt,
        candidateCount: count, aspectRatio: shot.aspect_ratio,
      });
      const currentRun = await this.repository.getProviderRun?.(run.id);
      if (currentRun?.status === 'cancelled') {
        await this.repository.finishStillGeneration(generation.id, 'cancelled', 'Cancelled by user.');
        return;
      }
      await this.repository.updateProviderRun(run.id, { progress: 75 });
      await this.repository.createStillAssets(
        generation.id,
        shot.id,
        result.assets.map(asset => ({
          storage_path: asset.storagePath, external_url: asset.externalUrl,
          width: asset.width, height: asset.height, seed: asset.seed,
          metadata: asset.metadata || {},
        })),
      );
      await this.repository.finishStillGeneration(generation.id, 'succeeded');
      await this.repository.updateProviderRun(run.id, {
        status: 'succeeded', external_run_id: result.externalRunId,
        response_payload: result.metadata || {}, completed_at: now(), progress: 100,
      });
      await this.repository.addRunEvent(run.id, 'completed', `${result.assets.length} still candidates ready.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Still generation failed.';
      const currentRun = await this.repository.getProviderRun?.(run.id);
      if (currentRun?.status === 'cancelled') {
        await this.repository.finishStillGeneration(generation.id, 'cancelled', 'Cancelled by user.');
        return;
      }
      await this.repository.finishStillGeneration(generation.id, 'failed', message);
      await this.repository.updateProviderRun(run.id, {
        status: 'failed', error_message: message, completed_at: now(),
      });
      await this.repository.addRunEvent(run.id, 'failed', message);
      throw error;
    }
  }

  async generateClip(shot, asset, guidance, options = {}) {
    const stillUrl = asset.signed_url || asset.external_url;
    if (!stillUrl) throw new Error('Hero still URL is unavailable.');
    const provider = this.providers.clip;
    const request = { shotId: shot.id, stillAssetId: asset.id, stillUrl, guidance };
    if (this.repository.reserveLocalCredits) await this.repository.reserveLocalCredits(guidance.durationSeconds * 2);
    const run = await this.repository.createProviderRun({
      provider_type: 'clip', provider_key: provider.key,
      operation: 'image_to_video', request_payload: request,
      status: 'running', started_at: now(), progress: 5,
      retry_of: options.retryOf || null,
      attempt: options.attempt || 1,
      idempotency_key: crypto.randomUUID(),
    });
    const clip = await this.repository.createClipGeneration({
      shotId: shot.id, assetId: asset.id, providerRunId: run.id,
      providerKey: provider.key, guidance,
    });
    await this.repository.addRunEvent(run.id, 'started', 'Animating selected hero still.');
    try {
      const result = await provider.generate({
        runId: run.id, shotId: shot.id, stillAssetId: asset.id, stillUrl, guidance,
      });
      const currentRun = await this.repository.getProviderRun?.(run.id);
      if (currentRun?.status === 'cancelled') {
        await this.repository.finishClipGeneration(clip.id, { status: 'cancelled', error_message: 'Cancelled by user.' });
        return;
      }
      await this.repository.updateProviderRun(run.id, { progress: 75 });
      await this.repository.finishClipGeneration(clip.id, {
        status: 'succeeded', storage_path: result.storagePath,
        external_url: result.externalUrl, error_message: null,
      });
      await this.repository.updateProviderRun(run.id, {
        status: 'succeeded', external_run_id: result.externalRunId,
        response_payload: result.metadata || {}, completed_at: now(), progress: 100,
      });
      await this.repository.addRunEvent(run.id, 'completed', 'Clip ready for export.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Clip generation failed.';
      const currentRun = await this.repository.getProviderRun?.(run.id);
      if (currentRun?.status === 'cancelled') {
        await this.repository.finishClipGeneration(clip.id, { status: 'cancelled', error_message: 'Cancelled by user.' });
        return;
      }
      await this.repository.finishClipGeneration(clip.id, { status: 'failed', error_message: message });
      await this.repository.updateProviderRun(run.id, {
        status: 'failed', error_message: message, completed_at: now(),
      });
      await this.repository.addRunEvent(run.id, 'failed', message);
      throw error;
    }
  }

  async createExport(projectId, sourceAssetId, sourceUrl, assetType, aspectRatio, options = {}) {
    const provider = this.providers.export;
    const request = {
      projectId, sourceAssetId, sourceUrl, assetType, aspectRatio,
      enhance: assetType.startsWith('enhanced_'),
    };
    if (this.repository.reserveLocalCredits) await this.repository.reserveLocalCredits(request.enhance ? 3 : 1);
    const run = await this.repository.createProviderRun({
      provider_type: 'export', provider_key: provider.key,
      operation: 'prepare_export', request_payload: request,
      status: 'running', started_at: now(), progress: 5,
      retry_of: options.retryOf || null,
      attempt: options.attempt || 1,
      idempotency_key: crypto.randomUUID(),
    });
    const job = await this.repository.createExportJob({
      projectId, sourceAssetId, providerRunId: run.id, providerKey: provider.key,
      assetType, aspectRatio, metadata: {},
    });
    await this.repository.addRunEvent(run.id, 'started', 'Preparing export asset.');
    try {
      const result = await provider.create({ ...request, runId: run.id });
      const currentRun = await this.repository.getProviderRun?.(run.id);
      if (currentRun?.status === 'cancelled') {
        await this.repository.finishExportJob(job.id, { status: 'failed', metadata: { cancelled: true } });
        return;
      }
      await this.repository.updateProviderRun(run.id, { progress: 75 });
      await this.repository.finishExportJob(job.id, {
        status: 'ready', storage_path: result.storagePath,
        external_url: result.externalUrl, metadata: result.metadata || {},
      });
      await this.repository.updateProviderRun(run.id, {
        status: 'succeeded', external_run_id: result.externalRunId,
        response_payload: result.metadata || {}, completed_at: now(), progress: 100,
      });
      await this.repository.addRunEvent(run.id, 'completed', 'Export ready.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Export failed.';
      const currentRun = await this.repository.getProviderRun?.(run.id);
      if (currentRun?.status === 'cancelled') {
        await this.repository.finishExportJob(job.id, { status: 'failed', metadata: { cancelled: true } });
        return;
      }
      await this.repository.finishExportJob(job.id, { status: 'failed', metadata: { error: message } });
      await this.repository.updateProviderRun(run.id, {
        status: 'failed', error_message: message, completed_at: now(),
      });
      await this.repository.addRunEvent(run.id, 'failed', message);
      throw error;
    }
  }

  async retryRun(run) {
    const attempt = Number(run.attempt || 1) + 1;
    if (attempt > MAX_GENERATION_ATTEMPTS) {
      throw new Error(`Maximum of ${MAX_GENERATION_ATTEMPTS} generation attempts reached.`);
    }
    if (run.provider_type === 'still') {
      const { shot, identity, memory } = await this.repository.getShotContext(run.request_payload.shotId);
      return this.generateStills(shot, identity, run.request_payload.candidateCount, {
        retryOf: run.id, attempt, memory,
      });
    }
    if (run.provider_type === 'clip') {
      const { shot } = await this.repository.getShotContext(run.request_payload.shotId);
      const asset = await this.repository.getStillAsset(run.request_payload.stillAssetId);
      return this.generateClip(shot, asset, run.request_payload.guidance, {
        retryOf: run.id, attempt,
      });
    }
    if (run.provider_type === 'export') {
      const source = run.request_payload.assetType.includes('clip')
        ? await this.repository.getClip(run.request_payload.sourceAssetId)
        : await this.repository.getStillAsset(run.request_payload.sourceAssetId);
      return this.createExport(
        run.request_payload.projectId,
        run.request_payload.sourceAssetId,
        source.signed_url || source.external_url,
        run.request_payload.assetType,
        run.request_payload.aspectRatio,
        { retryOf: run.id, attempt },
      );
    }
    throw new Error('This job type cannot be retried.');
  }
}
