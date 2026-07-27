import { creatorIdentityFromStudio } from './domain.js';

const timestamp = () => new Date().toISOString();
const createId = prefix => `${prefix}_${crypto.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`}`;
const empty = () => ({
  creators: [], identities: [], references: [], projects: [], shots: [],
  generations: [], assets: [], reviews: [], selections: [], clips: [],
  exports: [], runs: [], events: [],
});

export class LocalPipelineRepository {
  constructor(userId = 'local-user') {
    this.userId = userId;
    this.key = `ts_production_v1:${userId}`;
    try { this.state = JSON.parse(localStorage.getItem(this.key) || 'null') || empty(); }
    catch { this.state = empty(); }
  }

  save() { localStorage.setItem(this.key, JSON.stringify(this.state)); }
  add(collection, value) { collection.push(value); this.save(); return value; }

  async syncStudioCreators(studioCreators = []) {
    for (const source of studioCreators) {
      let creator = this.state.creators.find(item => String(item.studio_source_id) === String(source.id));
      if (!creator) {
        creator = this.add(this.state.creators, {
          id: createId('creator'), user_id: this.userId, studio_source_id: source.id,
          name: source.name, handle: source.handle || null,
          description: source.description || source.niche || null,
          created_at: timestamp(), updated_at: timestamp(),
        });
      } else {
        creator.name = source.name;
        creator.description = source.description || source.niche || creator.description;
        creator.updated_at = timestamp();
        this.save();
      }
      if (!this.state.identities.some(item => item.creator_id === creator.id)) {
        await this.saveIdentity(creator.id, creatorIdentityFromStudio(source));
      }
    }
  }

  async listCreators() { return [...this.state.creators].reverse(); }
  async createCreator(input) {
    return this.add(this.state.creators, {
      id: createId('creator'), user_id: this.userId, name: input.name,
      handle: input.handle || null, description: input.description || null,
      created_at: timestamp(), updated_at: timestamp(),
    });
  }
  async getIdentity(creatorId) {
    return this.state.identities.find(item => item.creator_id === creatorId) || null;
  }
  async saveIdentity(creatorId, input) {
    const old = await this.getIdentity(creatorId);
    const value = {
      id: old?.id || createId('identity'), user_id: this.userId, creator_id: creatorId,
      identity_notes: input.identityNotes || '', locked_traits: input.lockedTraits || [],
      do_not_change_notes: input.doNotChangeNotes || '',
      realism_orientation: input.realismOrientation || 'luxury_high_realism',
      created_at: old?.created_at || timestamp(), updated_at: timestamp(),
    };
    this.state.identities = this.state.identities.filter(item => item.creator_id !== creatorId).concat(value);
    this.save();
    return value;
  }
  async listReferenceAssets(creatorId) {
    return this.state.references.filter(item => item.creator_id === creatorId);
  }
  async uploadReferenceAsset(creatorId, category, file, notes) {
    const signedUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    return this.add(this.state.references, {
      id: createId('ref'), user_id: this.userId, creator_id: creatorId, category,
      storage_path: `local/${file.name}`, original_filename: file.name,
      mime_type: file.type, size_bytes: file.size, notes: notes || null,
      created_at: timestamp(), signed_url: signedUrl,
    });
  }

  async listProjects() { return [...this.state.projects].reverse(); }
  async createProject(input) {
    return this.add(this.state.projects, {
      id: createId('project'), user_id: this.userId, creator_id: input.creatorId,
      title: input.title, brief: input.brief || '', status: 'draft',
      default_aspect_ratio: input.defaultAspectRatio || '9:16',
      created_at: timestamp(), updated_at: timestamp(),
    });
  }
  async getWorkspace(projectId) {
    const project = this.state.projects.find(item => item.id === projectId);
    if (!project) throw new Error('Campaign not found.');
    const creator = this.state.creators.find(item => item.id === project.creator_id);
    if (!creator) throw new Error('Campaign creator not found.');
    const shots = this.state.shots.filter(item => item.project_id === projectId).sort((a, b) => a.position - b.position);
    const shotIds = new Set(shots.map(shot => shot.id));
    const assets = this.state.assets.filter(item => shotIds.has(item.shot_id));
    const assetIds = new Set(assets.map(asset => asset.id));
    return {
      project, creator,
      identity: this.state.identities.find(item => item.creator_id === creator.id) || null,
      shots,
      generations: this.state.generations.filter(item => shotIds.has(item.shot_id)),
      assets,
      reviews: this.state.reviews.filter(item => assetIds.has(item.still_asset_id)),
      selections: this.state.selections.filter(item => shotIds.has(item.shot_id)),
      clips: this.state.clips.filter(item => shotIds.has(item.shot_id)),
    };
  }
  async createShot(projectId, input) {
    return this.add(this.state.shots, {
      ...input, id: createId('shot'), user_id: this.userId, project_id: projectId,
      created_at: timestamp(), updated_at: timestamp(),
    });
  }
  async createProviderRun(input) {
    return this.add(this.state.runs, {
      id: createId('run'), user_id: this.userId,
      provider_type: input.provider_type, provider_key: input.provider_key,
      operation: input.operation, status: input.status || 'queued',
      request_payload: input.request_payload, response_payload: input.response_payload || null,
      external_run_id: input.external_run_id || null, error_code: input.error_code || null,
      error_message: input.error_message || null, started_at: input.started_at || null,
      completed_at: input.completed_at || null, created_at: timestamp(),
    });
  }
  async updateProviderRun(id, patch) {
    Object.assign(this.state.runs.find(item => item.id === id), patch); this.save();
  }
  async addRunEvent(providerRunId, eventType, message, payload = {}) {
    this.add(this.state.events, {
      id: createId('event'), user_id: this.userId, provider_run_id: providerRunId,
      event_type: eventType, message, payload, created_at: timestamp(),
    });
  }
  async listRunHistory() {
    return { runs: [...this.state.runs].reverse(), events: [...this.state.events].reverse() };
  }
  async createStillGeneration(input) {
    return this.add(this.state.generations, {
      ...input, id: createId('generation'), user_id: this.userId,
      error_message: null, created_at: timestamp(), completed_at: null,
    });
  }
  async finishStillGeneration(id, status, errorMessage) {
    Object.assign(this.state.generations.find(item => item.id === id), {
      status, error_message: errorMessage || null, completed_at: timestamp(),
    });
    this.save();
  }
  async createStillAssets(generationId, shotId, assets) {
    return assets.map(asset => this.add(this.state.assets, {
      ...asset, id: createId('asset'), user_id: this.userId,
      still_generation_id: generationId, shot_id: shotId,
      created_at: timestamp(), signed_url: asset.external_url || undefined,
    }));
  }
  async saveReview(assetId, scores, notes) {
    const old = this.state.reviews.find(item => item.still_asset_id === assetId);
    const value = {
      id: old?.id || createId('review'), user_id: this.userId,
      still_asset_id: assetId, scores, reviewer_notes: notes,
      created_at: old?.created_at || timestamp(), updated_at: timestamp(),
    };
    this.state.reviews = this.state.reviews.filter(item => item.still_asset_id !== assetId).concat(value);
    this.save();
    return value;
  }
  async selectHero(shotId, assetId) {
    const old = this.state.selections.find(item => item.shot_id === shotId);
    const value = {
      id: old?.id || createId('selection'), user_id: this.userId,
      shot_id: shotId, still_asset_id: assetId, selection_notes: null,
      created_at: old?.created_at || timestamp(), updated_at: timestamp(),
    };
    this.state.selections = this.state.selections.filter(item => item.shot_id !== shotId).concat(value);
    this.save();
    return value;
  }
  async createClipGeneration(input) {
    return this.add(this.state.clips, {
      id: createId('clip'), user_id: this.userId, shot_id: input.shotId,
      still_asset_id: input.assetId, provider_run_id: input.providerRunId,
      provider_key: input.providerKey, motion_guidance: input.guidance,
      status: 'running', storage_path: null, external_url: null,
      error_message: null, created_at: timestamp(), completed_at: null,
    });
  }
  async finishClipGeneration(id, patch) {
    Object.assign(this.state.clips.find(item => item.id === id), patch, {
      completed_at: timestamp(), signed_url: patch.external_url || undefined,
    });
    this.save();
  }
  async createExportJob(input) {
    return this.add(this.state.exports, {
      id: createId('export'), user_id: this.userId, project_id: input.projectId,
      asset_type: input.assetType, source_asset_id: input.sourceAssetId,
      provider_run_id: input.providerRunId, provider_key: input.providerKey,
      status: 'processing', storage_path: null, external_url: null,
      aspect_ratio: input.aspectRatio, metadata: input.metadata || {},
      created_at: timestamp(), completed_at: null,
    });
  }
  async finishExportJob(id, patch) {
    Object.assign(this.state.exports.find(item => item.id === id), patch, {
      completed_at: timestamp(), signed_url: patch.external_url || undefined,
    });
    this.save();
  }
  async listExports() { return [...this.state.exports].reverse(); }
}
