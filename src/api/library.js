import { getSupabase } from '../lib/supabase.js';

async function callLibrary(body) {
  const { data, error } = await getSupabase().functions.invoke('library-items', { body });
  if (error) throw new Error(data?.error || error.message || 'Library request failed.');
  if (data?.error) throw new Error(data.error);
  return data;
}

async function refreshLibraryItemUrl(item) {
  if (!item?.originalStoragePath) return item;
  try {
    const bucket = item.originalStorageBucket || 'generation-assets';
    const { data, error } = await getSupabase().storage
      .from(bucket)
      .createSignedUrl(item.originalStoragePath, 3600);
    if (!error && data?.signedUrl) return { ...item, url: data.signedUrl };
  } catch {}
  return item;
}

async function refreshLibraryItems(items = []) {
  return Promise.all(items.map(refreshLibraryItemUrl));
}

export async function listLibraryItems() {
  return refreshLibraryItems((await callLibrary({ action: 'list' })).items || []);
}

export async function saveGeneratedLibraryItem(metadata) {
  const item = (await callLibrary({
    action: 'save_generated', parentBatchId: metadata.parentBatchId,
    slotIndex: metadata.slotIndex, sceneShotId: metadata.sceneShotId,
    source: metadata.source, workflow: metadata.settings?.workflow,
    creatorId: metadata.character, campaignId: metadata.campaign,
    prompt: metadata.prompt, settings: metadata.settings,
  })).item;
  return refreshLibraryItemUrl(item);
}

export async function registerUploadedLibraryItem(storagePath, metadata) {
  const item = (await callLibrary({
    action: 'register_upload', storagePath, source: metadata.source,
    creatorId: metadata.character, campaignId: metadata.campaign,
    prompt: metadata.prompt, settings: metadata.settings,
  })).item;
  return refreshLibraryItemUrl(item);
}

export async function updateLibraryReview(itemId, status, notes) {
  const item = (await callLibrary({ action: 'update_review', itemId, status, notes })).item;
  return refreshLibraryItemUrl(item);
}

export async function softDeleteLibraryItem(itemId) {
  return (await callLibrary({ action: 'delete', itemId })).item;
}

export async function restoreLibraryItem(itemId) {
  const item = (await callLibrary({ action: 'restore', itemId })).item;
  return refreshLibraryItemUrl(item);
}
