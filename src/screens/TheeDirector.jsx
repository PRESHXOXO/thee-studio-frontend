import React from 'react';
import { Card } from '../components/surfaces/Card.jsx';
import { Field } from '../components/forms/Field.jsx';
import { Select } from '../components/forms/Select.jsx';
import { Input } from '../components/forms/Input.jsx';
import { Button } from '../components/core/Button.jsx';
import { PromptOutput } from '../components/feedback/PromptOutput.jsx';
import { Icon } from '../components/core/Icon.jsx';
import { buildDirectorOutputs } from '../api/studio.js';

const CONTENT_TYPES = ['Portrait', 'Beauty', 'Fashion', 'Lifestyle', 'Product', 'UGC', 'Campaign', 'Social Post', 'Cinematic Still', 'Travel / Hospitality'].map(v => ({ value: v, label: v }));
const MOODS         = ['Clean', 'Soft', 'Luxury', 'Bold', 'Romantic', 'Playful', 'Editorial', 'Candid', 'Cinematic', 'Elevated Casual'].map(v => ({ value: v, label: v }));
const OUTPUT_GOALS  = ['Build Prompt Only', 'Generate Image', 'Create Variations', 'Campaign Asset'].map(v => ({ value: v, label: v }));
const LOCATIONS     = ['None', 'Yacht', 'Penthouse', 'Podcast Studio', 'Bedroom', 'Luxury Car'].map(v => ({ value: v, label: v }));
const GENDERS       = ['Unspecified', 'Woman', 'Man', 'Non-binary', 'Femme', 'Androgynous'].map(v => ({ value: v, label: v }));

const SKIN_TONES = [
  { value: 'Unspecified', label: 'Unspecified' },
  { value: 'deep ebony with cool undertones',          label: 'Deep Ebony — cool undertones' },
  { value: 'deep ebony with warm red undertones',      label: 'Deep Ebony — warm red undertones' },
  { value: 'rich deep brown with golden undertones',   label: 'Rich Deep Brown — golden glow' },
  { value: 'warm espresso brown',                      label: 'Warm Espresso Brown' },
  { value: 'deep caramel with warm golden glow',       label: 'Deep Caramel — golden glow' },
  { value: 'warm chocolate brown',                     label: 'Warm Chocolate Brown' },
  { value: 'chestnut brown with red undertones',       label: 'Chestnut Brown — red undertones' },
  { value: 'medium golden caramel',                    label: 'Medium Golden Caramel' },
  { value: 'warm caramel with honey undertones',       label: 'Warm Caramel — honey undertones' },
  { value: 'rich medium brown with olive undertones',  label: 'Medium Brown — olive undertones' },
  { value: 'warm tan with golden undertones',          label: 'Warm Tan — golden undertones' },
  { value: 'warm olive complexion',                    label: 'Warm Olive' },
  { value: 'light honey beige',                        label: 'Light Honey Beige' },
  { value: 'warm beige with pink undertones',          label: 'Warm Beige — pink undertones' },
  { value: 'cool beige with neutral undertones',       label: 'Cool Beige — neutral' },
  { value: 'fair ivory with warm undertones',          label: 'Fair Ivory — warm' },
  { value: 'porcelain fair with cool pink undertones', label: 'Porcelain — cool pink' },
];

