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

// Hair styles split by gender for filtering
export const HAIR_STYLES_WOMEN = [
  { value: 'Unspecified', label: 'Unspecified' },
  // — Natural & protective —
  { value: 'box braids, waist length',                      label: 'Box Braids — waist' },
  { value: 'knotless braids, shoulder length',              label: 'Knotless Braids — shoulder' },
  { value: 'Senegalese twists',                             label: 'Senegalese Twists' },
  { value: 'goddess locs',                                  label: 'Goddess Locs' },
  { value: 'faux locs, bohemian',                           label: 'Faux Locs — bohemian' },
  { value: 'invisible locs, long and flowing',              label: 'Invisible Locs — long' },
  { value: 'traditional dreadlocks, long',                  label: 'Traditional Locs — long' },
  { value: 'sisterlocks',                                   label: 'Sisterlocks' },
  { value: 'cornrows, sleek',                               label: 'Cornrows — sleek' },
  { value: 'Dutch braids, two plaits',                      label: 'Dutch Braids — two' },
  { value: 'full natural afro, voluminous',                 label: 'Full Natural Afro' },
  { value: 'TWA tapered natural',                           label: 'TWA — tapered' },
  { value: 'kinky coils, defined natural texture',          label: 'Kinky Coils — defined' },
  { value: 'bantu knots',                                   label: 'Bantu Knots' },
  // — Styled & blown out —
  { value: 'silk press, bone straight',                     label: 'Silk Press — bone straight' },
  { value: 'sleek blowout, voluminous',                     label: 'Sleek Blowout' },
  { value: 'sleek high ponytail',                           label: 'Sleek High Ponytail' },
  { value: 'sleek low bun, center part',                    label: 'Sleek Low Bun' },
  { value: 'top knot bun, sleek editorial',                 label: 'Top Knot Bun' },
  { value: 'loose effortless updo, romantic',               label: 'Effortless Updo — romantic' },
  { value: 'half-up half-down, voluminous curls',           label: 'Half-Up Half-Down Curls' },
  // — Waves & curls —
  { value: 'long loose curls, natural',                     label: 'Long Loose Curls' },
  { value: 'beachy waves',                                  label: 'Beachy Waves' },
  { value: 'body waves, glossy',                            label: 'Body Waves — glossy' },
  { value: 'curtain bangs with loose waves',                label: 'Curtain Bangs + Waves' },
  { value: 'finger waves, vintage glam',                    label: 'Finger Waves — vintage' },
  // — Short & cut —
  { value: 'sleek bob, chin length, center part',           label: 'Sleek Bob' },
  { value: 'blunt cut bob, jaw length',                     label: 'Blunt Cut Bob' },
  { value: 'long straight, ultra sleek',                    label: 'Long Straight — sleek' },
  { value: 'side part with face-framing layers',            label: 'Side Part + Layers' },
  { value: 'pixie cut, sharp and modern',                   label: 'Pixie Cut' },
  { value: 'space buns',                                    label: 'Space Buns' },
];

export const HAIR_STYLES_MEN = [
  { value: 'Unspecified', label: 'Unspecified' },
  // — Fades & cuts —
  { value: 'low fade, clean lined edge up',                 label: 'Low Fade — clean' },
  { value: 'high fade, sharp edge up',                      label: 'High Fade — sharp' },
  { value: 'taper fade, fresh edge up',                     label: 'Taper Fade' },
  { value: 'skin fade, bald fade',                          label: 'Skin / Bald Fade' },
  { value: 'buzz cut, clean',                               label: 'Buzz Cut' },
  { value: 'shaved head, clean',                            label: 'Shaved / Bald' },
  { value: 'textured crop, modern fade',                    label: 'Textured Crop' },
  { value: 'curly top with low fade',                       label: 'Curly Top + Fade' },
  { value: 'afro with sharp shape up and edge',             label: 'Afro + Shape Up' },
  { value: 'low cut natural afro, shaped and defined',      label: 'Low Natural — shaped' },
  { value: 'low cut with designed parts, creative fade',    label: 'Designed Parts — fade' },
  // — Waves —
  { value: 'low cut cesar, 360 waves',                      label: '360 Waves' },
  { value: 'high fade with deep waves on top',              label: 'High Fade + Waves' },
  // — Locs & braids —
  { value: 'short dreadlocks, neat and uniform',            label: 'Short Locs — neat' },
  { value: 'medium dreadlocks, free-hanging',               label: 'Medium Locs' },
  { value: 'long dreadlocks, pulled back loosely',          label: 'Long Locs — pulled back' },
  { value: 'short box braids, men\'s style',                label: 'Short Box Braids' },
  { value: 'braids with fade on sides',                     label: 'Braids + Fade' },
  { value: 'cornrows, straight back',                       label: 'Cornrows — straight back' },
  { value: 'two-strand twists, short',                      label: 'Two-Strand Twists' },
];

