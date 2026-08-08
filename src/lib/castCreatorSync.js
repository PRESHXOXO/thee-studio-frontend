// Bridges a Cast-saved creator (Characters.jsx's local characters array,
// legacy Date.now() ids) to a real Supabase `creators` row, reusing the
// existing studio_source_id-keyed sync (repository.syncStudioCreators) that
// CampaignStudio already relies on elsewhere — not a second persistence
// implementation. Idempotent: a creator already linked by studio_source_id
// is found and returned, not duplicated. Account isolation is inherited
// entirely from the injected repository (SupabasePipelineRepository scopes
// every read/write by its own authenticated userId) — this helper never
// takes or trusts a userId itself.
export async function linkCastCreatorToCloud(repository, studioCreators, savedId) {
  if (!repository?.syncStudioCreators || !repository?.listCreators) return null;
  await repository.syncStudioCreators(studioCreators);
  const cloudCreators = await repository.listCreators();
  return cloudCreators.find(creator => String(creator.studio_source_id) === String(savedId)) || null;
}
