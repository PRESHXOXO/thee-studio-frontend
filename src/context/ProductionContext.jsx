import React from 'react';
import { useAuth } from './AuthContext.jsx';
import { getSupabase } from '../lib/supabase.js';
import { LocalPipelineRepository } from '../production/LocalPipelineRepository.js';
import { SupabasePipelineRepository } from '../production/SupabasePipelineRepository.js';
import { createProviderRegistry } from '../production/providers.js';
import { PipelineService } from '../production/PipelineService.js';
import { loadCharacters, saveCharacters } from '../lib/creatorCache.js';
import { syncAllCastCreatorsToCloud } from '../lib/castCreatorSync.js';

const ProductionContext = React.createContext(null);

export function ProductionProvider({ children }) {
  const auth = useAuth();
  const runtime = React.useMemo(() => {
    if (!auth.session) return null;
    if (auth.mode === 'cloud') {
      const db = getSupabase();
      const repository = new SupabasePipelineRepository(db, auth.session.id);
      return {
        repository,
        pipeline: new PipelineService(repository, createProviderRegistry(db)),
        isCloud: true,
      };
    }
    const repository = new LocalPipelineRepository(auth.session.id);
    return {
      repository,
      pipeline: new PipelineService(repository, createProviderRegistry(null)),
      isCloud: false,
    };
  }, [auth.mode, auth.session]);

  // Canonicalize legacy Cast creators as part of account hydration rather than
  // waiting for a manual Cast save. The browser cache has already been scoped
  // to this user by AuthContext before session changes, so these are only this
  // account's creators. Sync is idempotent: existing UUID links/reference
  // fingerprints are reused and non-Cast canonical references are preserved.
  React.useEffect(() => {
    if (!runtime?.isCloud || !auth.session?.id) return undefined;
    let cancelled = false;
    const reconcile = async () => {
      const current = loadCharacters();
      if (!current.length) return;
      try {
        const linked = await syncAllCastCreatorsToCloud(runtime.repository, current);
        if (cancelled || !linked.length) return;
        const cloudIdBySavedId = new Map(linked.map(item => [String(item.savedId), item.cloudCreator.id]));
        let changed = false;
        const next = current.map(creator => {
          const cloudCreatorId = cloudIdBySavedId.get(String(creator.id));
          if (!cloudCreatorId || creator.cloudCreatorId === cloudCreatorId) return creator;
          changed = true;
          return { ...creator, cloudCreatorId };
        });
        if (changed) saveCharacters(next);
      } catch (error) {
        // Migration failure must never block the studio shell. The original
        // account-scoped Cast document remains intact and a later session/save
        // can retry the same idempotent migration.
        console.warn('Cast cloud migration deferred:', error);
      }
    };
    void reconcile();
    return () => { cancelled = true; };
  }, [runtime, auth.session?.id]);

  const [usage, setUsage] = React.useState({ included: 200, used: 0, remaining: 200 });
  const refreshUsage = React.useCallback(async () => {
    if (!runtime) return;
    try { setUsage(await runtime.repository.getUsageSummary()); } catch {}
  }, [runtime]);
  React.useEffect(() => { void refreshUsage(); }, [refreshUsage]);

  const value = React.useMemo(() => runtime ? { ...runtime, usage, refreshUsage } : null, [runtime, usage, refreshUsage]);

  return <ProductionContext.Provider value={value}>{children}</ProductionContext.Provider>;
}

export function useProduction() {
  const value = React.useContext(ProductionContext);
  if (!value) throw new Error('Production workspace is unavailable.');
  return value;
}
