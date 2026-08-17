export const DIRECTOR_PENDING_MAX_AGE_MS = 6 * 60 * 60 * 1000;
const CLOCK_SKEW_MS = 5 * 60 * 1000;

export function isFreshDirectorPendingRecord(record, now = Date.now()) {
  if (!record?.parentBatchId && !record?.jobId) return false;
  const createdAt = Date.parse(record.createdAt);
  if (!Number.isFinite(createdAt)) return false;
  const age = now - createdAt;
  return age >= -CLOCK_SKEW_MS && age <= DIRECTOR_PENDING_MAX_AGE_MS;
}
