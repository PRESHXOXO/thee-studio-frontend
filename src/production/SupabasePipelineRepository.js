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
      let creator = existing.find(item => String(item.studio_source_id) === String(source.id))
        || existing.find(item => item.name.trim().toLowerCase() === source.name?.trim().toLowerCase());
      if (!creator) {
        creator = await this.createCreator({
          name: source.name,
          handle: source.handle,
          description: source.description || source.niche,
          studioSourceId: source.id,
        });
        existing.push(creator);
      } else if (!creator.studio_source_id) {
        const result = await this.db.from('creators').update({ studio_source_id: String(source.id) }).eq('id', creator.id).select().single();
        creator = one(result.data, result.error);
      }
      const identity = await this.getIdentity(creator.id);
      if (!identity) await this.saveIdentity(creator.id, creatorIdentityFromStudio(source));
    }
  }

  async syncCreatorMemories(memoryStore = {}) {
    const creators = await this.listCreators();
    for (const [studioSourceId, memory] of Object.entries(memoryStore || {})) {
      const creator = creators.find(item => String(item.studio_source_id) === String(studioSourceId));
      if (creator) await this.saveMemory(creator.id, memory);
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
      description: input.description || null, studio_source_id: input.studioSourceId != null ? String(input.studioSourceId) : null,
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
  async getMemory(creatorId) {
    const { data, error } = await this.db.from('creator_memory_profiles').select('*').eq('creator_id', creatorId).maybeSingle();
    if (error) throw new Error(error.message);
    return data || null;
  }
  async saveMemory(creatorId, memory) {
    const result = await this.db.from('creator_memory_profiles').upsert({
      user_id: this.userId,
      creator_id: creatorId,
      version: memory.version || 1,
      preferences: memory.preferences || {},
      learned_signals: memory.learned || memory.learned_signals || {},
      feedback_counts: memory.feedback || memory.feedback_counts || {},
      version_history: memory.history || memory.version_history || [],
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
  ensureSampleWorkspace() {
    if (!this.sampleWorkspacePromise) {
      this.sampleWorkspacePromise = this.createSampleWorkspace();
    }
    return this.sampleWorkspacePromise;
  }
  async createSampleWorkspace() {
    const [projects, creators] = await Promise.all([this.listProjects(), this.listCreators()]);
    if (projects.length) return null;
    let creator = creators[0];
    if (!creator) {
      creator = await this.createCreator({
        name: 'Studio Muse',
        handle: 'studio-muse',
        description: 'A sample creator for exploring the production workspace.',
      });
      await this.saveIdentity(creator.id, {
        identityNotes: 'Warm, confident editorial presence with natural skin texture.',
        lockedTraits: ['consistent facial proportions', 'warm brown eyes', 'natural skin texture'],
        doNotChangeNotes: 'Preserve identity, age, skin tone, and facial geometry.',
      });
    }
    const project = await this.createProject({
      creatorId: creator.id,
      title: 'Welcome Campaign',
      brief: 'A three-frame introduction to identity-locked, still-first production.',
      defaultAspectRatio: '4:5',
    });
    await this.createShot(project.id, {
      title: 'Editorial introduction',
      shot_type: 'beauty close-up',
      prompt_template: 'A confident editorial portrait that introduces the creator with natural polish.',
      framing: 'Chest-up portrait, eye level, 50mm feel',
      environment: 'Warm minimal studio with subtle depth',
      styling_notes: 'Signature wardrobe with restrained accessories',
      lighting_notes: 'Large soft key with gentle warm fill',
      realism_notes: 'Natural skin texture, coherent shadows, lived-in posture',
      motion_plan: 'Natural blink and subtle breathing',
      negative_constraints: 'No identity drift, warped hands, plastic skin, or text',
      aspect_ratio: '4:5',
      position: 1,
    });
    return project;
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
      project, creator, identity: identityResult.data || null, memory: await this.getMemory(creator.id), shots,
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
      project, creator, identity: identityResult.data || null, memory: await this.getMemory(creator.id), shots,
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
      progress: input.progress || 0,
      attempt: input.attempt || 1,
      retry_of: input.retry_of || null,
      idempotency_key: input.idempotency_key || crypto.randomUUID(),
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
  async getProviderRun(id) {
    const { data, error } = await this.db.from('provider_runs').select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    return data || null;
  }
  async cancelProviderRun(id) {
    const now = new Date().toISOString();
    const { data, error } = await this.db.from('provider_runs').update({
      status: 'cancelled', cancel_requested_at: now, completed_at: now,
    }).eq('id', id).in('status', ['queued', 'running']).select().maybeSingle();
    if (error) throw new Error(error.message);
    if (data) await this.addRunEvent(id, 'cancelled', 'Generation cancelled by the user.');
    return data || this.getProviderRun(id);
  }
  async recoverInterruptedRuns(maxAgeMs = 240000) {
    const cutoff = new Date(Date.now() - maxAgeMs).toISOString();
    const { data, error } = await this.db.from('provider_runs').update({
      status: 'failed',
      error_code: 'interrupted',
      error_message: 'Generation was interrupted and can be retried.',
      completed_at: new Date().toISOString(),
    }).eq('status', 'running').lt('started_at', cutoff).select('id');
    if (error) throw new Error(error.message);
    await Promise.all((data || []).map(run => this.addRunEvent(run.id, 'recovered', 'Interrupted generation marked retryable.')));
  }
  async getUsageSummary() {
    const period = new Date();
    const periodStart = `${period.getUTCFullYear()}-${String(period.getUTCMonth() + 1).padStart(2, '0')}-01`;
    const { data, error } = await this.db.from('user_usage_monthly')
      .select('included_credits,used_credits')
      .eq('period_start', periodStart)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const included = data?.included_credits ?? 200;
    const used = data?.used_credits ?? 0;
    return { included, used, remaining: Math.max(included - used, 0) };
  }
  async getShotContext(shotId) {
    const shotResult = await this.db.from('generation_shots').select('*').eq('id', shotId).single();
    const shot = one(shotResult.data, shotResult.error);
    const projectResult = await this.db.from('generation_projects').select('*').eq('id', shot.project_id).single();
    const project = one(projectResult.data, projectResult.error);
    return {
      shot,
      project,
      identity: await this.getIdentity(project.creator_id),
      memory: await this.getMemory(project.creator_id),
    };
  }
  async getStillAsset(id) {
    const { data, error } = await this.db.from('still_generation_assets').select('*').eq('id', id).single();
    const asset = one(data, error);
    if (asset.external_url || !asset.storage_path) return { ...asset, signed_url: asset.external_url || undefined };
    const signed = await this.db.storage.from('generation-assets').createSignedUrl(asset.storage_path, 3600);
    return { ...asset, signed_url: signed.data?.signedUrl };
  }
  async getClip(id) {
    const { data, error } = await this.db.from('clip_generations').select('*').eq('id', id).single();
    const clip = one(data, error);
    if (clip.external_url || !clip.storage_path) return { ...clip, signed_url: clip.external_url || undefined };
    const signed = await this.db.storage.from('generation-assets').createSignedUrl(clip.storage_path, 3600);
    return { ...clip, signed_url: signed.data?.signedUrl };
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
