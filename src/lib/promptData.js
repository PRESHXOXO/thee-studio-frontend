// Shared creative prompt data and builder logic for Image Generator and Thee Director.

export const CONTENT_TYPES = ['Portrait', 'Beauty', 'Fashion', 'Lifestyle', 'Product', 'UGC', 'Campaign', 'Social Post', 'Cinematic Still', 'Travel / Hospitality'].map(v => ({ value: v, label: v }));
export const MOODS         = ['Clean', 'Soft', 'Luxury', 'Bold', 'Romantic', 'Playful', 'Editorial', 'Candid', 'Cinematic', 'Elevated Casual'].map(v => ({ value: v, label: v }));
export const LOCATIONS     = [
  'None', 'Yacht', 'Penthouse', 'Private Jet', 'Rooftop', 'Poolside',
  'Studio', 'Boutique Hotel', 'Art Gallery', 'Night Club', 'Garden',
  'Beach', 'Desert', 'Bedroom', 'Podcast Studio', 'Luxury Car',
].map(v => ({ value: v, label: v }));

export const SKIN_TONES = [
  { value: 'Unspecified', label: 'Unspecified' },
  { value: 'deep ebony with cool undertones',          label: 'Deep Ebony — cool' },
  { value: 'deep ebony with warm red undertones',      label: 'Deep Ebony — warm red' },
  { value: 'rich deep brown with golden undertones',   label: 'Rich Deep Brown — golden' },
  { value: 'warm espresso brown',                      label: 'Warm Espresso Brown' },
  { value: 'deep caramel with warm golden glow',       label: 'Deep Caramel — golden' },
  { value: 'warm chocolate brown',                     label: 'Warm Chocolate Brown' },
  { value: 'chestnut brown with red undertones',       label: 'Chestnut Brown — red' },
  { value: 'medium golden caramel',                    label: 'Medium Golden Caramel' },
  { value: 'warm caramel with honey undertones',       label: 'Warm Caramel — honey' },
  { value: 'rich medium brown with olive undertones',  label: 'Medium Brown — olive' },
  { value: 'warm tan with golden undertones',          label: 'Warm Tan — golden' },
  { value: 'warm olive complexion',                    label: 'Warm Olive' },
  { value: 'light honey beige',                        label: 'Light Honey Beige' },
  { value: 'warm beige with pink undertones',          label: 'Warm Beige — pink' },
  { value: 'cool beige with neutral undertones',       label: 'Cool Beige — neutral' },
  { value: 'fair ivory with warm undertones',          label: 'Fair Ivory — warm' },
  { value: 'porcelain fair with cool pink undertones', label: 'Porcelain — cool pink' },
];

export const HAIR_STYLES = [
  { value: 'Unspecified', label: 'Unspecified' },
  { value: 'box braids, waist length',         label: 'Box Braids — waist' },
  { value: 'knotless braids, shoulder length', label: 'Knotless Braids — shoulder' },
  { value: 'Senegalese twists',                label: 'Senegalese Twists' },
  { value: 'goddess locs',                     label: 'Goddess Locs' },
  { value: 'faux locs, bohemian',              label: 'Faux Locs — bohemian' },
  { value: 'traditional dreadlocks',           label: 'Traditional Locs' },
  { value: 'sisterlocks',                      label: 'Sisterlocks' },
  { value: 'cornrows, sleek',                  label: 'Cornrows — sleek' },
  { value: 'full natural afro',                label: 'Full Natural Afro' },
  { value: 'TWA tapered natural',              label: 'TWA — tapered' },
  { value: 'bantu knots',                      label: 'Bantu Knots' },
  { value: 'silk press, bone straight',        label: 'Silk Press — bone straight' },
  { value: 'sleek blowout, voluminous',        label: 'Sleek Blowout' },
  { value: 'sleek high ponytail',              label: 'Sleek High Ponytail' },
  { value: 'long loose curls, natural',        label: 'Long Loose Curls' },
  { value: 'beachy waves',                     label: 'Beachy Waves' },
  { value: 'body waves, glossy',               label: 'Body Waves — glossy' },
  { value: 'finger waves, vintage',            label: 'Finger Waves — vintage' },
  { value: 'sleek bob, chin length',           label: 'Sleek Bob' },
  { value: 'long straight, ultra sleek',       label: 'Long Straight — sleek' },
  { value: 'pixie cut',                        label: 'Pixie Cut' },
  { value: 'space buns',                       label: 'Space Buns' },
];