const HAIR_STYLES = [
  { value: 'Unspecified', label: 'Unspecified' },
  { value: 'box braids, waist length',       label: 'Box Braids — waist length' },
  { value: 'knotless braids, shoulder length', label: 'Knotless Braids — shoulder' },
  { value: 'Senegalese twists',              label: 'Senegalese Twists' },
  { value: 'goddess locs',                   label: 'Goddess Locs' },
  { value: 'faux locs, bohemian',            label: 'Faux Locs — bohemian' },
  { value: 'traditional dreadlocks',         label: 'Traditional Locs / Dreadlocks' },
  { value: 'sisterlocks',                    label: 'Sisterlocks' },
  { value: 'cornrows, sleek',                label: 'Cornrows — sleek' },
  { value: 'full natural afro',              label: 'Full Natural Afro' },
  { value: 'TWA tapered natural',            label: 'TWA — tapered natural' },
  { value: 'bantu knots',                    label: 'Bantu Knots' },
  { value: 'silk press, bone straight',      label: 'Silk Press — bone straight' },
  { value: 'sleek blowout, voluminous',      label: 'Sleek Blowout — voluminous' },
  { value: 'sleek high ponytail',            label: 'Sleek High Ponytail' },
  { value: 'long loose curls, natural',      label: 'Long Loose Curls' },
  { value: 'beachy waves',                   label: 'Beachy Waves' },
  { value: 'body waves, glossy',             label: 'Body Waves — glossy' },
  { value: 'finger waves, vintage',          label: 'Finger Waves — vintage' },
  { value: 'sleek bob, chin length',         label: 'Sleek Bob' },
  { value: 'long straight, ultra sleek',     label: 'Long Straight — ultra sleek' },
  { value: 'pixie cut',                      label: 'Pixie Cut' },
  { value: 'space buns',                     label: 'Space Buns' },
];

const HAIR_COLORS = [
  { value: 'Unspecified', label: 'Unspecified' },
  { value: 'natural jet black',              label: 'Natural Jet Black' },
  { value: 'blue-black, high shine',         label: 'Blue-Black — high shine' },
  { value: 'dark espresso brown',            label: 'Dark Espresso Brown' },
  { value: 'rich dark brown',                label: 'Rich Dark Brown' },
  { value: 'warm chestnut brown',            label: 'Warm Chestnut Brown' },
  { value: 'auburn with red tones',          label: 'Auburn — red tones' },
  { value: 'copper red, vibrant',            label: 'Copper Red — vibrant' },
  { value: 'warm honey blonde',              label: 'Warm Honey Blonde' },
  { value: 'golden blonde, sun-kissed',      label: 'Golden Blonde — sun-kissed' },
  { value: 'platinum blonde',                label: 'Platinum Blonde' },
  { value: 'ash blonde, cool toned',         label: 'Ash Blonde — cool' },
  { value: 'caramel highlights, ombre',      label: 'Caramel Ombre' },
  { value: 'dark to blonde ombre',           label: 'Dark to Blonde Ombre' },
  { value: 'burgundy wine',                  label: 'Burgundy / Wine' },
  { value: 'silver grey, sleek',             label: 'Silver Grey' },
  { value: 'pastel pink highlights',         label: 'Pastel Pink Highlights' },
];

const EYE_DETAILS = [
  { value: 'Unspecified', label: 'Unspecified' },
  { value: 'deep dark brown, intense',       label: 'Deep Dark Brown — intense' },
  { value: 'warm brown, almond shaped',      label: 'Warm Brown — almond' },
  { value: 'honey brown, luminous',          label: 'Honey Brown — luminous' },
  { value: 'hazel with green flecks',        label: 'Hazel — green flecks' },
  { value: 'bright green, vivid',            label: 'Bright Green' },
  { value: 'steel grey, piercing',           label: 'Steel Grey — piercing' },
  { value: 'deep blue, expressive',          label: 'Deep Blue — expressive' },
  { value: 'amber gold, rare',               label: 'Amber Gold' },
  { value: 'cat eye shape, elongated lash',  label: 'Cat Eye Shape' },
  { value: 'doe eyes, wide and expressive',  label: 'Doe Eyes — wide' },
  { value: 'smoky eye makeup, dramatic',     label: 'Smoky Eye Makeup' },
  { value: 'natural lash, minimal makeup',   label: 'Natural Lash — minimal' },
  { value: 'bold graphic liner, editorial',  label: 'Bold Graphic Liner' },
];

