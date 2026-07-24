// Shared shoot-time option vocabulary — one list per concept, used by both
// the Quick Shoot panel (Characters screen) and the unified Director
// ShootBuilder, so the two forms can't drift apart the way the old
// QUICK_SCENES/LOCATIONS and QUICK_MOODS/ENERGIES pairs did.

export const SHOOT_ENGINES = [
  { id: 'openai_image',           label: 'OpenAI',            icon: 'zap' },
  { id: 'replicate_photomaker',   label: 'PhotoMaker 🔒',    icon: 'scan-face' },
  { id: 'replicate_instantid',    label: 'InstantID 🔒',     icon: 'fingerprint' },
  { id: 'replicate_flux_schnell', label: 'FLUX Schnell',      icon: 'flame' },
];

export const PORTRAIT_ANGLES = [
  'front-facing',
  'left 3/4 angle',
  'right 3/4 angle',
  'left profile',
  'slight high angle',
  'over-the-shoulder',
  'soft smile, front',
];

export const BATCH_OPTIONS = [1, 2, 4];

// Union of the old Quick Shoot moods and Director energies, deduped.
export const SHOOT_MOODS = [
  'Clean', 'Bold', 'Luxury', 'Romantic', 'Editorial', 'Cinematic', 'Soft', 'Playful', 'Candid', 'Raw',
];

export const SHOOT_LIGHTINGS = ['Natural', 'Golden Hour', 'Studio', 'Blue Hour', 'Night', 'Overcast'];

// Outfit override for this specific shot — first entry means "use the
// creator's saved wardrobe field" instead of a one-off look.
export const SHOOT_OUTFITS = [
  { id: 'default',          label: "Creator's Style",        prompt: null },
  { id: 'casual',           label: 'Casual',                 prompt: 'fitted white tee, high-waist dark jeans, clean white sneakers, minimal accessories' },
  { id: 'athleisure',       label: 'Athleisure',             prompt: 'matching athletic set, sports bra, biker shorts, sleek sneakers, gym bag' },
  { id: 'elevated_ath',     label: 'Skims Set',              prompt: 'fitted seamless bodysuit, cycling shorts, oversized hoodie, clean sneakers, gold hoops — no logos, no text on clothing' },
  { id: 'sundress',         label: 'Sundress',               prompt: 'flowy floral mini sundress, strappy sandals, dainty gold jewelry, sunglasses' },
  { id: 'brunch',           label: 'Brunch',                 prompt: 'linen coord set, strappy mules, sun hat, gold necklace — elevated summer daytime' },
  { id: 'denim',            label: 'Denim',                  prompt: 'vintage denim jacket, straight-leg jeans, fitted white tee, white sneakers or ankle boots' },
  { id: 'streetwear',       label: 'Streetwear',             prompt: 'streetwear luxury: clean cargo pants, oversized solid-color hoodie, chunky sneakers, cap — no logos, no text, no graphics on clothing' },
  { id: 'date_night',       label: 'Date Night',             prompt: 'satin slip dress, strappy stiletto heels, diamond studs, sleek clutch — elegant and alluring' },
  { id: 'lbd',              label: 'LBD',                    prompt: 'fitted little black dress, pointed-toe pumps, minimal gold jewelry — classic and polished' },
  { id: 'night_out',        label: 'Night Out',              prompt: 'chic tailored blazer over a bodysuit, wide-leg trousers, heels, bold earrings' },
  { id: 'club',             label: 'Club Ready',             prompt: 'crystal-embellished mini dress, platform stilettos, full glam makeup, bold jewelry' },
  { id: 'biz_casual',       label: 'Business Casual',        prompt: 'fitted blazer, tailored trousers, silk blouse, block heels — polished and professional' },
  { id: 'power_suit',       label: 'Power Suit',             prompt: 'structured monochrome suit, no undershirt, pointed pumps, minimal accessories — commanding' },
  { id: 'high_fashion',     label: 'High Fashion',           prompt: 'avant-garde editorial look: architectural structured silhouette, fashion week styling, solid fabrics — no logos, no text on clothing' },
  { id: 'old_money',        label: 'Old Money',              prompt: 'cashmere knit, wide-leg cream trousers, loafers, structured bag — quiet luxury' },
  { id: 'monochrome',       label: 'Monochrome',             prompt: 'head-to-toe tonal look, clean architectural lines, one color, minimal accessories — solid fabrics only' },
  { id: 'luxury_casual',    label: 'Luxury Casual',          prompt: 'structured woven bag, linen coord set, slides, gold jewelry — effortless expensive, no logos' },
  { id: 'resort',           label: 'Resort',                 prompt: 'flowy printed maxi dress, woven sun hat, strappy sandals, gold jewelry — resort luxe' },
  { id: 'beach',            label: 'Beach',                  prompt: 'designer bikini, lightweight sarong wrap, oversized sunglasses, gold accessories' },
  { id: 'pool',             label: 'Poolside',               prompt: 'luxury one-piece swimsuit, designer slides, oversized beach hat, linen cover-up' },
  { id: 'cozy_winter',      label: 'Winter Coat',            prompt: 'oversized tailored coat, turtleneck, knee-high boots, structured bag — cold weather editorial' },
  { id: 'y2k',              label: 'Y2K',                    prompt: 'Y2K revival: low-rise jeans, rhinestone crop top, butterfly clips, platform sandals' },
  { id: 'boudoir',          label: 'Studio Editorial',       prompt: 'silk robe, fitted lace bodysuit, soft natural confidence — tasteful editorial studio look' },
  // — Men's looks —
  { id: 'men_casual',       label: 'Men — Casual',           prompt: 'fitted white tee, dark slim jeans, clean white sneakers, minimal gold chain — effortless casual' },
  { id: 'men_streetwear',   label: 'Men — Streetwear',       prompt: 'premium hoodie in solid neutral tone, relaxed joggers, clean sneakers — no logos, elevated streetwear' },
  { id: 'men_suit',         label: 'Men — Suit',             prompt: 'tailored slim suit, no tie, crisp dress shirt open at collar, oxford shoes — sharp and polished' },
  { id: 'men_monochrome',   label: 'Men — All Black',        prompt: 'all-black outfit, slim trousers, fitted turtleneck, clean leather shoes — sleek monochrome' },
  { id: 'men_linen',        label: 'Men — Old Money',        prompt: 'linen shirt, tailored chinos, leather loafers, simple watch — quiet luxury old money' },
  { id: 'men_designer_set', label: 'Men — Designer Set',     prompt: 'designer short set in solid color, premium sneakers, gold chain — summer luxury lifestyle' },
  { id: 'men_poolside',     label: 'Men — Poolside',         prompt: 'swim trunks, sun-kissed skin, no shirt — poolside or beach lifestyle editorial' },
  { id: 'men_tracksuit',    label: 'Men — Tracksuit',        prompt: 'luxury tracksuit in solid color, clean sneakers, no logos — athleisure editorial' },
  { id: 'men_bomber',       label: 'Men — Bomber',           prompt: 'bomber jacket, slim dark jeans, crisp tee, fresh sneakers — street ready' },
  { id: 'men_overcoat',     label: 'Men — Overcoat',         prompt: 'structured overcoat, turtleneck, slim trousers, leather boots — winter editorial' },
  { id: 'men_biz',          label: 'Men — Business',         prompt: 'fitted blazer, chinos, loafers, clean watch, no tie — business casual' },
];
