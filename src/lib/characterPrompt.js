// Shared creator-identity prompt builder — used by Quick Shoot (Characters
// screen) and the unified Director/ShootBuilder so both consume one prompt
// template instead of two that can drift apart.
//
// outfitOverride semantics:
// - undefined: use the creator's saved wardrobe fallback
// - string: use the selected/prompted outfit override
// - null: an attached visual Outfit reference is authoritative; do not inject
//   saved creator wardrobe text into the prompt
export function buildCharacterPrompt(char, sceneName, mood, identityLocked, outfitOverride = undefined, mode = 'lifestyle', referenceRoles = []) {
  const f = char.fields || {};
  const parts = [];
  const visualOutfitAuthority = mode === 'lifestyle' && outfitOverride === null;
  const roleSet = new Set(referenceRoles.map(role => String(role).toLowerCase()));

  // IDENTITY LOCK BLOCK — prepended first when identity is locked. Body is
  // part of creator identity too: styling and pose may change, proportions do not.
  if (identityLocked) {
    const whatChanges = mode === 'portrait'
      ? 'Camera angle, expression, framing, and crop only — keep styling simple and secondary.'
      : 'Scene, pose, lighting, camera angle, styling, and mood only. Body proportions and silhouette do not change with pose or wardrobe.';

    // Pull the face anchor inside the lock block so eye color / specific features are LOCKED, not just context
    const anchorDesc = char.faceAnchor
      || (f.face ? `${f.face}${f.tone ? `. ${f.tone} complexion.` : ''}` : '');

    const lockedDetails = anchorDesc
      ? `\n\nLOCKED IDENTITY DETAILS — MUST BE PRESERVED EXACTLY:\n${anchorDesc}\nEvery detail above is non-negotiable. Do not change eye color, skin tone, facial structure, or any listed feature.`
      : '';

    const lockedBody = f.body
      ? `\n\nLOCKED BODY IDENTITY — MUST BE PRESERVED:\n${f.body}\nTreat this established physique as identity, not styling. Preserve the same overall build, silhouette, bust-to-waist-to-hip balance, torso proportions, hip and thigh fullness, limb thickness, and height/scale impression visible in the creator references. Do not slim down, shrink, enlarge, narrow, lengthen, shorten, or otherwise reshape the creator to fit an outfit, pose, trend, or generic model body.`
      : '\n\nLOCKED BODY IDENTITY — MUST BE PRESERVED:\nUse the creator identity references as authority for stable body build and proportions. Wardrobe, pose, and camera perspective may change, but the creator must not be recast into a different body type.';

    parts.push(
      `IDENTITY LOCK — DO NOT RECAST:\nUse the attached reference image(s) as the master identity anchor for ${char.name}. Preserve exact recognizable facial identity: facial proportions, skin tone, eye color, eye shape, eyebrow shape, nose shape, lips, cheekbones, jawline, hairline, and overall appearance.${lockedDetails}${lockedBody}\n\nDo not recast the subject. Do not alter ethnicity. Do not change bone structure. Do not change eye color. Do not change the established body type. Do not create a generic influencer face or generic fashion-model body. Do not over-smooth the skin. Do not make the subject look AI-generated.\n\nWHAT STAYS: Face, identity, skin tone, bone structure, eye color, recognizable presence, body build, silhouette, and established proportions.\nWHAT CHANGES: ${whatChanges}\n\nREFERENCE IMAGES ATTACHED: Identity reference images establish the person, including stable physique and proportions. Role-labeled shot references control only their assigned visual attributes and never override creator identity or body.`
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
  // identity-anchor instruction, SUBJECT, BODY IDENTITY, OUTFIT, HAIR, SCENE,
  // ART DIRECTION, POSE & COMPOSITION, LIGHTING, CAMERA & IMAGE FEEL,
  // QUALITY & RETOUCHING, FINAL GOAL.
  const possessive = f.gender === 'Man' ? 'his' : 'her';
  const personNoun = f.gender === 'Man' ? 'man' : 'woman';

  parts.push('Create a photorealistic 4K lifestyle and fashion image for a premium brand campaign.');

  if (identityLocked) {
    parts.push(
      `IMPORTANT:\nUse the uploaded identity reference as the identity anchor for ${char.name}. Preserve ${possessive} recognizable face, skin tone, body build, silhouette, stable proportions, and overall identity. ${char.name} must read as the same ${personNoun} from the identity reference, not a generic model. Treat clothing visible in identity references as incidental unless no separate Outfit reference or outfit direction is provided. Photorealistic only. No illustration, no cartoon styling, no plastic AI finish, no fantasy gloss.`
    );
  }

  // SUBJECT — face/skin description + presence/personality.
  const subjectFace = char.faceAnchor || [f.face, f.tone && `${f.tone} complexion`].filter(Boolean).join('. ');
  const subjectParts = [subjectFace, f.personality].filter(Boolean);
  if (subjectParts.length) {
    parts.push(`SUBJECT — ${char.name.toUpperCase()}:\n${subjectParts.join(' ')}`);
  }

  // BODY IDENTITY — saved creator analysis is explicit evidence and must not
  // be discarded. Visual creator references remain the final authority.
  if (identityLocked) {
    const bodyEvidence = f.body || 'Match the creator reference images exactly for overall physique, scale, silhouette, and body proportions.';
    parts.push(
      `BODY IDENTITY — LOCKED:\n${bodyEvidence}\nThis physique belongs to ${char.name} and is part of recognizable identity. Preserve the same body type and proportional relationships across every outfit and scene. Do not slim the creator down, reduce or exaggerate curves, alter bust/waist/hip balance, narrow or widen hips, change thigh or limb fullness, or substitute a generic fashion-model silhouette. Perspective and pose may affect appearance naturally, but must not change the underlying body.`
    );
  } else if (f.body) {
    parts.push(`BODY:\n${f.body}. Preserve natural, believable proportions.`);
  }

  // OUTFIT — an attached Outfit reference must own clothing direction. In
  // that case ShootBuilder passes null intentionally, so saved wardrobe text
  // cannot compete with the user's visual reference.
  if (visualOutfitAuthority) {
    parts.push(
      `OUTFIT SOURCE:\nUse the attached role-labeled OUTFIT reference as the authoritative source for clothing, accessories, materials, fit, and styling. Ignore saved creator wardrobe defaults and do not copy clothing from identity reference images. The Outfit reference controls garments only; it must never change the creator's face, physique, body proportions, or anatomy.`
    );
  } else {
    const wardrobe = outfitOverride || f.wardrobe;
    if (wardrobe) {
      parts.push(
        `OUTFIT:\nStyle ${char.name} in ${wardrobe}. All wardrobe and accessories should feel premium and believable, with real fabric weight, accurate drape, natural folds, and realistic material texture. Fit the clothing to ${char.name}'s established body without changing the body to fit the clothing.`
      );
    }
  }

  // HAIR
  if (f.hair && !roleSet.has('hair')) {
    parts.push(`HAIR:\n${f.hair}, with full strand detail, realistic density, and believable natural movement.`);
  } else if (roleSet.has('hair')) {
    parts.push('HAIR SOURCE:\nUse the attached role-labeled HAIR reference as the authoritative source for hairstyle, length, texture, color, and finish. Ignore saved creator hair defaults.');
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
    'POSE & COMPOSITION:\nThree-quarter body fashion photograph, framed clearly enough to showcase the full outfit and accessories. Preserve the creator\'s established body proportions through the pose; do not use posing or lens perspective to manufacture a different body type. Both arms fully visible and anatomically correct — neither arm cropped, hidden, or merged into the torso. Natural confident posture, candid-feeling but composed — no awkward or exaggerated poses, no stiff stance. Hands should look relaxed and realistic. Composition should feel intentional, premium, and well-balanced with tasteful negative space.'
  );
  parts.push(
    'LIGHTING:\nSoft, dimensional, photographer-quality lighting that wraps naturally around the subject. Realistic shadows, believable highlights, and depth across skin, hair, jewelry, clothing, and any environmental reflections.'
  );
  parts.push(
    'CAMERA & IMAGE FEEL:\nShot like a real premium campaign on a Canon EOS R5 with an 85mm portrait lens at f/1.4, Kodak Portra 400 film rendering. Shallow depth of field with natural bokeh. Crisp focus on the face, eyes, hair, jewelry, and outfit details. The image should feel like a real professional fashion/lifestyle shoot, not an AI prototype.'
  );
  parts.push(
    'QUALITY & RETOUCHING:\nCommercial-level retouching only. Preserve natural skin texture, visible pores, realistic highlights, the creator\'s established body proportions, accurate anatomy, believable hands, and individual hair strands. No text, logos, brand names, or graphic prints on clothing. The final image should feel polished and premium without erasing humanity.'
  );

  parts.push(
    `FINAL GOAL:\nA photorealistic${sceneName ? ` ${sceneName.toLowerCase()}` : ''} fashion campaign image of ${char.name} that feels polished, stylish, and expensive — like it was captured by a real photographer for a premium lifestyle brand. The image must feel believable, natural, and editorial, while clearly showcasing the requested outfit and styling without altering the creator's recognizable body identity.`
  );

  return parts.join('\n\n');
}