const JEWELRY_OPTIONS = [
  { value: 'None', label: 'None / Minimal' },
  { value: 'small diamond studs, understated', label: 'Diamond Studs — understated' },
  { value: 'gold hoops, medium size',           label: 'Gold Hoops' },
  { value: 'statement oversized earrings',      label: 'Statement Earrings — oversized' },
  { value: 'layered gold chains, textured',     label: 'Layered Gold Chains' },
  { value: 'diamond tennis necklace',           label: 'Tennis Necklace — diamond' },
  { value: 'Cartier love bracelet, gold',       label: 'Cartier Love Bracelet' },
  { value: 'Rolex watch, luxury',               label: 'Rolex Watch' },
  { value: 'Van Cleef clover necklace',         label: 'Van Cleef Clover' },
  { value: 'stacked gold rings, editorial',     label: 'Stacked Gold Rings' },
  { value: 'body chain, gold delicate',         label: 'Delicate Body Chain' },
  { value: 'full luxury set: necklace, earrings, bracelet, rings', label: 'Full Luxury Set' },
  { value: 'pearl accents, modern',             label: 'Modern Pearls' },
  { value: 'diamond ear cuff, edgy',            label: 'Diamond Ear Cuff' },
];

const CLOTHING_VIBES = [
  { value: 'Unspecified', label: 'Unspecified' },
  { value: 'luxury casual: Bottega Veneta bag, linen co-ord set', label: 'Luxury Casual — Bottega / Linen' },
  { value: 'high fashion editorial: Balenciaga, sharp structured silhouette', label: 'High Fashion — Balenciaga' },
  { value: 'streetwear luxury: Off-White, Fear of God, oversized', label: 'Streetwear Luxury — Off-White' },
  { value: 'date night: satin slip dress, Louboutin heels', label: 'Date Night — satin slip + heels' },
  { value: 'business power: tailored blazer, Saint Laurent, minimal', label: 'Business Power — tailored' },
  { value: 'resort glam: Zimmermann, flowy dress, sun hat', label: 'Resort Glam — Zimmermann' },
  { value: 'athleisure luxury: Skims, Lululemon, sleek sneakers', label: 'Athleisure — Skims / Lululemon' },
  { value: 'denim elevated: custom denim, cropped jacket, boots', label: 'Elevated Denim' },
  { value: 'monochrome minimal: tonal outfit, clean lines, Celine', label: 'Monochrome Minimal — Celine' },
  { value: 'Y2K glam: low rise, butterfly clips, rhinestones', label: 'Y2K Glam' },
  { value: 'old money: cashmere, equestrian, Ralph Lauren', label: 'Old Money — cashmere + equestrian' },
  { value: 'intimate editorial: silk robe, sheer lace bodysuit, soft natural confidence, tasteful editorial pose', label: 'Intimate Editorial — silk + lace' },
  { value: 'lingerie editorial: designer lingerie set, Savage X Fenty or La Perla, tasteful boudoir-inspired editorial', label: 'Lingerie Editorial — designer set' },
  { value: 'swimwear luxury: high-end bikini or one-piece, resort lifestyle, body confidence', label: 'Swimwear — resort luxury' },
  { value: 'barely-there: minimal coverage, body-conscious editorial, luxury lifestyle', label: 'Barely There — editorial' },
];

const SPECIAL_FEATURES = [
  { value: 'None', label: 'None' },
  { value: 'visible beauty marks / moles, natural',       label: 'Beauty Marks / Moles' },
  { value: 'light natural freckles across nose and cheeks', label: 'Natural Freckles' },
  { value: 'deep dimples when smiling',                   label: 'Deep Dimples' },
  { value: 'full lips, glossy finish',                    label: 'Full Glossy Lips' },
  { value: 'strong defined jawline',                      label: 'Defined Jawline' },
  { value: 'high cheekbones, sculpted',                   label: 'High Cheekbones' },
  { value: 'natural melanin glow, dewy skin',             label: 'Melanin Glow — dewy' },
  { value: 'visible tattoos, artistic',                   label: 'Visible Tattoos' },
  { value: 'natural glowing skin, no makeup',             label: 'No Makeup — natural glow' },
  { value: 'bold red lip, power glam',                    label: 'Bold Red Lip' },
  { value: 'glazed donut skin, glass skin finish',        label: 'Glass Skin — glazed' },
];

const LABEL = { font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--text-muted)', margin: 0 };