export const HAIR_COLORS = [
  { value: 'Unspecified', label: 'Unspecified' },
  { value: 'natural jet black',              label: 'Natural Jet Black' },
  { value: 'blue-black, high shine',         label: 'Blue-Black — high shine' },
  { value: 'dark espresso brown',            label: 'Dark Espresso Brown' },
  { value: 'rich dark brown',               label: 'Rich Dark Brown' },
  { value: 'warm chestnut brown',            label: 'Warm Chestnut Brown' },
  { value: 'auburn with red tones',          label: 'Auburn — red tones' },
  { value: 'copper red, vibrant',            label: 'Copper Red — vibrant' },
  { value: 'warm honey blonde',              label: 'Warm Honey Blonde' },
  { value: 'golden blonde, sun-kissed',      label: 'Golden Blonde' },
  { value: 'platinum blonde',               label: 'Platinum Blonde' },
  { value: 'ash blonde, cool toned',         label: 'Ash Blonde — cool' },
  { value: 'caramel highlights, ombre',      label: 'Caramel Ombre' },
  { value: 'dark to blonde ombre',           label: 'Dark to Blonde Ombre' },
  { value: 'burgundy wine',                  label: 'Burgundy / Wine' },
  { value: 'silver grey, sleek',             label: 'Silver Grey' },
  { value: 'pastel pink highlights',         label: 'Pastel Pink Highlights' },
];

export const EYE_DETAILS = [
  { value: 'Unspecified', label: 'Unspecified' },
  { value: 'deep dark brown, intense',       label: 'Deep Dark Brown' },
  { value: 'warm brown, almond shaped',      label: 'Warm Brown — almond' },
  { value: 'honey brown, luminous',          label: 'Honey Brown' },
  { value: 'hazel with green flecks',        label: 'Hazel — green flecks' },
  { value: 'bright green, vivid',            label: 'Bright Green' },
  { value: 'steel grey, piercing',           label: 'Steel Grey' },
  { value: 'deep blue, expressive',          label: 'Deep Blue' },
  { value: 'amber gold, rare',               label: 'Amber Gold' },
  { value: 'cat eye shape, elongated lash',  label: 'Cat Eye Shape' },
  { value: 'doe eyes, wide and expressive',  label: 'Doe Eyes — wide' },
  { value: 'smoky eye makeup, dramatic',     label: 'Smoky Eye Makeup' },
  { value: 'natural lash, minimal makeup',   label: 'Natural Lash — minimal' },
  { value: 'bold graphic liner, editorial',  label: 'Bold Graphic Liner' },
];

export const JEWELRY_OPTIONS = [
  { value: 'None', label: 'None / Minimal' },
  { value: 'small diamond studs, understated',                                     label: 'Diamond Studs' },
  { value: 'gold hoops, medium size',                                               label: 'Gold Hoops' },
  { value: 'statement oversized earrings',                                          label: 'Statement Earrings' },
  { value: 'layered gold chains, textured',                                         label: 'Layered Gold Chains' },
  { value: 'diamond tennis necklace',                                               label: 'Tennis Necklace' },
  { value: 'gold love bracelet, textured bangle, luxury finish',                     label: 'Gold Love Bracelet' },
  { value: 'luxury gold watch, premium timepiece, polished case',                   label: 'Luxury Watch' },
  { value: 'clover pendant necklace, delicate gold, fine jewelry',                  label: 'Clover Pendant Necklace' },
  { value: 'stacked gold rings, editorial',                                         label: 'Stacked Gold Rings' },
  { value: 'body chain, gold delicate',                                             label: 'Delicate Body Chain' },
  { value: 'full luxury set: necklace, earrings, bracelet, rings',                  label: 'Full Luxury Set' },
  { value: 'pearl accents, modern',                                                 label: 'Modern Pearls' },
  { value: 'diamond ear cuff, edgy',                                                label: 'Diamond Ear Cuff' },
];

