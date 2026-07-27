import React from 'react';
import { useAuth } from './AuthContext.jsx';
import { getSupabase } from '../lib/supabase.js';
import { LocalPipelineRepository } from '../production/LocalPipelineRepository.js';
import { SupabasePipelineRepository } from '../production/SupabasePipelineRepository.js';
import { createProviderRegistry } from '../production/providers.js';
import { PipelineService } from '../production/PipelineService.js';

const ProductionContext = React.createContext(null);

export function ProductionProvider({ children }) {
  const auth = useAuth();
  const value = React.useMemo(() => {
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

  return <ProductionContext.Provider value={value}>{children}</ProductionContext.Provider>;
}

export function useProduction() {
  const value = React.useContext(ProductionContext);
  if (!value) throw new Error('Production workspace is unavailable.');
  return value;
}