function buildStructuredVision({ vision, gender, skinTone, hairStyle, hairColor, eyeDetail, jewelry, clothing, features, mood, contentType, scene }) {
  const s = [];

  s.push('Ultra-realistic 4K commercial lifestyle photography. Shot for a premium fashion and lifestyle brand campaign. The final image must look like a high-end photograph taken on a professional camera — not AI-generated, not illustrated, not stylized.');

  // Subject — framed as casting/creative direction, no body language
  const hasSubject = gender !== 'Unspecified' || skinTone !== 'Unspecified' || eyeDetail !== 'Unspecified';
  if (hasSubject) {
    const who = gender !== 'Unspecified' ? gender : 'talent';
    const skin = skinTone !== 'Unspecified'
      ? `${skinTone} complexion. Skin should render with realistic texture — visible pores, natural highlights, subtle variations in tone, no plastic or airbrushed appearance`
      : '';
    const eyes = eyeDetail !== 'Unspecified'
      ? `${eyeDetail} eyes. Eye rendering should be sharp, wet, dimensional, and lifelike`
      : '';
    s.push(`TALENT / CASTING: ${who}${skin ? `. ${skin}` : ''}${eyes ? `. ${eyes}` : ''}. Face must look photorealistic — natural facial asymmetry, real skin imperfections, grounded expression, believable editorial presence. No smoothed-out AI face, no uncanny valley.`);
  }

  // Hair — framed as styling direction
  if (hairStyle !== 'Unspecified' || hairColor !== 'Unspecified') {
    const hair = [
      hairStyle !== 'Unspecified' ? hairStyle : '',
      hairColor !== 'Unspecified' ? `in ${hairColor}` : '',
    ].filter(Boolean).join(', ');
    s.push(`HAIR STYLING: ${hair}. Render with full strand-level detail — individual hair texture, natural frizz, fine flyaways, realistic shine and depth. Hair should interact naturally with light and gravity. Never plastic, never helmet-like, never overly perfect.`);
  }

  // Wardrobe — framed as costume/styling notes
  const hasWardrobe = clothing !== 'Unspecified' || jewelry !== 'None' || features !== 'None';
  if (hasWardrobe) {
    const items = [
      clothing !== 'Unspecified' ? `${clothing} — render fabric with realistic texture, natural folds, tension at seams, and accurate light response` : '',
      jewelry !== 'None' ? `Accessories: ${jewelry} — render with accurate material finish, realistic reflections, true-to-life scale` : '',
      features !== 'None' ? `Notable features: ${features} — render naturally, embedded in skin, following body contours` : '',
    ].filter(Boolean);
    s.push(`WARDROBE & ACCESSORIES: ${items.join('. ')}. All items must look expensive, real, and brand-accurate. No fake-looking materials, no floating accessories, no distorted logos.`);
  }

  // Location
  if (scene && scene !== 'None') {
    s.push(`LOCATION: ${scene}. Premium environment with authentic architectural detail, polished surfaces, and controlled depth. Background should feel real and expensive — never stock-photo generic, never CGI.`);
  }

  // Creative direction from user
  if (vision) s.push(`ART DIRECTION: ${vision}`);

  // Mood & content type
  if (mood || contentType) {
    s.push(`CAMPAIGN FEEL: ${[contentType, mood].filter(Boolean).join(' — ')}. The image should feel like it belongs in a premium editorial spread or luxury brand campaign. Aspirational, believable, and polished — never staged or forced.`);
  }

  // Pose & composition
  s.push('POSE & COMPOSITION: Natural, confident posture appropriate for a premium lifestyle shoot. Candid-feeling but composed — editorial without being stiff. Flattering three-quarter or portrait angle. Intentional negative space. Realistic anatomy and natural proportions. Framing suitable for Instagram, campaign billboard, or magazine spread.');

  // Lighting
  s.push('LIGHTING: Soft, dimensional natural or studio lighting. Light wraps realistically around the subject — highlights on cheekbones, shoulders, hair, and clothing. Believable shadow depth. Warm and refined color grading. No flat lighting, no harsh flash, no overexposed background, no muddy shadows.');

  // Camera
  s.push('CAMERA SPECS: Shot on Sony A1, Canon EOS R5, or equivalent professional full-frame camera. 50mm–85mm portrait lens. Shallow depth of field with natural bokeh on background. Crisp focus on subject face and styling details. High dynamic range. Realistic lens behavior — no AI softness, no lens distortion.');

  // Quality
  s.push('QUALITY REQUIREMENTS: Ultra-realistic photograph. 4K resolution. Professional commercial retouching — natural, not over-processed. Realistic skin texture and pores. Accurate fabric physics. Sharp accessory detail. Correct human anatomy. No distorted hands or fingers. No AI artifacts. No uncanny face. No floating elements. No oversaturated colors. No cheap or incorrect brand details.');

  return s.join('\n\n');
}