export const CLOTHING_VIBES = [
  { value: 'Unspecified', label: 'Unspecified' },
  { value: 'casual: fitted white tee, high-waist dark jeans, clean sneakers, minimal accessories',                            label: 'Casual — jeans + tee' },
  { value: 'athleisure: matching athletic set, sports bra, biker shorts, sleek sneakers',                                     label: 'Athleisure — athletic set' },
  { value: 'fitted seamless bodysuit, cycling shorts, oversized hoodie, clean sneakers, gold hoops — no logos, no text on clothing',    label: 'Elevated Athleisure — Seamless Set' },
  { value: 'flowy floral mini sundress, strappy sandals, dainty gold jewelry, sunglasses',                                    label: 'Sundress — casual chic' },
  { value: 'linen coord set, strappy mules, sun hat, gold necklace — elevated summer daytime',                                label: 'Summer Brunch — linen' },
  { value: 'vintage denim jacket, straight-leg jeans, fitted white tee, ankle boots',                                         label: 'Elevated Denim' },
  { value: 'satin slip dress, strappy stiletto heels, diamond studs, sleek clutch — sensual but elegant',                     label: 'Date Night — satin slip' },
  { value: 'fitted little black dress, pointed-toe pumps, minimal gold jewelry — classic and polished',                       label: 'LBD — classic' },
  { value: 'chic tailored blazer over a bodysuit, wide-leg trousers, heels, bold statement earrings',                         label: 'Night Out — blazer moment' },
  { value: 'crystal-embellished mini dress, platform stilettos, full glam makeup, bold jewelry',                              label: 'Club Ready — crystal mini' },
  { value: 'sequin mini dress, heels, bold lip, statement jewelry — high-energy glam',                                        label: 'Party Glam — sequin' },
  { value: 'fitted blazer, tailored trousers, silk blouse, block heels — polished and professional',                          label: 'Business Casual — blazer' },
  { value: 'structured monochrome suit, no undershirt, pointed pumps, minimal accessories — commanding',                      label: 'Power Suit — monochrome' },
  { value: 'pencil skirt, tucked silk blouse, pointed heels, structured bag — corporate chic',                                label: 'Corporate Chic — pencil skirt' },
  { value: 'streetwear luxury: clean oversized hoodie in a solid neutral tone, relaxed cargo pants, premium chunky sneakers — no logos, no text, no graphics',                     label: 'Streetwear Luxury' },
  { value: 'high fashion editorial: avant-garde structured silhouette, architectural draping, fashion week styling — solid fabrics, no visible logos or text',                      label: 'High Fashion — editorial' },
  { value: 'cashmere knit, wide-leg cream trousers, loafers, structured bag — quiet luxury old money',                        label: 'Old Money — quiet luxury' },
  { value: 'head-to-toe tonal look, architectural clean lines, one color palette, minimal accessories — solid fabrics only',   label: 'Monochrome Minimal' },
  { value: 'structured woven bag, linen coord set, designer slides, gold jewelry — effortless expensive, no logos',           label: 'Luxury Casual' },
  { value: 'flowy printed maxi dress, woven sun hat, strappy sandals, gold jewelry — resort lifestyle',                       label: 'Resort Glam' },
  { value: 'designer bikini, sheer sarong wrap, oversized sunglasses, gold body jewelry',                                     label: 'Beach — designer bikini' },
  { value: 'luxury one-piece swimsuit, designer slides, oversized beach hat, linen cover-up',                                 label: 'Poolside — luxury one-piece' },
  { value: 'oversized tailored coat, ribbed turtleneck, knee-high boots, structured bag — cold weather editorial',            label: 'Winter Coat Moment' },
  { value: 'Y2K revival: low-rise jeans, rhinestone crop top, butterfly clips, platform sandals',                             label: 'Y2K Glam — revival' },
  { value: 'silk robe, sheer lace bodysuit, soft natural confidence, tasteful editorial boudoir-inspired pose',               label: 'Boudoir Editorial — silk robe' },
  { value: 'designer lingerie set, lace bodysuit and brief set, tasteful editorial styling — elegant and editorial',           label: 'Lingerie Editorial' },
  { value: 'high-end bikini or one-piece, resort lifestyle shoot, body confidence, luxury vacation',                          label: 'Swimwear — resort luxury' },
];

export const SPECIAL_FEATURES = [
  { value: 'None', label: 'None' },
  { value: 'visible beauty marks / moles, natural',         label: 'Beauty Marks' },
  { value: 'light natural freckles across nose and cheeks', label: 'Natural Freckles' },
  { value: 'deep dimples when smiling',                     label: 'Deep Dimples' },
  { value: 'full lips, glossy finish',                      label: 'Full Glossy Lips' },
  { value: 'strong defined jawline',                        label: 'Defined Jawline' },
  { value: 'high cheekbones, sculpted',                     label: 'High Cheekbones' },
  { value: 'natural melanin glow, dewy skin',               label: 'Melanin Glow — dewy' },
  { value: 'visible tattoos, artistic',                     label: 'Visible Tattoos' },
  { value: 'natural glowing skin, no makeup',               label: 'No Makeup — natural glow' },
  { value: 'bold red lip, power glam',                      label: 'Bold Red Lip' },
  { value: 'glazed donut skin, glass skin finish',          label: 'Glass Skin' },
];

export const GENDERS = ['Unspecified', 'Woman', 'Man', 'Non-binary', 'Femme', 'Androgynous'].map(v => ({ value: v, label: v }));

