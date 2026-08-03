// Prompt Lab — target-model adapter layer.
// The engine (backend, Claude) returns a model-formatted prompt + slots.
// Adapters own everything else that is per-model: display metadata, the
// one-sentence craft note shown under the prompt, whether Thee Studio can
// generate the image in-app (and through which engine path), and the
// standing negative constraints string. Adding a fourth model means adding
// one entry here — no engine or screen changes.

export const STANDING_NEGATIVES =
  'extra fingers, warped hands, plastic skin, waxy over-smoothing, dead eyes, garbled text in signage, unnatural symmetry';

const ADAPTERS = {
  gemini: {
    id: 'gemini',
    label: 'Nano Banana',
    sublabel: 'Gemini',
    icon: 'zap',
    // In-app generation path: characterGenerate engineId (with reference) and
    // a substring to find the engine in the live Creative Engine list (without).
    generation: { available: true, engineId: 'gemini_nano_banana', engineNameMatch: ['nano', 'banana', 'gemini'] },
    note(hasReference) {
      return hasReference
        ? 'Nano Banana is the strongest at keeping this exact person consistent — the prompt is phrased as an edit of your reference, not a fresh roll.'
        : 'Nano Banana reads flowing prose better than keyword stacks — this prompt is written as natural paragraphs for it.';
    },
  },
  openai: {
    id: 'openai',
    label: 'GPT Image',
    sublabel: 'ChatGPT',
    icon: 'sparkles',
    generation: { available: true, engineId: 'openai_image', engineNameMatch: ['openai'] },
    note() {
      return 'GPT Image tends to over-smooth skin and center everything — this prompt carries explicit texture and off-center composition language to counter both.';
    },
  },
  sora: {
    id: 'sora',
    label: 'Sora',
    sublabel: 'OpenAI video',
    icon: 'clapperboard',
    generation: { available: false, copyLabel: 'Copy for Sora' },
    note() {
      return 'Sora treats this as a shot description — one clause of camera motion is included, because a static prompt wastes the medium.';
    },
  },
  higgsfield: {
    id: 'higgsfield',
    label: 'Higgsfield',
    sublabel: 'Preset + motion',
    icon: 'film',
    generation: { available: false, copyLabel: 'Copy for Higgsfield' },
    note(hasReference) {
      return hasReference
        ? 'Higgsfield is the strongest path from a still into video — this is structured as image-to-video with a recommended preset and motion.'
        : 'Higgsfield works preset-first — the prompt ends with a recommended preset and motion line to paste alongside it.';
    },
  },
};

export const TARGET_MODELS = Object.values(ADAPTERS);

export function getAdapter(targetId) {
  return ADAPTERS[targetId] || ADAPTERS.openai;
}

// Resolve the live Creative Engine display name for a target (no-reference
// text-to-image path). `engineChoices` is the list from fetchEngineChoices().
export function resolveEngineName(targetId, engineChoices) {
  const adapter = getAdapter(targetId);
  if (!adapter.generation.available || !engineChoices?.length) return null;
  const ready = engineChoices.filter(c => !c.includes('Setup Needed') && !c.includes('Disabled'));
  for (const needle of adapter.generation.engineNameMatch) {
    const hit = ready.find(c => c.toLowerCase().includes(needle));
    if (hit) return hit;
  }
  return null;
}

// Refine-step option lists (fixed per brief; moods come from the engine per-request).
export const FORMATS = ['portrait', 'editorial spread', 'product', 'lifestyle', 'street', 'still life', 'interior'];
export const ASPECTS = ['1:1', '4:5', '9:16', '3:2', '16:9'];
export const LIGHTINGS = ['golden hour', 'blue hour', 'hard flash', 'soft window', 'studio beauty dish', 'neon', 'candlelit', 'overcast'];
export const FINISHES = ['editorial film', 'glossy digital', 'grainy 35mm', 'medium format clarity', 'iPhone-real'];
export const SURPRISE = 'Surprise me';

// Aspect → generateImage format string used by the existing backend path.
export function aspectToImageSize(aspect) {
  return {
    '1:1': 'Square 1:1',
    '4:5': 'Instagram 4:5',
    '9:16': 'Vertical 9:16',
    '3:2': 'Landscape 16:9',
    '16:9': 'Landscape 16:9',
  }[aspect] || 'Vertical 9:16';
}
