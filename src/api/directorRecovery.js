import { getSupabase } from '../lib/supabase.js';

const PENDING_STORAGE_PREFIX = 'thee-studio:director-pending:v2:';

function storageKey(scopeKey) {
  return `${PENDING_STORAGE_PREFIX}${encodeURIComponent(scopeKey || 'director')}`;
}

function parseRecord(raw) {
  if (!raw) return null;
  try {
    const record = JSON.parse(raw);
    return record?.parentBatchId || record?.jobId ? record : null;
  } catch {
    return null;
  }
}

function readExact(scopeKey) {
  const key = storageKey(scopeKey);
  return parseRecord(globalThis.sessionStorage?.getItem(key))
    || parseRecord(globalThis.localStorage?.getItem(key));
}

function scopeParts(scopeKey = '') {
  const parts = String(scopeKey).split(':');
  return {
    workflow: parts[0] || '',
    creatorId: parts[1] && parts[1] !== 'open' ? parts[1] : null,
    outputType: parts[0] === 'talk' ? parts[2] || 'photo' : null,
  };
}

function compatibleScope(currentScope, candidateScope) {
  const current = scopeParts(currentScope);
  const candidate = scopeParts(candidateScope);
  if (!current.workflow || current.workflow !== candidate.workflow) return false;
  if (current.outputType && current.outputType !== candidate.outputType) return false;
  if (current.creatorId && current.creatorId !== candidate.creatorId) return false;
  return true;
}

function recordsFromStorage(storage, scopeKey) {
  if (!storage) return [];
  const found = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key?.startsWith(PENDING_STORAGE_PREFIX)) continue;
    const encodedScope = key.slice(PENDING_STORAGE_PREFIX.length);
    let candidateScope = '';
    try { candidateScope = decodeURIComponent(encodedScope); } catch { continue; }
    if (!compatibleScope(scopeKey, candidateScope)) continue;
    const record = parseRecord(storage.getItem(key));
    if (record) found.push({ ...record, sourceScopeKey: candidateScope });
  }
  return found;
}

function persistRecoveredPointer(scopeKey, record) {
  const normalized = {
    ...record,
    scopeKey,
    recoveredAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const value = JSON.stringify(normalized);
  const key = storageKey(scopeKey);
  try { globalThis.sessionStorage?.setItem(key, value); } catch {}
  try { globalThis.localStorage?.setItem(key, value); } catch {}
  return normalized;
}

function findCompatibleBrowserPointer(scopeKey) {
  const exact = readExact(scopeKey);
  if (exact) return persistRecoveredPointer(scopeKey, exact);

  const candidates = [
    ...recordsFromStorage(globalThis.sessionStorage, scopeKey),
    ...recordsFromStorage(globalThis.localStorage, scopeKey),
  ];
  const unique = new Map();
  for (const record of candidates) {
    const parentBatchId = record.parentBatchId || record.jobId;
    if (parentBatchId && !unique.has(parentBatchId)) unique.set(parentBatchId, record);
  }
  if (unique.size !== 1) return null;
  return persistRecoveredPointer(scopeKey, [...unique.values()][0]);
}

/**
 * Restore the browser pointer for an already-running Director batch.
 * This function does not poll status, continue slots, retry slots, or call an
 * image provider. Server discovery is read-only and fails closed when more
 * than one active batch could match.
 */
export async function recoverDirectorPendingPointer(scopeKey) {
  const browserRecord = findCompatibleBrowserPointer(scopeKey);
  if (browserRecord) return browserRecord;

  const { creatorId } = scopeParts(scopeKey);
  const { data, error } = await getSupabase().functions.invoke('cast-quick-shoot-recover', {
    body: { creatorId },
  });
  if (error) throw new Error(error.message || 'Director could not check for an unfinished render.');
  if (!data || data.status !== 'found' || !data.parentBatchId) return null;

  return persistRecoveredPointer(scopeKey, {
    parentBatchId: data.parentBatchId,
    jobId: data.parentBatchId,
    requestedCount: data.requestedCount || 1,
    status: data.batchStatus || 'running',
    batch: {
      parentBatchId: data.parentBatchId,
      requestedCount: data.requestedCount || 1,
      status: data.batchStatus || 'running',
    },
    serverRecovered: true,
  });
}
