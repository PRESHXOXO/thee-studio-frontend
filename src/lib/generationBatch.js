export const TERMINAL_BATCH_STATUSES = new Set(['partial_success', 'succeeded', 'failed', 'cancelled']);

const SLOT_STATUSES = new Set(['queued', 'running', 'succeeded', 'provider_blocked', 'failed', 'cancelled']);

function integer(value, fallback = 0) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : fallback;
}

function normalizedStatus(raw = {}) {
  const status = String(raw.status || '').toLowerCase();
  const batchStatus = String(raw.batchStatus || '').toLowerCase();
  if (status === 'pending') return batchStatus === 'queued' ? 'queued' : 'running';
  if (status === 'queued' || status === 'running') return status;
  return TERMINAL_BATCH_STATUSES.has(status) ? status : 'succeeded';
}

function assetUrl(asset) {
  if (typeof asset === 'string') return asset;
  return asset?.url || asset?.signedUrl || asset?.imageUrl || asset?.resultUrl || null;
}

function assetId(asset) {
  return asset?.id || asset?.assetId || asset?.generationAssetId || null;
}

export function isTerminalBatchStatus(status) {
  return TERMINAL_BATCH_STATUSES.has(String(status || '').toLowerCase());
}

export function normalizeGenerationBatch(raw = {}, { requestedCount = 1, parentBatchId = null } = {}) {
  const rawAssets = Array.isArray(raw.assets) ? raw.assets : [];
  const legacyImages = Array.isArray(raw.images) ? raw.images.filter(Boolean) : [];
  const status = normalizedStatus(raw);
  const rawSlots = Array.isArray(raw.slots) ? raw.slots : [];
  const explicitRequested = integer(raw.requestedCount, 0);
  const count = Math.max(1, Math.min(5, explicitRequested || rawSlots.length || legacyImages.length || integer(requestedCount, 1) || 1));
  const assets = rawAssets.map(asset => typeof asset === 'string' ? { url: asset } : { ...asset, url: assetUrl(asset) });
  const usedAssetIndexes = new Set();

  const slotsByIndex = new Map(rawSlots.map((slot, fallbackIndex) => {
    const slotIndex = integer(slot?.slotIndex, fallbackIndex);
    return [slotIndex, { ...slot, slotIndex }];
  }));

  const slots = Array.from({ length: count }, (_, slotIndex) => {
    const source = slotsByIndex.get(slotIndex) || {};
    const sourceAssetIds = new Set(Array.isArray(source.assetIds) ? source.assetIds : []);
    let matchedAssetIndex = assets.findIndex((asset, index) => !usedAssetIndexes.has(index)
      && integer(asset?.slotIndex, -1) === slotIndex);
    if (matchedAssetIndex < 0 && sourceAssetIds.size) {
      matchedAssetIndex = assets.findIndex((asset, index) => !usedAssetIndexes.has(index) && sourceAssetIds.has(assetId(asset)));
    }

    const directUrl = assetUrl(source);
    let imageUrl = directUrl;
    if (!imageUrl && matchedAssetIndex >= 0) {
      usedAssetIndexes.add(matchedAssetIndex);
      imageUrl = assetUrl(assets[matchedAssetIndex]);
    }
    const legacyUrl = legacyImages[slotIndex] || null;
    if (!imageUrl && legacyUrl && (source.status === 'succeeded' || !rawSlots.length)) imageUrl = legacyUrl;

    let slotStatus = String(source.status || '').toLowerCase();
    if (!SLOT_STATUSES.has(slotStatus)) {
      if (imageUrl) slotStatus = 'succeeded';
      else if (status === 'queued') slotStatus = 'queued';
      else if (status === 'running') slotStatus = slotIndex === 0 ? 'running' : 'queued';
      else if (status === 'cancelled') slotStatus = 'cancelled';
      else if (status === 'failed') slotStatus = 'failed';
      else slotStatus = 'succeeded';
    }

    return { ...source, slotIndex, status: slotStatus, imageUrl };
  });

  // Some legacy/early batch responses omit slot-to-asset metadata. Assign
  // remaining signed assets to succeeded slots in slot order without packing
  // away an explicitly failed or blocked slot.
  let remainingAssetIndex = 0;
  const orderedSlots = slots.map(slot => {
    if (slot.imageUrl || slot.status !== 'succeeded') return slot;
    while (remainingAssetIndex < assets.length && usedAssetIndexes.has(remainingAssetIndex)) remainingAssetIndex += 1;
    const imageUrl = assetUrl(assets[remainingAssetIndex]);
    if (!imageUrl) return slot;
    usedAssetIndexes.add(remainingAssetIndex);
    remainingAssetIndex += 1;
    return { ...slot, imageUrl };
  });

  const derived = orderedSlots.reduce((counts, slot) => {
    if (slot.status === 'succeeded') counts.succeeded += 1;
    if (slot.status === 'provider_blocked') counts.providerBlocked += 1;
    if (slot.status === 'failed') counts.failed += 1;
    if (slot.status === 'cancelled') counts.cancelled += 1;
    return counts;
  }, { succeeded: 0, providerBlocked: 0, failed: 0, cancelled: 0 });

  return {
    ...raw,
    parentBatchId: raw.parentBatchId || raw.jobId || parentBatchId || null,
    jobId: raw.parentBatchId || raw.jobId || parentBatchId || null,
    status,
    batchStatus: status === 'queued' || status === 'running' ? status : undefined,
    requestedCount: count,
    succeededCount: integer(raw.succeededCount, derived.succeeded),
    providerBlockedCount: integer(raw.providerBlockedCount, derived.providerBlocked),
    failedCount: integer(raw.failedCount, derived.failed),
    cancelledCount: integer(raw.cancelledCount, derived.cancelled),
    assets,
    slots: orderedSlots,
    images: orderedSlots.filter(slot => slot.status === 'succeeded' && slot.imageUrl).map(slot => slot.imageUrl),
  };
}

export function generationBatchSummary(batch) {
  if (!batch) return '';
  const requested = integer(batch.requestedCount, 1);
  const succeeded = integer(batch.succeededCount, 0);
  const parts = [];
  if (batch.status === 'succeeded' && succeeded === requested) return `All ${requested} image${requested === 1 ? '' : 's'} completed`;
  parts.push(`${succeeded} of ${requested} images completed`);
  if (batch.providerBlockedCount) parts.push(`${batch.providerBlockedCount} provider-blocked`);
  if (batch.failedCount) parts.push(`${batch.failedCount} failed`);
  if (batch.cancelledCount) parts.push(`${batch.cancelledCount} cancelled`);
  return parts.join(' · ');
}
