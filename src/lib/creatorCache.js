import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { persistCloudDocument } from './cloudStore.js';

const MAX_CLOUD_PREVIEW_CHARS = 220000;

function cacheSafeCharacter(character) {
  if (!character || character.cloudProfile !== true) return character;

  // Cloud creator reference images already live in private Supabase storage.
  // `ts_characters` is only a lightweight roster/cache, so never duplicate a
  // full reference pack into localStorage. At most keep one bounded inline
  // thumbnail for the Cast card; generation always resolves canonical refs
  // from the cloud creator id.
  const candidates = [
    ...(Array.isArray(character.refImages) ? character.refImages : []),
    character.image,
  ];
  const preview = candidates.find(value => (
    typeof value === 'string'
    && value.startsWith('data:image/')
    && value.length <= MAX_CLOUD_PREVIEW_CHARS
  )) || null;

  return {
    ...character,
    refImages: [],
    image: preview,
  };
}

export function serializeCharactersForStorage(list) {
  const safeList = Array.isArray(list) ? list.map(cacheSafeCharacter) : [];
  return JSON.stringify(safeList);
}

// Single canonical reader for the `ts_characters` local cache. Components
// must not construct/read this storage key themselves.
//
// Account isolation at the storage layer already exists: AuthContext awaits
// bootstrapCloudStore(userId) — which calls clearUserScopedCache() and then
// repopulates only from *this* user's studio_documents rows — before it ever
// updates `session`, so by the time `session.id` changes in React, this key
// already holds only the new user's data (or is empty). The gap this module
// closes is React state that was read once at mount (`useState(loadCharacters)`)
// and never re-read, which stays stale in memory across an account switch
// even though the underlying storage was correctly swapped out from under it.
export function loadCharacters() {
  try { return JSON.parse(localStorage.getItem('ts_characters') || '[]'); } catch { return []; }
}

// Simple writer for callers that don't need Characters.jsx's own quota-safe
// rollback (that screen keeps its bespoke saveCharacters — this is for the
// simpler write sites: TheeDirector's save-as-anchor, ImageGenerator's
// legacy-roster merge).
export function saveCharacters(list) {
  try {
    const value = serializeCharactersForStorage(list);
    localStorage.setItem('ts_characters', value);
    void persistCloudDocument('ts_characters', value).catch(() => undefined);
    return true;
  } catch {
    // Best-effort callers can continue to use their in-memory state; strict
    // save flows can inspect the false return and surface a useful message.
    return false;
  }
}

// Session-aware replacement for `React.useState(loadCharacters)`. Re-reads
// the (already account-scoped) storage whenever the authenticated user
// changes — including sign-out, where `session` becomes null and this
// resolves to an empty list rather than continuing to show the previous
// account's cached creators.
export function useCachedCreators() {
  const { session } = useAuth();
  const [characters, setCharacters] = React.useState(loadCharacters);
  const sessionIdRef = React.useRef(session?.id ?? null);

  React.useEffect(() => {
    const nextId = session?.id ?? null;
    if (sessionIdRef.current === nextId) return;
    sessionIdRef.current = nextId;
    setCharacters(loadCharacters());
  }, [session?.id]);

  return [characters, setCharacters];
}