export const STANDARD_NEGATIVE = 'low resolution, blurry, plastic skin, waxy skin, over-smoothed face, AI beauty filter, uncanny face, distorted eyes, warped hands, extra fingers, missing fingers, broken anatomy, unnatural body proportions, stiff pose, flat lighting, harsh flash, oversaturated colors, cluttered background, cartoon styling, floating tattoos, fake jewelry, bad fabric physics, cropped limbs, generic photo, artificial smile, lifeless expression, overprocessed HDR, grainy, noisy, unrealistic skin color, washed-out skin, plastic hair, duplicate body parts, distorted face, text on clothing, visible brand names, graphic prints on garments, fake logos, illegible text, random letters on fabric, misspelled words, hallucinated typography';

export function buildStructuredVision({ vision = '', gender = 'Unspecified', skinTone = 'Unspecified', hairStyle = 'Unspecified', hairColor = 'Unspecified', eyeDetail = 'Unspecified', jewelry = 'None', clothing = 'Unspecified', features = 'None', mood = 'Clean', contentType = 'Portrait', scene = 'None', character = null, shootHairStyle = 'Unspecified', shootHairColor = 'Unspecified', shootJewelry = 'None', outfitPhotoDesc = '' } = {}) {
  const s = [];

  s.push('Ultra-realistic 4K commercial lifestyle fashion photography. Shot for a premium fashion and lifestyle brand campaign. The final image must look like a high-end professional photograph captured on a real camera — realistic, polished, editorial, and not illustrated or overly stylized.');

  if (character) {
    const f = character.fields || {};

    // TALENT — face and skin only
    const talentParts = [];
    if (character.faceAnchor) {
      talentParts.push(character.faceAnchor);
    } else {
      if (f.face) talentParts.push(f.face);
      if (f.tone) talentParts.push(`${f.tone} complexion`);
    }
    if (talentParts.length) s.push(`TALENT — ${character.name}: ${talentParts.join('. ')}.`);

    // BUILD & PRESENCE — separate block so it gets full model weight
    const presenceParts = [];
    if (f.body)        presenceParts.push(f.body);
    if (f.personality) presenceParts.push(f.personality);
    if (presenceParts.length) s.push(`BUILD & PRESENCE: ${presenceParts.join('. ')}.`);

    // OUTFIT
    const outfitUsed = outfitPhotoDesc
      ? outfitPhotoDesc
      : ((clothing && clothing !== 'Unspecified') ? clothing : f.wardrobe);
    if (outfitUsed) s.push(`OUTFIT: ${outfitUsed}.`);

    // HAIR & ACCESSORIES
    const hairAccessParts = [];
    const effectiveHairStyle = shootHairStyle !== 'Unspecified' ? shootHairStyle : (f.hair || null);
    const effectiveHairColor = shootHairColor !== 'Unspecified' ? shootHairColor : null;
    const hairDesc = [effectiveHairStyle, effectiveHairColor ? `in ${effectiveHairColor}` : null].filter(Boolean).join(', ');
    if (hairDesc) hairAccessParts.push(`Hair: ${hairDesc}`);
    const jewelryUsed = (shootJewelry && shootJewelry !== 'None') ? shootJewelry : (jewelry !== 'None' ? jewelry : null);
    if (jewelryUsed) hairAccessParts.push(`Accessories: ${jewelryUsed}`);
    if (hairAccessParts.length) s.push(`HAIR & ACCESSORIES: ${hairAccessParts.join('. ')}.`);
  } else {
    // Standalone talent block
    const hasSubject = gender !== 'Unspecified' || skinTone !== 'Unspecified' || eyeDetail !== 'Unspecified';
    if (hasSubject) {
      const who = gender !== 'Unspecified' ? gender : 'Talent';
      const talentParts = [];
      if (skinTone !== 'Unspecified') talentParts.push(`${skinTone} complexion, realistic skin texture with visible pores and natural tone variation`);
      if (eyeDetail !== 'Unspecified') talentParts.push(`${eyeDetail} eyes, sharp and dimensional`);
      s.push(`TALENT: ${who}. ${talentParts.join('. ')}${talentParts.length ? '. ' : ''}Natural facial structure, grounded expression.`);
    }
    if (features !== 'None') s.push(`BUILD & PRESENCE: ${features}.`);

    if (clothing !== 'Unspecified') s.push(`OUTFIT: ${clothing}.`);

    const hairAccessParts = [];
    if (hairStyle !== 'Unspecified' || hairColor !== 'Unspecified') {
      const hair = [hairStyle !== 'Unspecified' ? hairStyle : '', hairColor !== 'Unspecified' ? `in ${hairColor}` : ''].filter(Boolean).join(', ');
      hairAccessParts.push(`Hair: ${hair}, full strand detail and natural texture`);
    }
    if (jewelry !== 'None') hairAccessParts.push(`Accessories: ${jewelry}`);
    if (hairAccessParts.length) s.push(`HAIR & ACCESSORIES: ${hairAccessParts.join('. ')}.`);
  }

  if (scene && scene !== 'None') s.push(`SCENE: ${scene}. Premium environment, authentic architectural detail, controlled depth.`);
  if (vision) s.push(`ART DIRECTION: ${vision}`);

  s.push(`CAMPAIGN FEEL: ${[contentType, mood].filter(Boolean).join(' — ')}. Premium editorial spread energy.`);
  s.push('POSE & COMPOSITION: Three-quarter body editorial portrait so the outfit is clearly visible. Natural confident posture, candid-feeling but composed. Flattering angle, intentional negative space, realistic anatomy, relaxed hands.');
  s.push('LIGHTING: Soft dimensional natural or studio lighting. Light wraps realistically around the subject. Warm refined color grading.');
  s.push('CAMERA & DETAIL: Shot on Canon EOS R5 with 85mm portrait lens. Shallow depth of field with natural bokeh. Crisp focus on face, hair, jewelry, and styling details.');
  s.push('QUALITY & TEXTURE: Commercial retouching that preserves healthy natural skin texture, visible pores, realistic highlights, accurate fabric weight, natural folds and drape, and believable clothing structure. Hair has individual strand detail and natural movement. Jewelry reflects light accurately.');
  s.push('CONTENT STANDARD: Fully clothed, tasteful, brand-appropriate fashion and lifestyle photography suitable for a luxury campaign.');

  return s.join('\n\n');
}

