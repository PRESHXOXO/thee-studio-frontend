import { creatorIdentityFromStudio } from './domain.js';

function one(data, error) {
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Expected record was not returned.');
  return data;
}

export class SupabasePipelineRepository {
  constructor(db, userId) {
    this.db = db;
    this.userId = userId;
  }

  async syncStudioCreators(studioCreators = []) {
    const existing = await this.listCreators();
    for (const source of studioCreators) {
      let creator = existing.find(item => item.name.trim().toLowerCase() === source.name?.trim().toLowerCase());
      if (!creator) {
        creator = await this.createCreator({
          name: source.name,
          handle: source.handle,
          description: source.description || source.niche,
        });
        existing.push(creator);
      }
      const identity = await this.getIdentity(creator.id);
      if (!identity) await this.saveIdentity(creator.id, creatorIdentityFromStudio(source));
    }
  }

  async listCreators() {
    const { data, error } = await this.db.from('creators').select('*').order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  }
  async createCreator(input) {
    const result = await this.db.from('creators').insert({
      user_id: this.userId, name: input.name, handle: input.handle || null,
      description: input.description || null,
    }).select().single();
    return one(result.data, result.error);
  }
  async getIdentity(creatorId) {
    const { data, error } = await this.db.from('creator_identity_profiles').select('*').eq('creator_id', creatorId).maybeSingle();
    if (error) throw new Error(error.message);
    return data || null;
  }
  async saveIdentity(creatorId, input) {
    const result = await this.db.from('creator_identity_profiles').upsert({
      user_id: this.userId, creator_id: creatorId,
      identity_notes: input.identityNotes || '',
      locked_traits: input.lockedTraits || [],
      do_not_change_notes: input.doNotChangeNotes || '',
      realism_orientation: input.realismOrientation || 'luxury_high_realism',
    }, { onConflict: 'creator_id' }).select().single();
    return one(result.data, result.error);
  }
  async listReferenceAssets(creatorId) {
    const { data, error } = await this.db.from('creator_reference_assets').select('*').eq('creator_id', creatorId).order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return Promise.all((data || []).map(async asset => {
      const signed = await this.db.storage.from('creator-references').createSignedUrl(asset.storage_path, 3600);
      return { ...asset, signed_url: signed.data?.signedUrl };
    }));
  }
  async uploadReferenceAsset(creatorId, category, file, notes) {
    const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
    const path = `${this.userId}/${creatorId}/${category}/${crypto.randomUUID()}-${safeName}`;
    const upload = await this.db.storage.from('creator-references').upload(path, file, { contentType: file.type, upsert: false });
    if (upload.error) throw new Error(upload.error.message);
    const result = await this.db.from('creator_reference_assets').insert({
      user_id: this.userId, creator_id: creatorId, category, storage_path: path,
      original_filename: file.name, mime_type: file.type, size_bytes: file.size,
      notes: notes || null,
    }).select().single();
    if (result.error) {
      await this.db.storage.from('creator-references').remove([path]);
      throw new Error(result.error.message);
    }
    return result.data;
  }

  async listProjects() {
    const { data, error } = await this.db.from('generation_projects').select('*').order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  }
  async createProject(input) {
    const result = await this.db.from('generation_projects').insert({
      user_id: this.userId, creator_id: input.creatorId, title: input.title,
      brief: input.brief || '', default_aspect_ratio: input.defaultAspectRatio || '9:16',
    }).select().single();
    return one(result.data, result.error);
  }
  async getWorkspace(projectId) {
    const projectResult = await this.db.from('generation_projects').select('*').eq('id', projectId).single();
    const project = one(projectResult.data, projectResult.error);
    const [creatorResult, identityResult, shotsResult] = await Promise.all([
      this.db.from('creators').select('*').eq('id', project.creator_id).single(),
      this.db.from('creator_identity_profiles').select('*').eq('creator_id', project.creator_id).maybeSingle(),
      this.db.from('generation_shots').select('*').eq('project_id', projectId).order('position'),
    ]);
    if (identityResult.error || shotsResult.error) throw new Error(identityResult.error?.message || shotsResult.error?.message);
    const creator = one(creatorResult.data, creatorResult.error);
    const shots = shotsResult.data || [];
    const shotIds = shots.map(shot => shot.id);
    if (!shotIds.length) return {
      project, creator, identity: identityResult.data || null, shots,
      generations: [], assets: [], reviews: [], selections: [], clips: [],
    };
    const [generationsResult, assetsResult, selectionsResult, clipsResult] = await Promise.all([
      this.db.from('still_generations').select('*').in('shot_id', shotIds).order('created_at', { ascending: false }),
      this.db.from('still_generation_assets').select('*').in('shot_id', shotIds).order('created_at', { ascending: false }),
      this.db.from('still_selections').select('*').in('shot_id', shotIds),
      this.db.from('clip_generations').select('*').in('shot_id', shotIds).order('created_at', { ascending: false }),
    ]);
    const firstError = [generationsResult.error, assetsResult.error, selectionsResult.error, clipsResult.error].find(Boolean);
    if (firstError) throw new Error(firstError.message);
    const assets = assetsResult.data || [];
    const assetIds = assets.map(asset => asset.id);
    const reviewsResult = assetIds.length
      ? await this.db.from('still_reviews').select('*').in('still_asset_id', assetIds)
      : { data: [], error: null };
    if (reviewsResult.error) throw new Error(reviewsResult.error.message);
    const resolve = async (asset, bucket) => {
      if (asset.external_url || !asset.storage_path) return { ...asset, signed_url: asset.external_url || undefined };
      const signed = await this.db.storage.from(bucket).createSignedUrl(asset.storage_path, 3600);
      return { ...asset, signed_url: signed.data?.signedUrl };
    };
    return {
      project, creator, identity: identityResult.data || null, shots,
      generations: generationsResult.data || [],
      assets: await Promise.all(assets.map(asset => resolve(asset, 'generation-assets'))),
      reviews: reviewsResult.data || [],
      selections: selectionsResult.data || [],
      clips: await Promise.all((clipsResult.data || []).map(clip => resolve(clip, 'generation-assets'))),
    };
  }
  async createShot(projectId, input) {
    const result = await this.db.from('generation_shots').insert({
      ...input, user_id: this.userId, project_id: projectId,
    }).select().single();
    return one(result.data, result.error);
  }

