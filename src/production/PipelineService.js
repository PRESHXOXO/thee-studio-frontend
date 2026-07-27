const now = () => new Date().toISOString();

export class PipelineService {
  constructor(repository, providers) {
    this.repository = repository;
    this.providers = providers;
  }

  async generateStills(shot, identity, count) {
    const prompt = [
      identity?.identity_notes,
      identity?.locked_traits?.join(', '),
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
      candidateCount: count, aspectRatio: shot.aspect_ratio,
    };
    const run = await this.repository.createProviderRun({
      provider_type: 'still', provider_key: provider.key,
      operation: 'generate_candidates', request_payload: request,
      status: 'running', started_at: now(),
    });
    const generation = await this.repository.createStillGeneration({
      shot_id: shot.id, provider_run_id: run.id, provider_key: provider.key,
      prompt, negative_prompt: negativePrompt, candidate_count: count, status: 'running',
    });
    await this.repository.addRunEvent(run.id, 'started', `Generating ${count} still candidates.`);
    try {
      const result = await provider.generate({
        shot, identity, prompt, negativePrompt,
        candidateCount: count, aspectRatio: shot.aspect_ratio,
      });
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
        response_payload: result.metadata || {}, completed_at: now(),
      });
      await this.repository.addRunEvent(run.id, 'completed', `${result.assets.length} still candidates ready.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Still generation failed.';
      await this.repository.finishStillGeneration(generation.id, 'failed', message);
      await this.repository.updateProviderRun(run.id, {
        status: 'failed', error_message: message, completed_at: now(),
      });
      await this.repository.addRunEvent(run.id, 'failed', message);
      throw error;
    }
  }

  async generateClip(shot, asset, guidance) {
    const stillUrl = asset.signed_url || asset.external_url;
    if (!stillUrl) throw new Error('Hero still URL is unavailable.');
    const provider = this.providers.clip;
    const request = { shotId: shot.id, stillAssetId: asset.id, guidance };
    const run = await this.repository.createProviderRun({
      provider_type: 'clip', provider_key: provider.key,
      operation: 'image_to_video', request_payload: request,
      status: 'running', started_at: now(),
    });
    const clip = await this.repository.createClipGeneration({
      shotId: shot.id, assetId: asset.id, providerRunId: run.id,
      providerKey: provider.key, guidance,
    });
    await this.repository.addRunEvent(run.id, 'started', 'Animating selected hero still.');
    try {
      const result = await provider.generate({
        shotId: shot.id, stillAssetId: asset.id, stillUrl, guidance,
      });
      await this.repository.finishClipGeneration(clip.id, {
        status: 'succeeded', storage_path: result.storagePath,
        external_url: result.externalUrl, error_message: null,
      });
      await this.repository.updateProviderRun(run.id, {
        status: 'succeeded', external_run_id: result.externalRunId,
        response_payload: result.metadata || {}, completed_at: now(),
      });
      await this.repository.addRunEvent(run.id, 'completed', 'Clip ready for export.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Clip generation failed.';
      await this.repository.finishClipGeneration(clip.id, { status: 'failed', error_message: message });
      await this.repository.updateProviderRun(run.id, {
        status: 'failed', error_message: message, completed_at: now(),
      });
      await this.repository.addRunEvent(run.id, 'failed', message);
      throw error;
    }
  }

  async createExport(projectId, sourceAssetId, sourceUrl, assetType, aspectRatio) {
    const provider = this.providers.export;
    const request = {
      projectId, sourceAssetId, assetType, aspectRatio,
      enhance: assetType.startsWith('enhanced_'),
    };
    const run = await this.repository.createProviderRun({
      provider_type: 'export', provider_key: provider.key,
      operation: 'prepare_export', request_payload: request,
      status: 'running', started_at: now(),
    });
    const job = await this.repository.createExportJob({
      projectId, sourceAssetId, providerRunId: run.id, providerKey: provider.key,
      assetType, aspectRatio, metadata: {},
    });
    await this.repository.addRunEvent(run.id, 'started', 'Preparing export asset.');
    try {
      const result = await provider.create({ ...request, sourceUrl });
      await this.repository.finishExportJob(job.id, {
        status: 'ready', storage_path: result.storagePath,
        external_url: result.externalUrl, metadata: result.metadata || {},
      });
      await this.repository.updateProviderRun(run.id, {
        status: 'succeeded', external_run_id: result.externalRunId,
        response_payload: result.metadata || {}, completed_at: now(),
      });
      await this.repository.addRunEvent(run.id, 'completed', 'Export ready.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Export failed.';
      await this.repository.finishExportJob(job.id, { status: 'failed', metadata: { error: message } });
      await this.repository.updateProviderRun(run.id, {
        status: 'failed', error_message: message, completed_at: now(),
      });
      await this.repository.addRunEvent(run.id, 'failed', message);
      throw error;
    }
  }
}