export function buildFluxVision({ vision = '', gender = 'Unspecified', skinTone = 'Unspecified', hairStyle = 'Unspecified', hairColor = 'Unspecified', eyeDetail = 'Unspecified', jewelry = 'None', clothing = 'Unspecified', features = 'None', mood = 'Clean', contentType = 'Portrait', scene = 'None', character = null } = {}) {
  const parts = [];
  if (character) {
    const f = character.fields || {};
    let line = character.name;
    if (f.tone) line += ` with ${f.tone} skin`;
    if (f.hair) line += `, ${f.hair} hair`;
    if (f.face) line += `, ${f.face}`;
    parts.push(`${line}.`);
    const outfitUsed = (clothing && clothing !== 'Unspecified') ? clothing : f.wardrobe;
    if (outfitUsed) parts.push(`Wearing ${outfitUsed}.`);
    if (f.personality) parts.push(`${f.personality} energy.`);
  } else {
    const subParts = [];
    if (gender !== 'Unspecified') subParts.push(gender.toLowerCase());
    if (skinTone !== 'Unspecified') subParts.push(`with ${skinTone} skin`);
    let subLine = subParts.length ? `A stunning ${subParts.join(' ')}` : 'A stunning person';
    const hairParts = [hairStyle !== 'Unspecified' ? hairStyle : '', hairColor !== 'Unspecified' ? hairColor : ''].filter(Boolean);
    if (hairParts.length) subLine += `, ${hairParts.join(', ')} hair`;
    if (eyeDetail !== 'Unspecified') subLine += `, ${eyeDetail} eyes`;
    if (features !== 'None') subLine += `, ${features}`;
    parts.push(subLine + '.');
    if (clothing !== 'Unspecified') parts.push(`Wearing ${clothing}.`);
    if (jewelry !== 'None') parts.push(`Adorned with ${jewelry}.`);
  }
  if (scene && scene !== 'None') parts.push(`Set in a ${scene.toLowerCase()} environment.`);
  if (vision) parts.push(vision.trim().endsWith('.') ? vision.trim() : vision.trim() + '.');
  const moodParts = [contentType !== 'Portrait' ? contentType : '', mood !== 'Clean' ? mood : ''].filter(Boolean);
  if (moodParts.length) parts.push(`${moodParts.join(', ')} mood and aesthetic.`);
  parts.push('Photorealistic editorial photograph. Shot on Sony A1 85mm f/1.4. Natural soft studio light, warm color grading. Individual hair strand detail, visible skin pores, natural skin texture, realistic fabric physics, lifelike expression and anatomy. Ultra-detailed 4K. Luxury commercial campaign quality. No plastic skin, no uncanny valley, no distorted anatomy.');
  return parts.join(' ');
}
