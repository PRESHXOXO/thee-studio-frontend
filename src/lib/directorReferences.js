export const MAX_DIRECTOR_REFERENCES = 4;

export const DIRECTOR_REFERENCE_ROLES = [
  { id: 'identity', label: 'Identity', instruction: 'Preserve this person’s recognizable identity and facial structure.' },
  { id: 'outfit', label: 'Outfit', instruction: 'Use the clothing, styling, fit, materials, and accessories from this image.' },
  { id: 'background', label: 'Background', instruction: 'Use this environment, location design, palette, lighting logic, and spatial mood.' },
  { id: 'makeup', label: 'Makeup', instruction: 'Use this makeup look, color placement, finish, and beauty styling without copying identity.' },
  { id: 'hair', label: 'Hair', instruction: 'Use this hairstyle, texture, color, length, and finish without copying identity.' },
  { id: 'pose', label: 'Pose', instruction: 'Use this pose, framing, body language, and composition without copying identity.' },
];

export function referenceRoleLabel(role) {
  return DIRECTOR_REFERENCE_ROLES.find(option => option.id === role)?.label || 'Reference';
}

function authorityLines(references) {
  const roles = new Set(references.map(reference => reference.role));
  const lines = [];

  if (roles.has('outfit')) {
    lines.push('OUTFIT AUTHORITY: The role-labeled OUTFIT image controls clothing, accessories, materials, fit, and styling. Ignore clothing visible in identity images and any older creator-profile or creator-memory wardrobe defaults.');
  }
  if (roles.has('makeup')) {
    lines.push('MAKEUP AUTHORITY: The role-labeled MAKEUP image controls the beauty look. Preserve the creator’s facial identity; do not copy the makeup reference person’s face.');
  }
  if (roles.has('hair')) {
    lines.push('HAIR AUTHORITY: The role-labeled HAIR image controls hairstyle, texture, color, length, and finish. Preserve the creator’s facial identity.');
  }
  if (roles.has('background')) {
    lines.push('BACKGROUND AUTHORITY: The role-labeled BACKGROUND image controls the environment and location design. Do not borrow people or wardrobe from that image.');
  }
  if (roles.has('pose')) {
    lines.push('POSE AUTHORITY: The role-labeled POSE image controls pose, body language, framing, and composition only. Do not copy that person’s identity or clothing.');
  }

  return lines;
}

export function referencePromptBlock(references = [], { startsAfterIdentity = false } = {}) {
  if (!references.length) return '';
  const lines = references.map((reference, index) => {
    const option = DIRECTOR_REFERENCE_ROLES.find(item => item.id === reference.role)
      || DIRECTOR_REFERENCE_ROLES[0];
    const imageNumber = index + 1 + (startsAfterIdentity ? 1 : 0);
    return `Image ${imageNumber} — ${option.label.toUpperCase()}: ${option.instruction}`;
  });
  return [
    'VISUAL REFERENCE MAP:',
    ...lines,
    ...authorityLines(references),
    'Keep each image in its assigned role. Identity images establish the person only. Do not borrow a face from outfit, makeup, hair, background, or pose references. Blend the assigned cues into one coherent new photograph.',
  ].join('\n');
}

export function serializeDirectorReferences(references = []) {
  return JSON.stringify(
    references.slice(0, MAX_DIRECTOR_REFERENCES).map(reference => ({
      image: reference.dataUrl,
      role: reference.role || 'identity',
      name: reference.name || 'Reference',
    }))
  );
}