// FLUX-optimized prompt: natural flowing language works far better than section headers
// for FLUX Pro/Ultra. Raw photorealistic output = less AI filtering on the output.
function buildFluxVision({ vision, gender, skinTone, hairStyle, hairColor, eyeDetail, jewelry, clothing, features, mood, contentType, scene }) {
  const parts = [];

  // Subject block — flowing natural description
  const subjectParts = [];
  if (gender !== 'Unspecified') subjectParts.push(gender.toLowerCase());
  if (skinTone !== 'Unspecified') subjectParts.push(`with ${skinTone} skin`);

  let subjectLine = subjectParts.length ? `A stunning ${subjectParts.join(' ')}` : 'A stunning person';

  const hairParts = [
    hairStyle !== 'Unspecified' ? hairStyle : '',
    hairColor !== 'Unspecified' ? hairColor : '',
  ].filter(Boolean);
  if (hairParts.length) subjectLine += `, ${hairParts.join(', ')} hair`;
  if (eyeDetail !== 'Unspecified') subjectLine += `, ${eyeDetail} eyes`;
  if (features !== 'None') subjectLine += `, ${features}`;
  parts.push(subjectLine + '.');

  // Wardrobe
  if (clothing !== 'Unspecified') parts.push(`Wearing ${clothing}.`);
  if (jewelry !== 'None') parts.push(`Adorned with ${jewelry}.`);

  // Scene and mood
  if (scene && scene !== 'None') parts.push(`Set in a ${scene.toLowerCase()} environment.`);
  if (vision) parts.push(vision.trim().endsWith('.') ? vision.trim() : vision.trim() + '.');

  const moodParts = [contentType !== 'Portrait' ? contentType : '', mood !== 'Clean' ? mood : ''].filter(Boolean);
  if (moodParts.length) parts.push(`${moodParts.join(', ')} mood and aesthetic.`);

  // Quality anchors — FLUX responds well to these at the end
  parts.push('Photorealistic editorial photograph. Shot on Sony A1 85mm f/1.4. Natural soft studio light, warm color grading. Individual hair strand detail, visible skin pores, natural skin texture, realistic fabric physics, lifelike human expression and anatomy. Ultra-detailed 4K. Luxury commercial campaign quality. Not AI-generated looking, no plastic skin, no uncanny valley, no distorted anatomy.');

  return parts.join(' ');
}