// Backwards-compat combined export (used by Flux builder and characters)
export const HAIR_STYLES = [
  ...HAIR_STYLES_WOMEN.filter(h => h.value !== 'Unspecified'),
  ...HAIR_STYLES_MEN.filter(h => h.value !== 'Unspecified'),
];
HAIR_STYLES.unshift({ value: 'Unspecified', label: 'Unspecified' });

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

export const JEWELRY_WOMEN = [
  { value: 'None', label: 'None / Minimal' },
  { value: 'small diamond studs, understated',                                     label: 'Diamond Studs' },
  { value: 'gold hoops, medium size',                                               label: 'Gold Hoops' },
  { value: 'statement oversized earrings',                                          label: 'Statement Earrings' },
  { value: 'diamond ear cuff, edgy',                                                label: 'Diamond Ear Cuff' },
  { value: 'layered gold chains, textured',                                         label: 'Layered Gold Chains' },
  { value: 'diamond tennis necklace',                                               label: 'Tennis Necklace' },
  { value: 'clover pendant necklace, delicate gold, fine jewelry',                  label: 'Clover Pendant' },
  { value: 'gold love bracelet, textured bangle, luxury finish',                    label: 'Gold Love Bracelet' },
  { value: 'diamond tennis bracelet',                                               label: 'Tennis Bracelet' },
  { value: 'luxury gold watch, premium timepiece, polished case',                   label: 'Luxury Watch' },
  { value: 'stacked gold rings, editorial',                                         label: 'Stacked Gold Rings' },
  { value: 'body chain, gold delicate',                                             label: 'Delicate Body Chain' },
  { value: 'full luxury set: necklace, earrings, bracelet, rings',                  label: 'Full Luxury Set' },
  { value: 'pearl accents, modern',                                                 label: 'Modern Pearls' },
];

export const JEWELRY_MEN = [
  { value: 'None', label: 'None / Minimal' },
  { value: 'single gold chain, clean and simple',                                   label: 'Single Gold Chain' },
  { value: 'layered gold chains, two or three — stacked',                           label: 'Layered Gold Chains' },
  { value: 'thick Cuban link chain, gold',                                          label: 'Cuban Link Chain' },
  { value: 'rope chain, gold, medium thickness',                                    label: 'Rope Chain' },
  { value: 'cross pendant on gold chain',                                           label: 'Cross Pendant' },
  { value: 'luxury gold watch, premium timepiece, polished case',                   label: 'Luxury Watch' },
  { value: 'gold ID bracelet, clean',                                               label: 'Gold ID Bracelet' },
  { value: 'gold chain bracelet, simple',                                           label: 'Gold Chain Bracelet' },
  { value: 'beaded bracelet, natural stones — subtle',                              label: 'Beaded Bracelet' },
  { value: 'diamond stud, single ear, small and clean',                             label: 'Diamond Stud — one ear' },
  { value: 'gold chain and watch combo — stacked',                                  label: 'Chain + Watch Combo' },
];

// Combined for unspecified gender
export const JEWELRY_OPTIONS = [
  { value: 'None', label: 'None / Minimal' },
  ...JEWELRY_WOMEN.filter(j => j.value !== 'None'),
  ...JEWELRY_MEN.filter(j => j.value !== 'None'),
];

