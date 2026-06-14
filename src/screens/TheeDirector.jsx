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

  s.push('Create an ultra-realistic 4K luxury editorial image.');

  // Subject identity
  const hasSubject = gender !== 'Unspecified' || skinTone !== 'Unspecified' || eyeDetail !== 'Unspecified';
  if (hasSubject) {
    const who = gender !== 'Unspecified' ? gender : 'person';
    const skin = skinTone !== 'Unspecified'
      ? `${skinTone} complexion with visible natural skin texture, subtle pores, natural highlights, slight imperfections, and believable dimensional warmth`
      : '';
    const eyes = eyeDetail !== 'Unspecified'
      ? `${eyeDetail} eyes, softly expressive and realistic`
      : '';
    s.push(`SUBJECT: A confident, editorial-presence ${who}${skin ? `, ${skin}` : ''}${eyes ? `. ${eyes}` : ''}. The face should feel elegant, grounded, and real — natural facial asymmetry, soft expression, believable presence, premium editorial quality.`);
  }

  // Hair
  if (hairStyle !== 'Unspecified' || hairColor !== 'Unspecified') {
    const hair = [
      hairStyle !== 'Unspecified' ? hairStyle : '',
      hairColor !== 'Unspecified' ? `in ${hairColor}` : '',
    ].filter(Boolean).join(' ');
    s.push(`HAIR: ${hair}. Detailed and textured with natural frizz, fine flyaway hairs, realistic strand separation, small curly loose ends. The hair should catch light naturally showing realistic depth and shine — never plastic, never overly perfect.`);
  }

  // Wardrobe & styling
  const hasWardrobe = clothing !== 'Unspecified' || jewelry !== 'None' || features !== 'None';
  if (hasWardrobe) {
    const items = [
      clothing !== 'Unspecified' ? `${clothing} — realistic fabric texture, believable folds, tension at seams, and natural light interaction` : '',
      jewelry !== 'None' ? jewelry : '',
      features !== 'None' ? features : '',
    ].filter(Boolean);
    s.push(`WARDROBE & STYLING: ${items.join('. ')}. Everything should look expensive, editorial, and proportional — never cheap, never cartoonish.`);
  }

  // Scene / location
  if (scene && scene !== 'None') {
    s.push(`LOCATION: ${scene} setting. Luxury environment with polished surfaces, premium details, and refined atmosphere. Clean and controlled — expensive and aspirational without being cluttered.`);
  }

  // User's creative direction
  if (vision) s.push(`CREATIVE DIRECTION: ${vision}`);

  // Mood & brand
  if (mood || contentType) {
    s.push(`MOOD & BRAND: ${[mood, contentType].filter(Boolean).join(', ')} energy. The image should feel aspirational but believable — luxury without looking staged, forced, or overly commercial. Warm, intimate, and quietly expensive.`);
  }

  // Pose & composition
  s.push('POSE & COMPOSITION: Natural, elegant editorial posture. Graceful and relaxed body language — never stiff, never exaggerated. Use premium editorial framing with intentional negative space, flattering three-quarter angle, natural proportions, and realistic anatomy. Suitable for a luxury campaign or high-end lifestyle magazine.');

  // Lighting
  s.push('LIGHTING: Warm dimensional lighting with realistic shadows and highlights. Light wraps naturally around skin, creating believable depth and warmth. Refined color grading — warm amber highlights, rich skin tones, no flat lighting, no harsh flash, no muddy shadows.');

  // Camera & realism
  s.push('CAMERA: Photorealistic editorial photography on a high-end full-frame camera (Sony A1, Canon R5, or Hasselblad). 85mm portrait lens, shallow depth of field, natural bokeh, crisp subject detail, soft background separation. High dynamic range, realistic lens behavior, clean focus, natural skin rendering, visible fabric texture, fine hair detail.');

  // Quality controls
  s.push('QUALITY: Ultra-realistic, 4K resolution, high-end commercial photography, premium editorial finish. Realistic skin texture with natural imperfections. No plastic skin, no waxy face, no over-smoothed beauty filter, no uncanny AI face, no distorted hands, no broken anatomy, no extra fingers, believable fabric physics, no floating elements, no oversaturated colors, no cartoonish luxury styling.');

  return s.join('\n\n');
}

export function TheeDirector({ onNav }) {
  const [vision, setVision]           = React.useState('');
  const [contentType, setContentType] = React.useState('Portrait');
  const [mood, setMood]               = React.useState('Clean');
  const [outputGoal, setOutputGoal]   = React.useState('Build Prompt Only');
  const [scene, setScene]             = React.useState('None');
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

      // Append comprehensive quality negative prompt to whatever the backend returns
      const NEGATIVE_QUALITY = 'low resolution, blurry, soft focus on subject, plastic skin, waxy skin, over-smoothed face, AI beauty filter, uncanny face, distorted eyes, uneven eyes, warped hands, extra fingers, missing fingers, broken anatomy, unnatural body proportions, twisted limbs, stiff pose, flat lighting, harsh flash, muddy shadows, oversaturated colors, cluttered background, cartoon styling, floating tattoos, tattoo distortion, fake jewelry, bad fabric physics, poor composition, cropped limbs, awkward framing, generic influencer photo, artificial smile, lifeless expression, overprocessed HDR, grainy image, noisy image, unrealistic skin color, washed-out skin tone, dull hair texture, plastic hair, duplicate body parts, distorted face';
      const enhancedNegative = result.negativePrompt
        ? `${result.negativePrompt}, ${NEGATIVE_QUALITY}`
        : NEGATIVE_QUALITY;

      setOutputs({ ...result, negativePrompt: enhancedNegative });
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

          <Button variant="primary" loading={loading} onClick={handleBuild} style={{ width: '100%' }}>
            <Icon name="wand-2" size={15} /> {loading ? 'Building…' : 'Build Prompts'}
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