  async createProviderRun(input) {
    const result = await this.db.from('provider_runs').insert({
      ...input, user_id: this.userId, status: input.status || 'queued',
    }).select().single();
    return one(result.data, result.error);
  }
  async updateProviderRun(id, patch) {
    const { error } = await this.db.from('provider_runs').update(patch).eq('id', id);
    if (error) throw new Error(error.message);
  }
  async addRunEvent(providerRunId, eventType, message, payload = {}) {
    const { error } = await this.db.from('generation_run_events').insert({
      user_id: this.userId, provider_run_id: providerRunId,
      event_type: eventType, message, payload,
    });
    if (error) throw new Error(error.message);
  }
  async listRunHistory() {
    const [runs, events] = await Promise.all([
      this.db.from('provider_runs').select('*').order('created_at', { ascending: false }).limit(100),
      this.db.from('generation_run_events').select('*').order('created_at', { ascending: false }).limit(300),
    ]);
    if (runs.error || events.error) throw new Error(runs.error?.message || events.error?.message);
    return { runs: runs.data || [], events: events.data || [] };
  }
  async createStillGeneration(input) {
    const result = await this.db.from('still_generations').insert({
      ...input, user_id: this.userId,
    }).select().single();
    return one(result.data, result.error);
  }
  async finishStillGeneration(id, status, errorMessage) {
    const { error } = await this.db.from('still_generations').update({
      status, error_message: errorMessage || null, completed_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) throw new Error(error.message);
  }
  async createStillAssets(generationId, shotId, assets) {
    const result = await this.db.from('still_generation_assets').insert(assets.map(asset => ({
      ...asset, user_id: this.userId, still_generation_id: generationId, shot_id: shotId,
    }))).select();
    if (result.error) throw new Error(result.error.message);
    return result.data || [];
  }
  async saveReview(assetId, scores, notes) {
    const result = await this.db.from('still_reviews').upsert({
      user_id: this.userId, still_asset_id: assetId, scores, reviewer_notes: notes,
    }, { onConflict: 'still_asset_id' }).select().single();
    return one(result.data, result.error);
  }
  async selectHero(shotId, assetId) {
    const result = await this.db.from('still_selections').upsert({
      user_id: this.userId, shot_id: shotId, still_asset_id: assetId,
    }, { onConflict: 'shot_id' }).select().single();
    return one(result.data, result.error);
  }
  async createClipGeneration(input) {
    const result = await this.db.from('clip_generations').insert({
      user_id: this.userId, shot_id: input.shotId, still_asset_id: input.assetId,
      provider_run_id: input.providerRunId, provider_key: input.providerKey,
      motion_guidance: input.guidance, status: 'running',
    }).select().single();
    return one(result.data, result.error);
  }
  async finishClipGeneration(id, patch) {
    const { error } = await this.db.from('clip_generations').update({
      ...patch, completed_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) throw new Error(error.message);
  }
  async createExportJob(input) {
    const result = await this.db.from('export_jobs').insert({
      user_id: this.userId, project_id: input.projectId, asset_type: input.assetType,
      source_asset_id: input.sourceAssetId, provider_run_id: input.providerRunId,
      provider_key: input.providerKey, aspect_ratio: input.aspectRatio,
      metadata: input.metadata || {}, status: 'processing',
    }).select().single();
    return one(result.data, result.error);
  }
  async finishExportJob(id, patch) {
    const { error } = await this.db.from('export_jobs').update({
      ...patch, completed_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) throw new Error(error.message);
  }
  async listExports() {
    const { data, error } = await this.db.from('export_jobs').select('*').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return Promise.all((data || []).map(async job => {
      if (job.external_url || !job.storage_path) return { ...job, signed_url: job.external_url || undefined };
      const signed = await this.db.storage.from('exports').createSignedUrl(job.storage_path, 3600);
      return { ...job, signed_url: signed.data?.signedUrl };
    }));
  }
}
