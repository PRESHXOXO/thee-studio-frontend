import { getSupabase } from '../lib/supabase.js';

async function callLibrary(body) {
  const { data, error } = await getSupabase().functions.invoke('library-items', { body });
  if (error) throw new Error(data?.error || error.message || 'Library request failed.');
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function listLibraryItems() {
  return (await callLibrary({ action: 'list' })).items || [];
}

export async function saveGeneratedLibraryItem(metadata) {
  return (await callLibrary({
    action: 'save_generated', parentBatchId: metadata.parentBatchId,
    slotIndex: metadata.slotIndex, sceneShotId: metadata.sceneShotId,
    source: metadata.source, workflow: metadata.settings?.workflow,
    creatorId: metadata.character, campaignId: metadata.campaign,
    prompt: metadata.prompt, settings: metadata.settings,
  })).item;
}

export async function registerUploadedLibraryItem(storagePath, metadata) {
  return (await callLibrary({
    action: 'register_upload', storagePath, source: metadata.source,
    creatorId: metadata.character, campaignId: metadata.campaign,
    prompt: metadata.prompt, settings: metadata.settings,
  })).item;
}

export async function updateLibraryReview(itemId, status, notes) {
  return (await callLibrary({ action: 'update_review', itemId, status, notes })).item;
}

export async function softDeleteLibraryItem(itemId) {
  return (await callLibrary({ action: 'delete', itemId })).item;
}

export async function restoreLibraryItem(itemId) {
  return (await callLibrary({ action: 'restore', itemId })).item;
}
