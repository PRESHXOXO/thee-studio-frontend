// Creator identity data model + option lists for the multi-step Creator
// Builder wizard. Separates permanent physical identity (coreIdentity,
// hairIdentity, bodyIdentity, identityReferences) from changeable styling
// (brandProfile) per the "build the human first, style second" principle —
// brand edits must never be able to drift the locked face/body.
//
// Backend reality check: character_seed_generate / character_variation_shot
// (src/api/studio.js) take a loose params object and build the actual
// generation prompt server-side (Python/Gradio, not in this repo). There is
// no endpoint that accepts structured face-shape/body-proportion fields
// individually, and no dedicated "natural language -> structured fields"
// AI endpoint. Fields with no direct backend param (face shape, brow shape,
// body proportions, etc.) are folded into the existing free-text `vision`
// field the backend already reads — additive, doesn't require a backend
// change, but isn't true structured control either. Flagged in the New
// Creator screen's summary, not hidden.

export const AGE_RANGES = [
  { value: '18-24', label: '18–24' },
  { value: '25-29', label: '25–29' },
  { value: '30-34', label: '30–34' },
  { value: '35-39', label: '35–39' },
  { value: '40-49', label: '40–49' },
  { value: '50+',   label: '50+' },
];

export const UNDERTONES = [
  { value: 'Unspecified', label: 'Unspecified' },
  { value: 'Warm',    label: 'Warm' },
  { value: 'Golden',  label: 'Golden' },
  { value: 'Neutral', label: 'Neutral' },
  { value: 'Cool',    label: 'Cool' },
  { value: 'Olive',   label: 'Olive' },
  { value: 'Red',     label: 'Red' },
];

export const DISTINCTIVE_FEATURES = [
  { value: 'None', label: 'None' },
  { value: 'deep dimples when smiling',        label: 'Deep Dimples' },
  { value: 'soft natural freckles',            label: 'Soft Freckles' },
  { value: 'a beauty mark',                    label: 'Beauty Mark' },
  { value: 'full cheeks',                      label: 'Full Cheeks' },
  { value: 'a natural gap tooth smile',        label: 'Gap Tooth' },
  { value: 'hooded eyes',                      label: 'Hooded Eyes' },
  { value: "a strong cupid's bow",             label: "Strong Cupid's Bow" },
];

// Advanced appearance — collapsed by default, folded into the free-text
// vision field sent to generation (no dedicated backend params exist).
export const FACE_SHAPES     = ['Unspecified', 'Oval', 'Round', 'Square', 'Heart', 'Diamond', 'Oblong'].map(v => ({ value: v, label: v }));
export const FACIAL_FULLNESS = ['Unspecified', 'Lean', 'Balanced', 'Full'].map(v => ({ value: v, label: v }));
export const EYE_SHAPES      = ['Unspecified', 'Almond', 'Round', 'Hooded', 'Monolid', 'Downturned', 'Upturned'].map(v => ({ value: v, label: v }));
export const BROW_SHAPES     = ['Unspecified', 'Straight', 'Soft Arch', 'High Arch', 'Rounded'].map(v => ({ value: v, label: v }));
export const NOSE_SHAPES     = ['Unspecified', 'Straight', 'Button', 'Wide', 'Narrow', 'Aquiline'].map(v => ({ value: v, label: v }));
export const LIP_SHAPES      = ['Unspecified', 'Full', 'Balanced', 'Thin', "Defined Cupid's Bow"].map(v => ({ value: v, label: v }));
export const HAIR_TEXTURES   = ['Unspecified', 'Straight', 'Wavy', 'Curly', 'Coily', 'Kinky'].map(v => ({ value: v, label: v }));
export const HAIR_PARTS      = ['Unspecified', 'Center', 'Side', 'None'].map(v => ({ value: v, label: v }));