export const CLOTHING_WOMEN = [
  { value: 'Unspecified', label: 'Unspecified' },
  // — Casual —
  { value: 'fitted white tee, high-waist dark jeans, clean sneakers, minimal gold jewelry',                                                  label: 'Casual — jeans + tee' },
  { value: 'denim maxi skirt, fitted tank top, sneakers, gold jewelry — casual cool',                                                         label: 'Denim Maxi Skirt' },
  { value: 'tennis skirt, cropped hoodie, platform sneakers, minimal accessories — sport luxe',                                               label: 'Tennis Skirt + Hoodie' },
  { value: 'vintage denim jacket, straight-leg jeans, fitted white tee, ankle boots',                                                         label: 'Elevated Denim' },
  // — Athleisure —
  { value: 'matching athletic set, sports bra, biker shorts, sleek sneakers',                                                                  label: 'Athleisure — athletic set' },
  { value: 'fitted seamless bodysuit, cycling shorts, oversized hoodie, clean sneakers, gold hoops — no logos, no text on clothing',           label: 'Elevated Athleisure — Seamless Set' },
  // — Brunch & daytime —
  { value: 'flowy floral mini sundress, strappy sandals, dainty gold jewelry, sunglasses',                                                     label: 'Sundress — casual chic' },
  { value: 'linen coord set, strappy mules, sun hat, gold necklace — elevated summer daytime',                                                 label: 'Summer Brunch — linen' },
  { value: 'wrap dress, midi length, cinched waist, strappy heels — feminine and polished',                                                    label: 'Wrap Dress — midi' },
  { value: 'two-piece ribbed knit coord set, fitted top and wide-leg bottoms, heels',                                                          label: 'Knit Coord Set' },
  { value: 'sheer printed blouse, wide-leg silk trousers, strappy heels, minimal jewelry — luxe daytime',                                      label: 'Sheer Blouse + Silk Trousers' },
  // — Evening & night out —
  { value: 'satin slip dress, strappy stiletto heels, diamond studs, sleek clutch — elegant and alluring',                                     label: 'Date Night — satin slip' },
  { value: 'fitted little black dress, pointed-toe pumps, minimal gold jewelry — classic and polished',                                        label: 'LBD — classic' },
  { value: 'bodycon ruched dress, strappy heels, bold jewelry — night out energy',                                                             label: 'Bodycon Ruched Dress' },
  { value: 'chic tailored blazer over a bodysuit, wide-leg trousers, heels, bold statement earrings',                                          label: 'Night Out — blazer moment' },
  { value: 'oversized blazer dress, belt, knee-high boots — power feminine',                                                                   label: 'Blazer Dress + Knee Boots' },
  { value: 'corset top, high-waist wide-leg trousers, heels — fashion forward',                                                                label: 'Corset + Wide-Leg Trousers' },
  { value: 'crystal-embellished mini dress, platform stilettos, full glam makeup, bold jewelry',                                               label: 'Club Ready — crystal mini' },
  { value: 'sequin mini dress, heels, bold lip, statement jewelry — high-energy glam',                                                         label: 'Party Glam — sequin' },
  // — Business —
  { value: 'fitted blazer, tailored trousers, silk blouse, block heels — polished and professional',                                           label: 'Business Casual — blazer' },
  { value: 'structured monochrome suit, pointed pumps, minimal accessories — commanding',                                                       label: 'Power Suit — monochrome' },
  { value: 'pencil skirt, tucked silk blouse, pointed heels, structured bag — corporate chic',                                                  label: 'Corporate Chic — pencil skirt' },
  // — Luxury & editorial —
  { value: 'leather pants, fitted blazer, heels, minimal jewelry — edgy chic',                                                                 label: 'Leather Pants + Blazer' },
  { value: 'cashmere knit, wide-leg cream trousers, loafers, structured bag — quiet luxury old money',                                          label: 'Old Money — quiet luxury' },
  { value: 'head-to-toe tonal look, one color palette, minimal accessories — solid fabrics only',                                               label: 'Monochrome Minimal' },
  { value: 'linen coord set, designer slides, gold jewelry — effortless expensive, no logos',                                                   label: 'Luxury Casual' },
  { value: 'clean oversized hoodie, relaxed cargo pants, premium chunky sneakers — no logos, no text',                                          label: 'Streetwear Luxury' },
  { value: 'trench coat, minimal outfit underneath, ankle boots — classic and chic',                                                            label: 'Trench Coat Moment' },
  { value: 'oversized tailored coat, ribbed turtleneck, knee-high boots, structured bag — cold weather',                                        label: 'Winter Coat Moment' },
  { value: 'avant-garde structured silhouette, architectural draping — solid fabrics, no visible logos',                                        label: 'High Fashion — architectural' },
  // — Resort & swim —
  { value: 'flowy printed maxi dress, woven sun hat, strappy sandals, gold jewelry — resort lifestyle',                                         label: 'Resort Glam' },
  { value: 'designer bikini, lightweight sarong wrap, oversized sunglasses, gold body jewelry',                                                  label: 'Beach — designer bikini' },
  { value: 'luxury one-piece swimsuit, designer slides, oversized beach hat, linen cover-up',                                                   label: 'Poolside — luxury one-piece' },
  { value: 'high-end bikini or one-piece, resort lifestyle, body confidence, luxury vacation',                                                   label: 'Swimwear — resort luxury' },
  // — Vibe & era —
  { value: 'Y2K revival: low-rise jeans, rhinestone crop top, butterfly clips, platform sandals',                                               label: 'Y2K Glam — revival' },
  { value: 'silk robe, fitted lace bodysuit, soft natural confidence, tasteful studio look',                                                     label: 'Studio Editorial — silk robe' },
  { value: 'designer intimates set, lace bodysuit, tasteful and elegant',                                                                        label: 'Intimates Editorial' },
];

