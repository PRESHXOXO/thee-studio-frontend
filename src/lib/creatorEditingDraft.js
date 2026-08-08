// Regression for: "TypeError: Cannot read properties of null (reading
// 'refImages')" — thrown when a reference-photo upload's FileReader.onload
// callback ran `setEditing(ed => ({ ...ed, refImages: [...(ed.refImages ||
// [])...] }))` while `ed` (Characters.jsx's editing-draft state) was null.
// This happens because an empty reference slot's upload control (see
// RefImageSlot in Characters.jsx) is clickable while simply *viewing* a
// saved active creator — editing mode was never entered, so `editing` is
// still null when the upload resolves.

const EMPTY_FIELDS_KEYS = ['face', 'hair', 'body', 'wardrobe', 'tone', 'personality', 'niche'];

/** Builds an editing-draft object from a saved creator record. Migrates the
 * legacy single-image field to refImages. Shared by handleEdit and the
 * upload-handler fallback below so both seed identically. */
export function buildEditingDraft(char) {
  const refImages = char.refImages?.length
    ? char.refImages
    : char.image ? [char.image] : [];
  return { name: char.name, refImages, faceAnchor: char.faceAnchor || '', fields: { ...char.fields } };
}

/** Never returns null. If an editing draft already exists, returns it
 * unchanged (identity preserved so this is a safe no-op inside a setState
 * updater). Otherwise seeds one from the currently active saved creator —
 * preserving its existing references — or, if there's no active creator
 * either (a genuinely blank slate), a fresh empty draft. */
export function resolveEditingDraft(editingDraft, activeCreator) {
  if (editingDraft) return editingDraft;
  if (activeCreator) return buildEditingDraft(activeCreator);
  return { name: '', refImages: [], fields: Object.fromEntries(EMPTY_FIELDS_KEYS.map(key => [key, ''])) };
}