export function TheeDirector({ onNav, initialScene = 'None', initialVision = '' }) {
  const [vision, setVision]           = React.useState(initialVision);
  const [contentType, setContentType] = React.useState('Portrait');
  const [mood, setMood]               = React.useState('Clean');
  const [outputGoal, setOutputGoal]   = React.useState('Build Prompt Only');
  const [scene, setScene]             = React.useState(initialScene);
  const [gender, setGender]           = React.useState('Unspecified');
  const [skinTone, setSkinTone]       = React.useState('Unspecified');
  const [hairStyle, setHairStyle]     = React.useState('Unspecified');
  const [hairColor, setHairColor]     = React.useState('Unspecified');
  const [eyeDetail, setEyeDetail]     = React.useState('Unspecified');
  const [jewelry, setJewelry]         = React.useState('None');
  const [clothing, setClothing]       = React.useState('Unspecified');
  const [features, setFeatures]       = React.useState('None');
  const [loading, setLoading]         = React.useState(false);
  const [error, setError]             = React.useState('');
  const [outputs, setOutputs]         = React.useState(null);

  const STANDARD_NEGATIVE = 'low resolution, blurry, plastic skin, waxy skin, over-smoothed face, AI beauty filter, uncanny face, distorted eyes, warped hands, extra fingers, missing fingers, broken anatomy, unnatural body proportions, stiff pose, flat lighting, harsh flash, oversaturated colors, cluttered background, cartoon styling, floating tattoos, fake jewelry, bad fabric physics, cropped limbs, generic photo, artificial smile, lifeless expression, overprocessed HDR, grainy, noisy, unrealistic skin color, washed-out skin, plastic hair, duplicate body parts, distorted face';

  // Direct mode: bypasses Gradio backend, sends our structured brief straight to OpenAI/Replicate.
  // Better quality for cloud engines — no detail lost to backend AI compression.
  const handleDirectBuild = () => {
    const positivePrompt = buildStructuredVision({
      vision, gender, skinTone, hairStyle, hairColor,
      eyeDetail, jewelry, clothing, features, mood, contentType, scene,
    });
    const result = {
      positivePrompt,
      negativePrompt: STANDARD_NEGATIVE,
      recommendedEngine: 'OpenAI Image',
      reason: 'Structured format optimized for OpenAI gpt-image-1.',
    };
    setOutputs(result);
    if (outputGoal === 'Generate Image') {
      onNav && onNav('images', { positivePrompt: result.positivePrompt, negativePrompt: result.negativePrompt });
    }
  };

  const handleFluxBuild = () => {
    const positivePrompt = buildFluxVision({
      vision, gender, skinTone, hairStyle, hairColor,
      eyeDetail, jewelry, clothing, features, mood, contentType, scene,
    });
    const result = {
      positivePrompt,
      negativePrompt: STANDARD_NEGATIVE,
      recommendedEngine: 'Replicate FLUX Pro',
      reason: 'Natural language format optimized for FLUX Pro. Backend uses prompt_upsampling + safety_tolerance 5 for unrestricted editorial output.',
    };
    setOutputs(result);
    if (outputGoal === 'Generate Image') {
      onNav && onNav('images', { positivePrompt: result.positivePrompt, negativePrompt: result.negativePrompt });
    }
  };

  // Standard mode: sends to Gradio backend AI for refinement (better for local ComfyUI engines).
  const handleBuild = async () => {
    setError('');
    setLoading(true);
    try {
      const enrichedVision = buildStructuredVision({
        vision, gender, skinTone, hairStyle, hairColor,
        eyeDetail, jewelry, clothing, features, mood, contentType, scene,
      });

      const result = await buildDirectorOutputs({
        vision: enrichedVision,
        contentType,
        mood,
        outputGoal,
        character: 'None',
        scene: scene || 'None',
        useIdentityLock: false,
      });

      const enhancedNegative = result.negativePrompt
        ? `${result.negativePrompt}, ${STANDARD_NEGATIVE}`
        : STANDARD_NEGATIVE;

      const finalOutputs = { ...result, negativePrompt: enhancedNegative };
      setOutputs(finalOutputs);
      if (outputGoal === 'Generate Image') {
        onNav && onNav('images', { positivePrompt: finalOutputs.positivePrompt, negativePrompt: finalOutputs.negativePrompt });
      }
    } catch (e) {
      setError(`Error: ${e?.message || String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 'var(--content-max)', margin: '0 auto' }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
        <div>
          <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--accent-deep)', marginBottom: 10 }}>Thee Director</div>
          <h1 style={{ font: 'var(--display-lg)', color: 'var(--text-strong)', letterSpacing: '-0.015em', margin: '0 0 10px' }}>Direct with intention. Create with impact.</h1>
          <p style={{ font: 'var(--text-lg)', color: 'var(--text-muted)', margin: 0, maxWidth: 520 }}>Shape content that connects. Dial in every detail. Let Thee Studio handle the rest.</p>
        </div>
        <Button variant="dark" onClick={() => onNav && onNav('history')}>
          <Icon name="history" size={15} /> Session history
        </Button>
      </div>

      {/* 3-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, alignItems: 'start' }}>

        {/* Column 1: Direction Controls */}
        <Card style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={LABEL}>Direction Controls</h3>

          <Field label="Vision" hint="Describe the creative direction in your own words.">
            <Input value={vision} onChange={setVision} placeholder="e.g. Golden hour rooftop, effortless luxury…" />
          </Field>
          <Field label="Content Type">
            <Select value={contentType} onChange={setContentType} options={CONTENT_TYPES} placeholder="Select type…" />
          </Field>
          <Field label="Mood / Tone">
            <Select value={mood} onChange={setMood} options={MOODS} placeholder="Select mood…" />
          </Field>
          <Field label="Output Goal">
            <Select value={outputGoal} onChange={setOutputGoal} options={OUTPUT_GOALS} placeholder="Select goal…" />
          </Field>
          <Field label="Location">
            <Select value={scene} onChange={setScene} options={LOCATIONS} />
          </Field>

          {error && <p style={{ font: 'var(--text-sm)', color: 'var(--cherry)', margin: 0 }}>{error}</p>}

          <Button variant="primary" onClick={handleDirectBuild} style={{ width: '100%' }}>
            <Icon name="zap" size={15} /> Direct Build — OpenAI
          </Button>
          <Button variant="dark" onClick={handleFluxBuild} style={{ width: '100%' }}>
            <Icon name="flame" size={15} /> Direct Build — FLUX Unrestricted
          </Button>
          <Button variant="secondary" loading={loading} onClick={handleBuild} style={{ width: '100%' }}>
            <Icon name="wand-2" size={15} /> {loading ? 'Building…' : 'AI Refine — Local / ComfyUI'}
          </Button>
        </Card>

        {/* Column 2: Subject Details */}
        <Card style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h3 style={LABEL}>Subject Details</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Gender">
              <Select value={gender} onChange={setGender} options={GENDERS} />
            </Field>
            <Field label="Skin Tone">
              <Select value={skinTone} onChange={setSkinTone} options={SKIN_TONES} placeholder="Select tone…" />
            </Field>
          </div>

          <Field label="Hair Style">
            <Select value={hairStyle} onChange={setHairStyle} options={HAIR_STYLES} placeholder="Select style…" />
          </Field>
          <Field label="Hair Color">
            <Select value={hairColor} onChange={setHairColor} options={HAIR_COLORS} placeholder="Select color…" />
          </Field>
          <Field label="Eyes">
            <Select value={eyeDetail} onChange={setEyeDetail} options={EYE_DETAILS} placeholder="Select detail…" />
          </Field>
          <Field label="Jewelry">
            <Select value={jewelry} onChange={setJewelry} options={JEWELRY_OPTIONS} />
          </Field>
          <Field label="Clothing / Brand Vibe">
            <Select value={clothing} onChange={setClothing} options={CLOTHING_VIBES} placeholder="Select vibe…" />
          </Field>
          <Field label="Special Features">
            <Select value={features} onChange={setFeatures} options={SPECIAL_FEATURES} />
          </Field>
        </Card>

        {/* Column 3: Prompt Builder */}
        <Card style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={LABEL}>Build Prompt</h3>

          <PromptOutput
            label="Positive Prompt"
            value={outputs?.positivePrompt}
            placeholder="Your positive prompt will appear here after building."
          />
          <PromptOutput
            label="Negative Prompt"
            value={outputs?.negativePrompt}
            placeholder="Your negative prompt will appear here after building."
          />

          {outputs?.recommendedEngine && (
            <div style={{ padding: '10px 14px', background: 'var(--rose-glass)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>Recommended Engine</div>
              <div style={{ font: '600 0.9375rem/1.4 var(--font-ui)', color: 'var(--text-strong)' }}>{outputs.recommendedEngine}</div>
              {outputs.reason && <div style={{ font: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 4 }}>{outputs.reason}</div>}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
            <Button
              variant="secondary"
              onClick={() => onNav && onNav('images', {
                positivePrompt: outputs?.positivePrompt || '',
                negativePrompt: outputs?.negativePrompt || '',
              })}
              style={{ flex: 1 }}
              disabled={!outputs?.positivePrompt}
            >
              Open in Generator
            </Button>
          </div>
        </Card>

      </div>
    </div>
  );
}
