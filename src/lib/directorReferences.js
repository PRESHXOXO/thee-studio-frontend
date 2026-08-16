export const MAX_DIRECTOR_REFERENCES = 6;
export const MAX_SAVED_CAST_STYLING_REFERENCES = 5;

export const DIRECTOR_REFERENCE_ROLES = [
  { id: 'identity', label: 'Identity', instruction: 'IDENTITY AUTHORITY ONLY: preserve this person’s recognizable identity and facial structure. Do not borrow wardrobe, background, hair, makeup, or pose from this image.' },
  { id: 'outfit', label: 'Outfit', instruction: 'MANDATORY OUTFIT AUTHORITY — not inspiration: reproduce the visible garments, layering, materials, construction, silhouette, fit, colors, patterns, accessories, footwear, jewelry, bag, and styling. Do not copy the reference person identity or body.' },
  { id: 'background', label: 'Background', instruction: 'MANDATORY BACKGROUND AUTHORITY — not inspiration: reproduce the visible environment, location type, architecture/layout, palette, practical lighting, spatial relationships, surfaces, and atmosphere. Do not copy people or styling from this image.' },
  { id: 'makeup', label: 'Makeup', instruction: 'MANDATORY MAKEUP AUTHORITY — not generic glam: transfer the visible eyeshadow colors, placement, shape, blending and intensity; liner/lashes; blush hue, placement and intensity; complexion finish; highlight/contour; and lip liner, color, gloss/finish onto the creator while preserving identity. Bold colors must stay visibly bold.' },
  { id: 'hair', label: 'Hair', instruction: 'MANDATORY HAIR AUTHORITY — not inspiration: transfer the visible hairstyle architecture, parting, texture/pattern, color, length, volume, silhouette, hairline/edges, finish, and hair accessories while preserving identity. Do not fall back to default hair.' },
  { id: 'pose', label: 'Pose', instruction: 'MANDATORY POSE AUTHORITY — not inspiration: match the visible body orientation, head angle/gaze, shoulder/torso angle, limb positions, hand placement, weight distribution, seated/standing relationship, crop/framing, camera height, and composition as closely as the scene allows.' },
  { id: 'supporting', label: 'Supporting', instruction: 'SUPPORTING CUES ONLY: use only clearly relevant visible cues that do not conflict with Identity, Outfit, Background, Makeup, Hair, or Pose. Never copy a recognizable identity or override another assigned authority.' },
];

export function referenceRoleLabel(role) {
  return DIRECTOR_REFERENCE_ROLES.find(option => option.id === role)?.label || 'Reference';
}

function authorityLines(references) {
  const roles = new Set(references.map(reference => reference.role));
  const lines = [
    'ROLE-LABELED VISUAL REFERENCES ARE MANDATORY AUTHORITIES, NOT LOOSE INSPIRATION. Keep every role separate and preserve each role’s observable visual attributes in the final image.',
  ];

  if (roles.has('outfit')) {
    lines.push('OUTFIT AUTHORITY: Reproduce the role-labeled OUTFIT image as the wardrobe source of truth. Preserve visible garment construction, silhouette, fit, color, materials, accessories, footwear, jewelry, bag, and styling. Ignore clothing visible in identity images and any creator-memory wardrobe defaults. Do not simplify or substitute the outfit.');
  }
  if (roles.has('makeup')) {
    lines.push('MAKEUP AUTHORITY: Transfer the role-labeled MAKEUP image’s visible eye, cheek/complexion, and lip design onto the creator: eyeshadow colors/placement/shape/intensity, liner/lashes, blush hue/placement/intensity, finish/highlight/contour, and lip liner/color/gloss. Preserve the creator’s facial identity. Do not neutralize bold makeup colors and do not copy the makeup-reference person’s face, hair, wardrobe, nails, jewelry, or pose.');
  }
  if (roles.has('hair')) {
    lines.push('HAIR AUTHORITY: Transfer the role-labeled HAIR image’s visible hairstyle structure, parting, texture/pattern, color, length, volume, silhouette, hairline/edges, finish, and hair accessories. Preserve the creator’s facial identity and do not fall back to their default hair.');
  }
  if (roles.has('background')) {
    lines.push('BACKGROUND AUTHORITY: Reproduce the role-labeled BACKGROUND image’s environment, architecture/layout, palette, practical lighting logic, spatial relationships, surfaces, and atmosphere. Do not borrow people or styling from that image.');
  }
  if (roles.has('pose')) {
    lines.push('POSE AUTHORITY: Match the role-labeled POSE image’s body orientation, head angle/gaze, shoulder/torso angle, limb positions, hand placement, weight distribution, seated/standing relationship, crop/framing, camera height, and composition. Adapt naturally to the creator without copying the pose-reference person’s identity or styling.');
  }
  if (roles.has('supporting')) {
    lines.push('SUPPORTING AUTHORITY: Use only relevant supporting visual cues. Supporting must never recast Identity or override Outfit, Background, Makeup, Hair, or Pose.');
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
    'VISUAL REFERENCE MAP — STRICT ROLE AUTHORITY:',
    ...lines,
    ...authorityLines(references),
    'Keep each image in its assigned role. Identity images establish the person only. Outfit, Makeup, Hair, Background, Pose, and Supporting must not recast identity or overwrite one another. Blend all assigned authorities into one coherent new photograph.',
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