export const CLOTHING_MEN = [
  { value: 'Unspecified', label: 'Unspecified' },
  // — Casual streetwear —
  { value: 'fitted clean white tee, dark slim jeans, clean white sneakers, minimal gold chain — effortless casual',                             label: 'Casual Streetwear' },
  { value: 'denim jacket, plain white tee, slim jeans, white sneakers — clean americana',                                                       label: 'Denim Jacket + Jeans' },
  { value: 'fitted crewneck sweater, slim chinos, clean sneakers — everyday elevated',                                                          label: 'Crewneck + Chinos' },
  { value: 'cargo pants, fitted plain tee, chunky sneakers, minimal accessories — urban',                                                       label: 'Cargo + Tee' },
  { value: 'bomber jacket, slim dark jeans, crisp plain tee, fresh sneakers — street ready',                                                    label: 'Bomber + Denim' },
  { value: 'varsity jacket, plain white tee, slim dark jeans, clean sneakers',                                                                  label: 'Varsity Jacket' },
  { value: 'coach jacket, fitted plain tee, athletic pants, clean sneakers — street luxury',                                                    label: 'Coach Jacket — street luxury' },
  // — Elevated streetwear —
  { value: 'premium hoodie in solid neutral tone, relaxed joggers, clean sneakers, no logos — elevated streetwear',                             label: 'Elevated Streetwear — hoodie' },
  { value: 'luxury tracksuit in solid color, clean sneakers, no logos — athleisure',                                                            label: 'Luxury Tracksuit' },
  { value: 'clean oversized hoodie, relaxed cargo pants, premium sneakers — no logos, no text',                                                 label: 'Streetwear Luxury' },
  // — Smart casual —
  { value: 'polo shirt, tailored chinos, clean leather loafers — smart casual',                                                                 label: 'Polo + Chinos' },
  { value: 'button-up shirt, open collar, tucked into dark trousers, leather loafers — polished casual',                                        label: 'Button-Up + Trousers' },
  { value: 'linen shirt, tailored chinos, leather loafers, simple watch — quiet luxury',                                                        label: 'Old Money Linen' },
  { value: 'linen coord set (matching shirt and trousers), loafers, no undershirt — summer luxury',                                             label: 'Linen Coord Set' },
  { value: 'luxury knit sweater, tailored trousers, Chelsea boots — elevated casual',                                                           label: 'Knit Sweater + Trousers' },
  // — Business —
  { value: 'tailored slim suit, no tie, crisp dress shirt open at collar, oxford shoes — sharp',                                                label: 'Tailored Suit' },
  { value: 'business casual: fitted blazer, chinos, loafers, clean watch, no tie',                                                              label: 'Business Casual' },
  { value: 'all-black outfit: slim trousers, fitted turtleneck, clean leather shoes — monochrome',                                              label: 'Monochrome Black' },
  // — Luxury editorial —
  { value: 'leather jacket, white tee, black slim jeans, boots — classic cool',                                                                 label: 'Leather Jacket' },
  { value: 'structured overcoat, turtleneck, slim trousers, leather boots — winter luxury',                                                     label: 'Overcoat Editorial' },
  // — Resort & summer —
  { value: 'designer short set (matching shorts and shirt), premium sneakers, gold chain — summer luxury',                                       label: 'Designer Short Set' },
  { value: 'swim trunks, no shirt, sun-kissed skin, poolside or beach — lifestyle',                                                             label: 'Poolside / Beach' },
];