// Step 4 — body identity
export const HEIGHT_RANGES = ["Unspecified", "Under 5'2\"", "5'2\"–5'5\"", "5'6\"–5'9\"", "Over 5'9\""].map(v => ({ value: v, label: v }));
export const SHOULDER_WIDTHS = ['Unspecified', 'Narrow', 'Balanced', 'Broad'].map(v => ({ value: v, label: v }));
export const CHEST_FULLNESS  = ['Unspecified', 'Petite', 'Balanced', 'Full'].map(v => ({ value: v, label: v }));
export const WAIST_DEFINITIONS = ['Unspecified', 'Straight', 'Softly Defined', 'Defined'].map(v => ({ value: v, label: v }));
export const HIP_WIDTHS = ['Unspecified', 'Narrow', 'Balanced', 'Wide'].map(v => ({ value: v, label: v }));
export const THIGH_FULLNESS = ['Unspecified', 'Lean', 'Balanced', 'Full'].map(v => ({ value: v, label: v }));
export const BODY_SHAPES = ['Unspecified', 'Hourglass', 'Pear', 'Apple', 'Rectangle', 'Athletic Inverted Triangle'].map(v => ({ value: v, label: v }));

// Step 5 — brand
export const PHOTOGRAPHY_STYLES = [
  'Natural Smartphone', 'Polished Creator', 'Editorial', 'Cinematic',
  'Vintage Digital', 'Camcorder', 'Luxury Lifestyle', 'Studio Beauty', 'Candid Documentary',
];

export const CREATOR_STATUS = {
  DRAFT: 'draft',
  FACE_APPROVED: 'face_approved',
  IDENTITY_LOCKED: 'identity_locked',
};

