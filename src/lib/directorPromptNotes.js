const WARDROBE_SENTENCE_INTENT = /\b(?:wear(?:ing)?|outfit|wardrobe|garment|clothing|dress|gown|suit|jacket|coat|shirt|top|pants|jeans|skirt|hoodie|sweater|shoes|heels|sneakers|bikini|swimsuit|swimwear|one[- ]piece|two[- ]piece|bodysuit|jumpsuit|romper|corset)\b/i;

/**
 * A role-labeled Outfit reference is the wardrobe source of truth. When one
 * is active, stale wardrobe sentences from Director Notes must not contradict
 * the newly attached image. Non-wardrobe direction (identity, hair, scene,
 * pose, lighting, camera, mood) stays intact.
 */
export function directorNotesForReferences(notes, referenceRoles = []) {
  const value = typeof notes === 'string' ? notes.trim() : '';
  if (!value || !referenceRoles.includes('outfit')) return value;

  return value
    .split(/(?<=[.!?])\s+|\n+/)
    .map(sentence => sentence.trim())
    .filter(Boolean)
    .filter(sentence => !WARDROBE_SENTENCE_INTENT.test(sentence))
    .join(' ')
    .trim();
}
