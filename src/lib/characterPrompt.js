// Shared creator-identity prompt builder — used by Quick Shoot (Characters
// screen) and the unified Director/ShootBuilder so both consume one prompt
// template instead of two that can drift apart.
export function buildCharacterPrompt(char, sceneName, mood, identityLocked, outfitOverride = null, mode = 'lifestyle') {
  const f = char.fields || {};
  const parts = [];

  // IDENTITY LOCK BLOCK — prepended first when identity is locked
  if (identityLocked) {
    const whatChanges = mode === 'portrait'
      ? 'Camera angle, expression, framing, and crop only — keep styling simple and secondary.'
      : 'Scene, wardrobe, pose, lighting, camera angle, styling, and mood only.';

    // Pull the face anchor inside the lock block so eye color / specific features are LOCKED, not just context
    const anchorDesc = char.faceAnchor
      || (f.face ? `${f.face}${f.tone ? `. ${f.tone} complexion.` : ''}` : '');

    const lockedDetails = anchorDesc
      ? `\n\nLOCKED IDENTITY DETAILS — MUST BE PRESERVED EXACTLY:\n${anchorDesc}\nEvery detail above is non-negotiable. Do not change eye color, skin tone, facial structure, or any listed feature.`
      : '';

    parts.push(
      `IDENTITY LOCK — DO NOT RECAST:\nUse the attached reference image(s) as the master identity anchor for ${char.name}. Preserve exact recognizable facial identity: facial proportions, skin tone, eye color, eye shape, eyebrow shape, nose shape, lips, cheekbones, jawline, hairline, and overall appearance.${lockedDetails}\n\nDo not recast the subject. Do not alter ethnicity. Do not change bone structure. Do not change eye color. Do not create a generic influencer face. Do not over-smooth the skin. Do not make the subject look AI-generated.\n\nWHAT STAYS: Face, identity, skin tone, bone structure, eye color, recognizable presence.\nWHAT CHANGES: ${whatChanges}\n\nREFERENCE IMAGES ATTACHED: The subject in the output must match the same person from all attached reference images.`
    );
  }

  // PORTRAIT MODE — simplified prompt, return early
  if (mode === 'portrait') {
    // outfitOverride carries the angle string in portrait mode
    const angle = outfitOverride || 'front-facing';
    if (char.faceAnchor) {
      parts.push(`TALENT — ${char.name}: ${char.faceAnchor}.`);
    } else if (f.face || f.tone) {
      parts.push(`TALENT — ${char.name}: ${[f.face, f.tone && `${f.tone} complexion`].filter(Boolean).join('. ')}.`);
    }
    parts.push(`PORTRAIT: Realistic photographic portrait. ${angle}. Head-and-shoulders framing. Neutral clean background. Natural studio lighting. Plain opaque crew-neck top in a neutral tone. Styling stays simple and secondary to the face. Preserve exact identity. No complex scene, no props, no other people.`);
    parts.push('QUALITY: Ultra-realistic portrait photography. Natural skin texture. Believable facial features. Shot on 85mm lens at f/2.8. Crisp focus on the eyes, eyelashes, brows, skin texture, and individual hair strands.');
    parts.push('AVOID: Face drift, altered bone structure, changed ethnicity, generic model face, over-smoothed skin, AI look, warped features, soft focus, motion blur.');
    return parts.join('\n\n');
  }

  // LIFESTYLE MODE — full prompt. Standard template: opening line, IMPORTANT
  // identity-anchor instruction, SUBJECT, OUTFIT, HAIR, SCENE, ART DIRECTION,
  // POSE & COMPOSITION, LIGHTING, CAMERA & IMAGE FEEL, QUALITY & RETOUCHING,
  // NEGATIVE INSTRUCTIONS, FINAL GOAL.
  const possessive = f.gender === 'Man' ? 'his' : 'her';
  const personNoun = f.gender === 'Man' ? 'man' : 'woman';

  parts.push('Create a photorealistic 4K lifestyle and fashion image for a premium brand campaign.');

  if (identityLocked) {
    parts.push(
      `IMPORTANT:\nUse the uploaded reference image as the identity anchor for ${char.name}. Preserve ${possessive} recognizable face, beauty, skin tone, and overall look. ${char.name} must read as the same ${personNoun} from the reference image, not a generic model. Photorealistic only. No illustration, no cartoon styling, no plastic AI finish, no fantasy gloss.`
    );
  }

  // SUBJECT — merged face/skin description + presence/personality in one
  // flowing paragraph. Body descriptors intentionally excluded: they trigger
  // OpenAI output moderation when combined with fashion framing, and build
  // is already locked via the reference image.
  const subjectFace = char.faceAnchor || [f.face, f.tone && `${f.tone} complexion`].filter(Boolean).join('. ');
  const subjectParts = [subjectFace, f.personality].filter(Boolean);
  if (subjectParts.length) {
    parts.push(`SUBJECT — ${char.name.toUpperCase()}:\n${subjectParts.join(' ')}`);
  }

  // OUTFIT
  const wardrobe = outfitOverride || f.wardrobe;
  if (wardrobe) {
    parts.push(
      `OUTFIT:\nStyle ${char.name} in ${wardrobe}. All wardrobe and accessories should feel premium and believable, with real fabric weight, accurate drape, natural folds, and realistic material texture.`
    );
  }

  // HAIR
  if (f.hair) {
    parts.push(`HAIR:\n${f.hair}, with full strand detail, realistic density, and believable natural movement.`);
  }

  // SCENE
  if (sceneName) {
    parts.push(
      `SCENE:\n${sceneName}. The setting should feel authentic and lived-in, not like a generic studio backdrop — premium materials, natural or ambient light, and a believable atmosphere.`
    );
  }

  // ART DIRECTION
  const artDirectionParts = [mood || 'Clean'].filter(Boolean);
  if (f.niche) artDirectionParts.push(f.niche);
  parts.push(`ART DIRECTION:\n${artDirectionParts.join(' — ')} lighting with a premium campaign feel. Warm refined color grading. The environment should feel cinematic, elevated, and believable.`);

  parts.push(
    'POSE & COMPOSITION:\nThree-quarter body fashion photograph, framed clearly enough to showcase the full outfit and accessories. Both arms fully visible and anatomically correct — neither arm cropped, hidden, or merged into the torso. Natural confident posture, candid-feeling but composed — no awkward or exaggerated poses, no stiff stance. Hands should look relaxed and realistic. Composition should feel intentional, premium, and well-balanced with tasteful negative space.'
  );
  parts.push(
    'LIGHTING:\nSoft, dimensional, photographer-quality lighting that wraps naturally around the subject. Realistic shadows, believable highlights, and depth across skin, hair, jewelry, clothing, and any environmental reflections.'
  );
  parts.push(
    'CAMERA & IMAGE FEEL:\nShot like a real premium campaign on a Canon EOS R5 with an 85mm portrait lens at f/1.4, Kodak Portra 400 film rendering. Shallow depth of field with natural bokeh. Crisp focus on the face, eyes, hair, jewelry, and outfit details. The image should feel like a real professional fashion/lifestyle shoot, not an AI prototype.'
  );
  parts.push(
    'QUALITY & RETOUCHING:\nCommercial-level retouching only. Preserve natural skin texture, visible pores, realistic highlights, natural body proportions, accurate anatomy, believable hands, and individual hair strands. No text, logos, brand names, or graphic prints on clothing. The final image should feel polished and premium without erasing humanity.'
  );

  parts.push(
    `FINAL GOAL:\nA photorealistic${sceneName ? ` ${sceneName.toLowerCase()}` : ''} fashion campaign image of ${char.name} that feels polished, stylish, and expensive — like it was captured by a real photographer for a premium lifestyle brand. The image must feel believable, natural, and editorial, while clearly showcasing the outfit and styling.`
  );

  return parts.join('\n\n');
}