export function newCreatorId() {
  return `cr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// Blank record matching the requested shape — every screen in the wizard
// patches into this via patchCreatorDraft rather than owning its own state
// shape, so nothing gets lost moving between steps.
export function blankCreatorDraft() {
  const now = new Date().toISOString();
  return {
    id: newCreatorId(),
    name: '',
    status: CREATOR_STATUS.DRAFT,
    identityVersion: 1,
    createdAt: now,
    updatedAt: now,

    coreIdentity: {
      adultAgeRange: '',
      gender: 'Unspecified',
      skinTone: 'Unspecified',
      skinUndertone: 'Unspecified',
      faceShape: 'Unspecified',
      facialFullness: 'Unspecified',
      eyeColor: 'Unspecified',
      eyeShape: 'Unspecified',
      browShape: 'Unspecified',
      noseShape: 'Unspecified',
      lipShape: 'Unspecified',
      distinctiveFeatures: 'None',
      naturalLanguageDescription: '',
      additionalIdentityDetails: '',
    },

    hairIdentity: {
      style: 'Unspecified',
      texture: 'Unspecified',
      color: 'Unspecified',
      part: 'Unspecified',
    },

    bodyIdentity: {
      heightRange: 'Unspecified',
      overallBuild: 'Unspecified',
      shoulderWidth: 'Unspecified',
      chestOrBustFullness: 'Unspecified',
      waistDefinition: 'Unspecified',
      hipWidth: 'Unspecified',
      thighFullness: 'Unspecified',
      bodyShape: 'Unspecified',
      description: '',
    },

    identityReferences: {
      primaryReference: null, // index into images[] currently marked primary
      images: [], // [{ label, url, status: 'pending'|'generating'|'approved'|'error' }]
      faceAnchor: '',
    },

    brandProfile: {
      worlds: [],
      energies: [],
      signatureClothing: 'Unspecified',
      signatureJewelry: 'None',
      makeupStyle: '',
      photographyStyles: [],
      niches: [],
      signatureColors: '',
    },
  };
}

export function touchDraft(draft) {
  return { ...draft, updatedAt: new Date().toISOString() };
}

// Resolves a {value,label} option's label for display, falling back to the
// raw value for freeform fields with no option list.
export function labelFor(value, options) {
  if (!options) return value;
  return options.find(o => o.value === value)?.label || value;
}

// Folds every advanced/structural field with no direct backend param into
// one descriptive sentence appended to whatever the user typed themselves,
// so it still reaches generation via the existing free-text `vision` field
// instead of silently being dropped on the floor.
export function composeDescription(draft) {
  const c = draft.coreIdentity;
  const parts = [];
  const structural = [
    c.faceShape !== 'Unspecified' && `${c.faceShape.toLowerCase()} face shape`,
    c.facialFullness !== 'Unspecified' && `${c.facialFullness.toLowerCase()} facial fullness`,
    c.eyeShape !== 'Unspecified' && `${c.eyeShape.toLowerCase()} eye shape`,
    c.browShape !== 'Unspecified' && `${c.browShape.toLowerCase()} brows`,
    c.noseShape !== 'Unspecified' && `${c.noseShape.toLowerCase()} nose`,
    c.lipShape !== 'Unspecified' && `${c.lipShape.toLowerCase()} lips`,
    c.distinctiveFeatures !== 'None' && c.distinctiveFeatures,
    c.additionalIdentityDetails && c.additionalIdentityDetails,
  ].filter(Boolean);
  if (structural.length) parts.push(structural.join(', ') + '.');
  if (c.naturalLanguageDescription) parts.push(c.naturalLanguageDescription.trim());
  return parts.join(' ');
}

export function composeBodyDescription(draft) {
  const b = draft.bodyIdentity;
  const parts = [
    b.heightRange !== 'Unspecified' && `height ${b.heightRange}`,
    b.shoulderWidth !== 'Unspecified' && `${b.shoulderWidth.toLowerCase()} shoulders`,
    b.chestOrBustFullness !== 'Unspecified' && `${b.chestOrBustFullness.toLowerCase()} chest/bust fullness`,
    b.waistDefinition !== 'Unspecified' && `${b.waistDefinition.toLowerCase()} waist`,
    b.hipWidth !== 'Unspecified' && `${b.hipWidth.toLowerCase()} hips`,
    b.thighFullness !== 'Unspecified' && `${b.thighFullness.toLowerCase()} thighs`,
    b.bodyShape !== 'Unspecified' && `${b.bodyShape} body shape`,
    b.description && b.description.trim(),
  ].filter(Boolean);
  return parts.join(', ') + (parts.length ? '.' : '');
}

// Heuristic natural-language correction parser — NOT real NLP. There is no
// backend endpoint that translates freeform corrections into structured
// identity fields, so this does simple keyword matching against the known
// option lists (hair color words, "fuller"/"slimmer" cues, etc.) and patches
// whatever it can confidently match. Anything unmatched still reaches
// generation as raw text via the vision field, so it's never silently lost
// — the parser is a bonus, not the only path.
export function parseCorrectionText(text, gender) {
  const patch = {};
  const lower = text.toLowerCase();

  const colorMap = {
    burgundy: 'burgundy wine', black: 'natural jet black', brown: 'rich dark brown',
    blonde: 'golden blonde, sun-kissed', red: 'copper red, vibrant', auburn: 'auburn with red tones',
    platinum: 'platinum blonde', silver: 'silver grey, sleek', grey: 'silver grey, sleek', gray: 'silver grey, sleek',
  };
  for (const [word, value] of Object.entries(colorMap)) {
    if (lower.includes(word)) { patch.hairColor = value; break; }
  }

  if (/fuller cheeks|full cheeks|fuller face/.test(lower)) patch.facialFullness = 'Full';
  if (/slimmer face|leaner face|slim(mer)? cheeks/.test(lower)) patch.facialFullness = 'Lean';
  if (/older|age.*up/.test(lower)) patch.ageHint = 'older';
  if (/younger|age.*down/.test(lower)) patch.ageHint = 'younger';
  if (/pixie/.test(lower) && /taper|shorter|shave/.test(lower)) patch.hairStyleNote = 'tapered pixie cut, shorter at the sides';

  return patch;
}