// Combined export for contexts where gender isn't specified
export const CLOTHING_VIBES = [
  { value: 'Unspecified', label: 'Unspecified' },
  ...CLOTHING_WOMEN.filter(c => c.value !== 'Unspecified'),
  ...CLOTHING_MEN.filter(c => c.value !== 'Unspecified'),
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

export const PHYSIQUE_MEN = [
  { value: 'Unspecified', label: 'Unspecified' },
  { value: 'athletic muscular build, broad shoulders, defined chest and arms',           label: 'Athletic / Muscular' },
  { value: 'tall lean athletic build, long limbs, naturally defined physique',            label: 'Tall & Lean' },
  { value: 'stocky powerful build, thick neck, wide frame, solid presence',              label: 'Stocky / Powerful' },
  { value: 'slim trim build, clean silhouette, clothes hang perfectly',                  label: 'Slim / Trim' },
  { value: 'average everyday build, natural relaxed frame, approachable',                label: 'Average / Everyday' },
  { value: 'dad bod, soft natural build, confident and comfortable',                     label: 'Dad Bod' },
];

export const PHYSIQUE_WOMEN = [
  { value: 'Unspecified', label: 'Unspecified' },
  { value: 'curvy hourglass figure, full hips, defined waist, confident stance',         label: 'Curvy / Hourglass' },
  { value: 'slim petite frame, delicate proportions, graceful posture',                  label: 'Slim / Petite' },
  { value: 'tall model frame, long legs, editorial proportions',                         label: 'Tall / Model Frame' },
  { value: 'athletic toned build, visible arm definition, active lifestyle energy',      label: 'Athletic / Toned' },
  { value: 'full-figured plus size build, curves, confident and powerful presence',      label: 'Plus Size / Full-Figured' },
  { value: 'average natural build, relatable proportions, authentic presence',           label: 'Average / Natural' },
];

export const PHYSIQUE = [
  { value: 'Unspecified', label: 'Unspecified' },
  ...PHYSIQUE_MEN.filter(p => p.value !== 'Unspecified').map(p => ({ ...p, label: `Men — ${p.label}` })),
  ...PHYSIQUE_WOMEN.filter(p => p.value !== 'Unspecified').map(p => ({ ...p, label: `Women — ${p.label}` })),
];

/** Returns the right options set for a given gender string. */
export function getPhysiqueOptions(gender) {
  if (gender === 'Man') return PHYSIQUE_MEN;
  if (gender === 'Woman') return PHYSIQUE_WOMEN;
  return PHYSIQUE;
}

export function getHairStyleOptions(gender) {
  if (gender === 'Man') return HAIR_STYLES_MEN;
  if (gender === 'Woman') return HAIR_STYLES_WOMEN;
  return HAIR_STYLES;
}

export function getClothingOptions(gender) {
  if (gender === 'Man') return CLOTHING_MEN;
  if (gender === 'Woman') return CLOTHING_WOMEN;
  return CLOTHING_VIBES;
}

export function getJewelryOptions(gender) {
  if (gender === 'Man') return JEWELRY_MEN;
  if (gender === 'Woman') return JEWELRY_WOMEN;
  return JEWELRY_OPTIONS;
}

export const STANDARD_NEGATIVE = 'low resolution, blurry, plastic skin, waxy skin, over-smoothed face, AI beauty filter, uncanny face, distorted eyes, warped hands, extra fingers, missing fingers, broken anatomy, unnatural body proportions, stiff pose, flat lighting, harsh flash, oversaturated colors, cluttered background, cartoon styling, floating tattoos, fake jewelry, bad fabric physics, cropped limbs, generic photo, artificial smile, lifeless expression, overprocessed HDR, grainy, noisy, unrealistic skin color, washed-out skin, plastic hair, duplicate body parts, distorted face, text on clothing, visible brand names, graphic prints on garments, fake logos, illegible text, random letters on fabric, misspelled words, hallucinated typography';

export function buildStructuredVision({ vision = '', gender = 'Unspecified', physique = 'Unspecified', skinTone = 'Unspecified', hairStyle = 'Unspecified', hairColor = 'Unspecified', eyeDetail = 'Unspecified', jewelry = 'None', clothing = 'Unspecified', features = 'None', mood = 'Clean', contentType = 'Portrait', scene = 'None', character = null, shootHairStyle = 'Unspecified', shootHairColor = 'Unspecified', shootJewelry = 'None', outfitPhotoDesc = '' } = {}) {
  const s = [];
  const isMale = gender === 'Man' || character?.fields?.gender === 'Man';

  s.push('Photorealistic 4K lifestyle and fashion photography for a premium brand campaign. The final image should feel like it was captured by a real photographer on set — polished, natural, dimensional, expensive, and believable. Photorealistic only. No illustration, no plastic AI finish, no over-stylized fantasy gloss.');

  if (character) {
    const f = character.fields || {};

    // TALENT — face and skin
    const talentParts = [];
    if (character.faceAnchor) {
      talentParts.push(character.faceAnchor);
    } else {
      if (f.face) talentParts.push(f.face);
      if (f.tone) talentParts.push(`${f.tone} complexion, realistic skin texture with visible pores and natural tone variation`);
    }
    if (talentParts.length) s.push(`TALENT — ${character.name}: ${talentParts.join('. ')}.`);

    // BUILD & PRESENCE
    const presenceParts = [];
    if (f.body)        presenceParts.push(f.body);
    if (f.personality) presenceParts.push(f.personality);
    if (presenceParts.length) s.push(`BUILD & PRESENCE: ${presenceParts.join('. ')}.`);

    // OUTFIT
    const outfitUsed = outfitPhotoDesc
      ? outfitPhotoDesc
      : ((clothing && clothing !== 'Unspecified') ? clothing : f.wardrobe);
    if (outfitUsed) s.push(`OUTFIT: ${outfitUsed}. Clothing feels premium and believable — real fabric weight, accurate drape, natural folds.`);

    // HAIR & ACCESSORIES
    const hairAccessParts = [];
    const effectiveHairStyle = shootHairStyle !== 'Unspecified' ? shootHairStyle : (f.hair || null);
    const effectiveHairColor = shootHairColor !== 'Unspecified' ? shootHairColor : null;
    const hairDesc = [effectiveHairStyle, effectiveHairColor ? `in ${effectiveHairColor}` : null].filter(Boolean).join(', ');
    if (hairDesc) hairAccessParts.push(`Hair: ${hairDesc}, full strand detail, natural texture, and realistic movement`);
    const jewelryUsed = (shootJewelry && shootJewelry !== 'None') ? shootJewelry : (jewelry !== 'None' ? jewelry : null);
    if (jewelryUsed) hairAccessParts.push(`Accessories: ${jewelryUsed} — styled cleanly, catches light naturally without looking fake or overly polished`);
    if (hairAccessParts.length) s.push(`HAIR & ACCESSORIES: ${hairAccessParts.join('. ')}.`);
  } else {
    // SUBJECT DIRECTION — director's brief, not a warning
    const subjectDir = isMale
      ? 'SUBJECT DIRECTION: Create a man who feels like a real person, not a recycled AI face. His features should feel specific, grounded, and memorable: distinct bone structure, slight natural asymmetry, visible pores, lived-in skin texture, and facial details that feel individual instead of averaged, airbrushed, or generic.'
      : 'SUBJECT DIRECTION: Create a woman who feels like a real person, not a recycled AI face. Her features should feel specific, grounded, and memorable: distinct bone structure, slight natural asymmetry, lived-in skin texture, and facial details that feel individual instead of averaged, airbrushed, or generic.';
    s.push(subjectDir);

    // TALENT
    const who = gender !== 'Unspecified' ? gender : 'Talent';
    const talentParts = [];
    if (skinTone !== 'Unspecified') talentParts.push(`${skinTone} complexion, realistic skin texture, visible pores, natural tone variation, and dimensional highlights`);
    if (eyeDetail !== 'Unspecified') talentParts.push(`${eyeDetail} — sharp, expressive, and alive`);
    const basePresence = isMale
      ? 'Natural masculine facial structure with a strong jaw, fuller face, believable proportions, and a short groomed beard. Expression is calm, confident, and unforced — the kind of confidence that does not need to announce itself. Authentic, masculine, aspirational, and human. Not overly polished. Not waxy. A real man with presence.'
      : 'Natural facial structure with real bone structure, expressive eyes, and believable proportions. Expression is calm, confident, and unforced. Aspirational but human — individual features that feel specific and memorable, not model-perfect or AI-averaged.';
    s.push(`TALENT: ${who}. ${talentParts.join('. ')}${talentParts.length ? '. ' : ''}${basePresence}`);

    // BUILD & PRESENCE
    const presenceParts = [];
    if (physique !== 'Unspecified') {
      presenceParts.push(physique);
    } else {
      presenceParts.push(isMale
        ? 'Lean athletic build with a clean masculine silhouette. Strong grounded presence with quiet confidence.'
        : 'Confident feminine silhouette. Strong grounded presence. Clothes fit and drape naturally on her frame.');
    }
    if (features !== 'None') presenceParts.push(features);
    s.push(`BUILD & PRESENCE: ${presenceParts.join('. ')}.`);

    // OUTFIT
    if (clothing !== 'Unspecified') {
      s.push(`OUTFIT: ${clothing}. The clothing should feel real and expensive — accurate fabric weight, natural folds, believable drape, and structure that moves naturally with the body. Nothing stiff, shiny, cheap, or plastic-looking.`);
    } else if (isMale) {
      s.push('OUTFIT: Choose a specific, complete outfit that fits the scene — varsity jacket with dark jeans and clean sneakers, a tailored suit, a premium hoodie and sweats, a linen shirt and chinos, or a bomber jacket with dark jeans. The clothing should feel real and expensive — accurate fabric weight, natural folds, believable drape, and structure that moves naturally with the body. Nothing stiff, shiny, cheap, or plastic-looking.');
    } else {
      s.push('OUTFIT: Choose a specific, complete outfit that fits the scene — a slip dress, tailored blazer set, matching coord, satin midi dress, or elevated casual look. The clothing should feel real and expensive — accurate fabric weight, natural folds, believable drape, and structure that moves naturally with the body. Nothing stiff, shiny, cheap, or plastic-looking.');
    }

    // HAIR & ACCESSORIES
    const hairAccessParts = [];
    if (hairStyle !== 'Unspecified' || hairColor !== 'Unspecified') {
      const hair = [hairStyle !== 'Unspecified' ? hairStyle : '', hairColor !== 'Unspecified' ? `in ${hairColor}` : ''].filter(Boolean).join(', ');
      hairAccessParts.push(`Hair: ${hair}, full strand detail, natural texture, and realistic movement`);
    } else if (isMale) {
      hairAccessParts.push('Hair: Clean fade or natural cut — full strand detail, natural texture, and realistic movement');
    }
    if (jewelry !== 'None') hairAccessParts.push(`Accessories: ${jewelry} — styled cleanly, catches light naturally without looking fake or overly polished`);
    if (hairAccessParts.length) s.push(`HAIR & ACCESSORIES: ${hairAccessParts.join('. ')}.`);
  }

  // SCENE
  if (scene && scene !== 'None') {
    const sceneExtra = isMale
      ? 'The space should feel authentic and lived-in, with premium materials, warm ambient light, subtle reflections, and a believable lifestyle atmosphere. No generic studio backdrop.'
      : 'The space should feel authentic and lived-in, with premium materials, natural or warm ambient light, and a believable lifestyle atmosphere. No generic studio backdrop.';
    s.push(`SCENE: ${scene}. ${sceneExtra}`);
  } else {
    const defaultScene = isMale
      ? 'SCENE: The subject stands beside a sleek luxury car in a real upscale environment — a modern hotel entrance, private driveway, or luxury parking structure with architectural presence. The space should feel authentic and lived-in, with premium materials, warm ambient light, subtle reflections, and a believable lifestyle atmosphere. No generic studio backdrop.'
      : 'SCENE: Choose a real, specific location — rooftop terrace at golden hour, luxury apartment interior, upscale restaurant, boutique hotel lobby, or a city street with architectural character. The space should feel authentic and lived-in, with premium materials, natural or warm ambient light, and a believable lifestyle atmosphere. No generic studio backdrop.';
    s.push(defaultScene);
  }

  if (vision) s.push(`ART DIRECTION: ${vision}`);

  // SHOOT FEEL
  const shootFeelParts = [contentType !== 'Portrait' ? contentType : '', mood !== 'Clean' ? mood : ''].filter(Boolean);
  const shootFeelBase = shootFeelParts.length ? `${shootFeelParts.join(' — ')}. ` : '';
  const shootFeelClose = isMale
    ? 'Bold beauty with premium brand energy. Aspirational but real. Stylish but not overworked. Masculine, clean, polished, and expensive without feeling forced.'
    : 'Premium brand energy. Aspirational but real. Stylish but not overworked. Feminine, clean, polished, and expensive without feeling forced.';
  s.push(`SHOOT FEEL: ${shootFeelBase}${shootFeelClose}`);

  // POSE & COMPOSITION
  const poseDir = isMale
    ? 'Three-quarter to full-body fashion photograph so the outfit reads clearly. Natural grounded posture — leaning against the car or a surface, one hand in pocket, or standing relaxed with weight shifted naturally. Masculine composed energy, relaxed hands, real body balance, and no stiffness.'
    : 'Three-quarter body fashion photograph so the outfit is clearly visible. Natural confident posture, candid-feeling but composed. Flattering angle, intentional negative space, relaxed hands, real body balance.';
  s.push(`POSE & COMPOSITION: ${poseDir}`);

  s.push('LIGHTING: Soft dimensional natural or studio-style lighting that wraps realistically around the subject. Warm refined color grading, natural shadows, believable highlights, and depth in the skin, clothing, jewelry, and any environmental reflections.');
  s.push('CAMERA & DETAIL: Shot on a Canon EOS R5, 85mm portrait lens at f/1.4, Kodak Portra 400 film stock rendering. Shallow depth of field with natural bokeh. Crisp focus on the face, eyes, hair, jewelry, tattoos, and styling details. 8K resolution, ultra-detailed skin pores and texture.');
  s.push('QUALITY & TEXTURE: Commercial-level retouching that preserves healthy natural skin texture, visible pores, realistic highlights, accurate fabric weight, natural folds, believable clothing structure, and individual hair strand detail. The image should feel premium and finished without erasing the humanity of the subject. Avoid AI over-smoothing, plastic skin, waxy texture, distorted hands, warped fingers, extra limbs, melted fabric, fake-looking jewelry, stiff clothing, generic faces, and studio-backdrop energy.');
  s.push('CONTENT STANDARD: Fully clothed, tasteful, brand-appropriate fashion and lifestyle photography suitable for a premium campaign.');

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
