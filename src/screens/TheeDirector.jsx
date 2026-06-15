import React from 'react';
import { Card } from '../components/surfaces/Card.jsx';
import { Field } from '../components/forms/Field.jsx';
import { Select } from '../components/forms/Select.jsx';
import { Input } from '../components/forms/Input.jsx';
import { Button } from '../components/core/Button.jsx';
import { PromptOutput } from '../components/feedback/PromptOutput.jsx';
import { Icon } from '../components/core/Icon.jsx';
import { buildDirectorOutputs, generateImage, characterGenerate } from '../api/studio.js';
import { saveToLibrary } from '../lib/library.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CONTENT_TYPES = ['Portrait', 'Beauty', 'Fashion', 'Lifestyle', 'Product', 'UGC', 'Campaign', 'Social Post', 'Cinematic Still', 'Travel / Hospitality'].map(v => ({ value: v, label: v }));
const MOODS         = ['Clean', 'Soft', 'Luxury', 'Bold', 'Romantic', 'Playful', 'Editorial', 'Candid', 'Cinematic', 'Elevated Casual'].map(v => ({ value: v, label: v }));
const LOCATIONS     = [
  'None', 'Yacht', 'Penthouse', 'Private Jet', 'Rooftop', 'Poolside',
  'Studio', 'Boutique Hotel', 'Art Gallery', 'Night Club', 'Garden',
  'Beach', 'Desert', 'Bedroom', 'Podcast Studio', 'Luxury Car',
].map(v => ({ value: v, label: v }));

const GENDERS = ['Unspecified', 'Woman', 'Man', 'Non-binary', 'Femme', 'Androgynous'].map(v => ({ value: v, label: v }));

const SKIN_TONES = [
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

const HAIR_STYLES = [
  { value: 'Unspecified', label: 'Unspecified' },
  { value: 'box braids, waist length',        label: 'Box Braids — waist' },
  { value: 'knotless braids, shoulder length',label: 'Knotless Braids — shoulder' },
  { value: 'Senegalese twists',               label: 'Senegalese Twists' },
  { value: 'goddess locs',                    label: 'Goddess Locs' },
  { value: 'faux locs, bohemian',             label: 'Faux Locs — bohemian' },
  { value: 'traditional dreadlocks',          label: 'Traditional Locs' },
  { value: 'sisterlocks',                     label: 'Sisterlocks' },
  { value: 'cornrows, sleek',                 label: 'Cornrows — sleek' },
  { value: 'full natural afro',               label: 'Full Natural Afro' },
  { value: 'TWA tapered natural',             label: 'TWA — tapered' },
  { value: 'bantu knots',                     label: 'Bantu Knots' },
  { value: 'silk press, bone straight',       label: 'Silk Press — bone straight' },
  { value: 'sleek blowout, voluminous',       label: 'Sleek Blowout' },
  { value: 'sleek high ponytail',             label: 'Sleek High Ponytail' },
  { value: 'long loose curls, natural',       label: 'Long Loose Curls' },
  { value: 'beachy waves',                    label: 'Beachy Waves' },
  { value: 'body waves, glossy',              label: 'Body Waves — glossy' },
  { value: 'finger waves, vintage',           label: 'Finger Waves — vintage' },
  { value: 'sleek bob, chin length',          label: 'Sleek Bob' },
  { value: 'long straight, ultra sleek',      label: 'Long Straight — sleek' },
  { value: 'pixie cut',                       label: 'Pixie Cut' },
  { value: 'space buns',                      label: 'Space Buns' },
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
  { value: 'golden blonde, sun-kissed',      label: 'Golden Blonde' },
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

const JEWELRY_OPTIONS = [
  { value: 'None', label: 'None / Minimal' },
  { value: 'small diamond studs, understated',                                    label: 'Diamond Studs' },
  { value: 'gold hoops, medium size',                                              label: 'Gold Hoops' },
  { value: 'statement oversized earrings',                                         label: 'Statement Earrings' },
  { value: 'layered gold chains, textured',                                        label: 'Layered Gold Chains' },
  { value: 'diamond tennis necklace',                                              label: 'Tennis Necklace' },
  { value: 'Cartier love bracelet, gold',                                          label: 'Cartier Love Bracelet' },
  { value: 'Rolex watch, luxury',                                                  label: 'Rolex Watch' },
  { value: 'Van Cleef clover necklace',                                            label: 'Van Cleef Clover' },
  { value: 'stacked gold rings, editorial',                                        label: 'Stacked Gold Rings' },
  { value: 'body chain, gold delicate',                                            label: 'Delicate Body Chain' },
  { value: 'full luxury set: necklace, earrings, bracelet, rings',                 label: 'Full Luxury Set' },
  { value: 'pearl accents, modern',                                                label: 'Modern Pearls' },
  { value: 'diamond ear cuff, edgy',                                               label: 'Diamond Ear Cuff' },
];

const CLOTHING_VIBES = [
  { value: 'Unspecified', label: 'Unspecified' },
  // Everyday
  { value: 'casual: fitted white tee, high-waist dark jeans, clean sneakers, minimal accessories',                            label: 'Casual — jeans + tee' },
  { value: 'athleisure: matching athletic set, sports bra, biker shorts, sleek sneakers',                                     label: 'Athleisure — athletic set' },
  { value: 'Skims set: bodysuit, cycling shorts, oversized hoodie, clean sneakers, gold hoops',                               label: 'Elevated Athleisure — Skims' },
  { value: 'flowy floral mini sundress, strappy sandals, dainty gold jewelry, sunglasses',                                    label: 'Sundress — casual chic' },
  { value: 'linen coord set, strappy mules, sun hat, gold necklace — elevated summer daytime',                                label: 'Summer Brunch — linen' },
  { value: 'vintage denim jacket, straight-leg jeans, fitted white tee, ankle boots',                                         label: 'Elevated Denim' },
  // Going out
  { value: 'satin slip dress, strappy stiletto heels, diamond studs, sleek clutch — sensual but elegant',                     label: 'Date Night — satin slip' },
  { value: 'fitted little black dress, pointed-toe pumps, minimal gold jewelry — classic and polished',                       label: 'LBD — classic' },
  { value: 'chic tailored blazer over a bodysuit, wide-leg trousers, heels, bold statement earrings',                         label: 'Night Out — blazer moment' },
  { value: 'crystal-embellished mini dress, platform stilettos, full glam makeup, bold jewelry',                              label: 'Club Ready — crystal mini' },
  { value: 'sequin mini dress, heels, bold lip, statement jewelry — high-energy glam',                                        label: 'Party Glam — sequin' },
  // Professional
  { value: 'fitted blazer, tailored trousers, silk blouse, block heels — polished and professional',                          label: 'Business Casual — blazer' },
  { value: 'structured monochrome suit, no undershirt, pointed pumps, minimal accessories — commanding',                      label: 'Power Suit — monochrome' },
  { value: 'pencil skirt, tucked silk blouse, pointed heels, structured bag — corporate chic',                                label: 'Corporate Chic — pencil skirt' },
  // Fashion / Editorial
  { value: 'streetwear luxury: Off-White or Fear of God, cargo pants, chunky sneakers, oversized hoodie',                     label: 'Streetwear Luxury' },
  { value: 'high fashion editorial: Balenciaga, avant-garde structured silhouette, fashion week styling',                      label: 'High Fashion — editorial' },
  { value: 'cashmere knit, wide-leg cream trousers, loafers, structured bag — quiet luxury old money',                        label: 'Old Money — quiet luxury' },
  { value: 'head-to-toe tonal look, Celine aesthetic, clean lines, one color palette, minimal accessories',                   label: 'Monochrome Minimal — Celine' },
  { value: 'Bottega Veneta bag, linen coord set, designer slides, gold jewelry — effortless expensive',                       label: 'Luxury Casual — Bottega' },
  // Scene-specific
  { value: 'Zimmermann flowy maxi dress, woven sun hat, strappy sandals, gold jewelry — resort lifestyle',                    label: 'Resort Glam — Zimmermann' },
  { value: 'designer bikini, sheer sarong wrap, oversized sunglasses, gold body jewelry',                                     label: 'Beach — designer bikini' },
  { value: 'luxury one-piece swimsuit, designer slides, oversized beach hat, linen cover-up',                                 label: 'Poolside — luxury one-piece' },
  { value: 'oversized tailored coat, ribbed turtleneck, knee-high boots, structured bag — cold weather editorial',            label: 'Winter Coat Moment' },
  { value: 'Y2K revival: low-rise jeans, rhinestone crop top, butterfly clips, platform sandals',                             label: 'Y2K Glam — revival' },
  // Editorial/Special
  { value: 'silk robe, sheer lace bodysuit, soft natural confidence, tasteful editorial boudoir-inspired pose',               label: 'Boudoir Editorial — silk robe' },
  { value: 'designer lingerie set, Savage X Fenty or La Perla, tasteful editorial styling',                                   label: 'Lingerie Editorial' },
  { value: 'high-end bikini or one-piece, resort lifestyle shoot, body confidence, luxury vacation',                          label: 'Swimwear — resort luxury' },
];

const SPECIAL_FEATURES = [
  { value: 'None', label: 'None' },
  { value: 'visible beauty marks / moles, natural',        label: 'Beauty Marks' },
  { value: 'light natural freckles across nose and cheeks', label: 'Natural Freckles' },
  { value: 'deep dimples when smiling',                    label: 'Deep Dimples' },
  { value: 'full lips, glossy finish',                     label: 'Full Glossy Lips' },
  { value: 'strong defined jawline',                       label: 'Defined Jawline' },
  { value: 'high cheekbones, sculpted',                    label: 'High Cheekbones' },
  { value: 'natural melanin glow, dewy skin',              label: 'Melanin Glow — dewy' },
  { value: 'visible tattoos, artistic',                    label: 'Visible Tattoos' },
  { value: 'natural glowing skin, no makeup',              label: 'No Makeup — natural glow' },
  { value: 'bold red lip, power glam',                     label: 'Bold Red Lip' },
  { value: 'glazed donut skin, glass skin finish',         label: 'Glass Skin' },
];

const BUILD_MODES = [
  { id: 'openai', label: 'OpenAI', icon: 'zap' },
  { id: 'flux',   label: 'FLUX',   icon: 'flame' },
  { id: 'ai',     label: 'AI Refine', icon: 'wand-2' },
];

// Engine name → engineId map for characterGenerate
const ENGINE_ID_MAP = {
  'OpenAI Image':        'openai_image',
  'Replicate FLUX Pro':  'replicate_flux_pro',
  'Replicate FLUX Schnell': 'replicate_flux_schnell',
};

const STANDARD_NEGATIVE = 'low resolution, blurry, plastic skin, waxy skin, over-smoothed face, AI beauty filter, uncanny face, distorted eyes, warped hands, extra fingers, missing fingers, broken anatomy, unnatural body proportions, stiff pose, flat lighting, harsh flash, oversaturated colors, cluttered background, cartoon styling, floating tattoos, fake jewelry, bad fabric physics, cropped limbs, generic photo, artificial smile, lifeless expression, overprocessed HDR, grainy, noisy, unrealistic skin color, washed-out skin, plastic hair, duplicate body parts, distorted face';

const LABEL = { font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--text-muted)', margin: 0 };

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

function loadCharacters() {
  try { return JSON.parse(localStorage.getItem('ts_characters') || '[]'); } catch { return []; }
}

function getCharacterImage(char) {
  return char?.refImages?.[0] || char?.image || null;
}

const HISTORY_KEY = 'ts_director_history';

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
}

function pushHistory(entry) {
  const h = loadHistory();
  h.unshift({ id: Date.now(), savedAt: new Date().toISOString(), ...entry });
  if (h.length > 20) h.splice(20);
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h)); } catch {}
}

// ---------------------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------------------

function buildStructuredVision({ vision, gender, skinTone, hairStyle, hairColor, eyeDetail, jewelry, clothing, features, mood, contentType, scene, character }) {
  const s = [];
  s.push('Ultra-realistic 4K commercial lifestyle photography. Shot for a premium fashion and lifestyle brand campaign. The final image must look like a high-end photograph taken on a professional camera — not AI-generated, not illustrated, not stylized.');

  if (character) {
    const f = character.fields || {};
    const cp = [];
    if (f.face)        cp.push(`Face: ${f.face}`);
    if (f.tone)        cp.push(`Skin: ${f.tone}`);
    if (f.hair)        cp.push(`Hair: ${f.hair}`);
    if (f.body)        cp.push(`Build: ${f.body}`);
    if (f.personality) cp.push(`Energy: ${f.personality}`);
    if (cp.length) {
      s.push(`TALENT IDENTITY — ${character.name}: ${cp.join('. ')}. Preserve this creator's face, skin tone, hair, and body. Do not alter their identity.`);
    }
    // Outfit: use clothing override if set, otherwise character's default wardrobe
    const outfitUsed = (clothing && clothing !== 'Unspecified') ? clothing : f.wardrobe;
    if (outfitUsed) s.push(`OUTFIT FOR THIS SHOOT: ${outfitUsed}. Dress them in this specifically — override any default styling assumptions.`);
  } else {
    const hasSubject = gender !== 'Unspecified' || skinTone !== 'Unspecified' || eyeDetail !== 'Unspecified';
    if (hasSubject) {
      const who = gender !== 'Unspecified' ? gender : 'talent';
      const skin = skinTone !== 'Unspecified' ? `${skinTone} complexion. Skin should render with realistic texture — visible pores, natural highlights, subtle tone variation, no plastic or airbrushed appearance` : '';
      const eyes = eyeDetail !== 'Unspecified' ? `${eyeDetail} eyes. Eye rendering should be sharp, wet, dimensional, and lifelike` : '';
      s.push(`TALENT / CASTING: ${who}${skin ? `. ${skin}` : ''}${eyes ? `. ${eyes}` : ''}. Face must look photorealistic — natural facial asymmetry, real skin imperfections, grounded expression, believable editorial presence.`);
    }
  }

  if (hairStyle !== 'Unspecified' || hairColor !== 'Unspecified') {
    const hair = [hairStyle !== 'Unspecified' ? hairStyle : '', hairColor !== 'Unspecified' ? `in ${hairColor}` : ''].filter(Boolean).join(', ');
    s.push(`HAIR STYLING: ${hair}. Render with full strand-level detail — individual hair texture, natural frizz, fine flyaways, realistic shine and depth. Hair should interact naturally with light and gravity.`);
  }

  const hasWardrobe = clothing !== 'Unspecified' || jewelry !== 'None' || features !== 'None';
  if (hasWardrobe) {
    const items = [
      clothing !== 'Unspecified' ? `${clothing} — render fabric with realistic texture, natural folds, tension at seams` : '',
      jewelry !== 'None' ? `Accessories: ${jewelry} — render with accurate material finish, realistic reflections, true-to-life scale` : '',
      features !== 'None' ? `Notable features: ${features} — render naturally, embedded in skin` : '',
    ].filter(Boolean);
    s.push(`WARDROBE & ACCESSORIES: ${items.join('. ')}. All items must look expensive, real, and brand-accurate.`);
  }

  if (scene && scene !== 'None') s.push(`LOCATION: ${scene}. Premium environment with authentic architectural detail, polished surfaces, and controlled depth. Background should feel real and expensive.`);
  if (vision) s.push(`ART DIRECTION: ${vision}`);
  if (mood || contentType) s.push(`CAMPAIGN FEEL: ${[contentType, mood].filter(Boolean).join(' — ')}. The image should feel like it belongs in a premium editorial spread or luxury brand campaign.`);

  s.push('POSE & COMPOSITION: Natural, confident posture appropriate for a premium lifestyle shoot. Candid-feeling but composed. Flattering three-quarter or portrait angle. Intentional negative space. Realistic anatomy.');
  s.push('LIGHTING: Soft, dimensional natural or studio lighting. Light wraps realistically around the subject. Warm and refined color grading. No flat lighting, no harsh flash.');
  s.push('CAMERA SPECS: Shot on Sony A1 or Canon EOS R5. 50mm–85mm portrait lens. Shallow depth of field with natural bokeh. Crisp focus on subject face and styling details.');
  s.push('QUALITY: Ultra-realistic photograph. 4K resolution. Professional commercial retouching. Realistic skin texture. Accurate fabric physics. No AI artifacts. No uncanny face. No distorted hands.');

  return s.join('\n\n');
}

function buildFluxVision({ vision, gender, skinTone, hairStyle, hairColor, eyeDetail, jewelry, clothing, features, mood, contentType, scene, character }) {
  const parts = [];

  if (character) {
    const f = character.fields || {};
    let line = `${character.name}`;
    if (f.tone)  line += ` with ${f.tone} skin`;
    if (f.hair)  line += `, ${f.hair} hair`;
    if (f.face)  line += `, ${f.face}`;
    parts.push(`${line}.`);
    // Outfit override takes priority over character's default wardrobe
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

  parts.push('Photorealistic editorial photograph. Shot on Sony A1 85mm f/1.4. Natural soft studio light, warm color grading. Individual hair strand detail, visible skin pores, natural skin texture, realistic fabric physics, lifelike human expression and anatomy. Ultra-detailed 4K. Luxury commercial campaign quality. Not AI-generated looking, no plastic skin, no uncanny valley, no distorted anatomy.');

  return parts.join(' ');
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CharacterSelector({ characters, selectedId, onSelect }) {
  if (!characters.length) return null;
  return (
    <div>
      <div style={{ ...LABEL, marginBottom: 12 }}>Active Creator</div>
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
        <button
          onClick={() => onSelect(null)}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            background: 'none', border: `2px solid ${!selectedId ? 'var(--accent-deep)' : 'var(--border)'}`,
            borderRadius: 'var(--radius-lg)', padding: '8px 12px', cursor: 'pointer',
            color: !selectedId ? 'var(--accent-deep)' : 'var(--text-faint)',
            font: '500 0.75rem/1 var(--font-ui)', fontFamily: 'inherit',
            minWidth: 64, transition: 'all var(--t-fast)',
          }}
        >
          <Icon name="user-x" size={18} strokeWidth={1.5} />
          None
        </button>
        {characters.map(char => {
          const img = getCharacterImage(char);
          const active = selectedId === char.id;
          return (
            <button
              key={char.id}
              onClick={() => onSelect(char.id)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                background: 'none', border: `2px solid ${active ? 'var(--accent-deep)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-lg)', padding: 8, cursor: 'pointer',
                fontFamily: 'inherit', transition: 'all var(--t-fast)', minWidth: 64,
              }}
            >
              <div style={{
                width: 44, height: 58, borderRadius: 8, overflow: 'hidden',
                background: 'var(--grad-portrait)', flexShrink: 0,
              }}>
                {img
                  ? <img src={img} alt={char.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)' }}><Icon name="user" size={18} strokeWidth={1} /></div>
                }
              </div>
              <span style={{
                font: `${active ? 600 : 500} 0.72rem/1.2 var(--font-ui)`,
                color: active ? 'var(--accent-deep)' : 'var(--text-muted)',
                maxWidth: 64, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {char.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PillToggle({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {options.map(opt => {
        const active = value === opt.id;
        return (
          <button key={opt.id} onClick={() => onChange(opt.id)} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '6px 12px', borderRadius: 'var(--radius-pill)', cursor: 'pointer',
            border: `1.5px solid ${active ? 'var(--accent-deep)' : 'var(--border)'}`,
            background: active ? 'var(--rose-deep)' : 'transparent',
            color: active ? 'var(--accent-deep)' : 'var(--text-muted)',
            font: '500 0.8rem/1 var(--font-ui)', fontFamily: 'inherit',
            transition: 'all var(--t-fast)',
          }}>
            <Icon name={opt.icon} size={12} strokeWidth={1.75} /> {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function HistoryPanel({ history, onLoad }) {
  const [open, setOpen] = React.useState(false);
  if (!history.length) return null;
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'none', border: 'none', cursor: 'pointer',
          font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase',
          color: 'var(--text-muted)', padding: 0, fontFamily: 'inherit',
        }}
      >
        <Icon name={open ? 'chevron-down' : 'chevron-right'} size={13} />
        Recent Builds · {history.length}
      </button>
      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
          {history.map(entry => (
            <div key={entry.id} style={{
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
              padding: '12px 16px', borderRadius: 'var(--radius-md)',
              background: 'var(--surface-raised)', border: '1px solid var(--border)',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: 'var(--text-xs)', color: 'var(--text-faint)', marginBottom: 4 }}>
                  {new Date(entry.savedAt).toLocaleString()} · {entry.mode?.toUpperCase()}
                  {entry.character && ` · ${entry.character}`}
                </div>
                <div style={{
                  font: 'var(--text-sm)', color: 'var(--text-body)', lineHeight: 1.4,
                  overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                }}>
                  {entry.positivePrompt}
                </div>
              </div>
              <Button variant="secondary" onClick={() => onLoad(entry)} style={{ flexShrink: 0, fontSize: '0.75rem' }}>
                Load
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function TheeDirector({ onNav, initialScene = 'None', initialVision = '' }) {
  const [characters]    = React.useState(loadCharacters);
  const [selectedCharId, setSelectedCharId] = React.useState(null);

  const [vision,       setVision]       = React.useState(initialVision);
  const [contentType,  setContentType]  = React.useState('Portrait');
  const [mood,         setMood]         = React.useState('Clean');
  const [scene,        setScene]        = React.useState(initialScene);
  const [gender,       setGender]       = React.useState('Unspecified');
  const [skinTone,     setSkinTone]     = React.useState('Unspecified');
  const [hairStyle,    setHairStyle]    = React.useState('Unspecified');
  const [hairColor,    setHairColor]    = React.useState('Unspecified');
  const [eyeDetail,    setEyeDetail]    = React.useState('Unspecified');
  const [jewelry,      setJewelry]      = React.useState('None');
  const [clothing,     setClothing]     = React.useState('Unspecified');
  const [features,     setFeatures]     = React.useState('None');

  const [buildMode,    setBuildMode]    = React.useState('openai');
  const [outfitOverride, setOutfitOverride] = React.useState('Unspecified');
  const [loading,      setLoading]      = React.useState(false);
  const [error,        setError]        = React.useState('');
  const [outputs,      setOutputs]      = React.useState(null);

  const [generating,   setGenerating]   = React.useState(false);
  const [genImages,    setGenImages]    = React.useState([]);
  const [genError,     setGenError]     = React.useState('');

  const [history,      setHistory]      = React.useState(loadHistory);

  const selectedChar = characters.find(c => c.id === selectedCharId) || null;

  // Collect current form params
  const formParams = () => ({
    vision, gender, skinTone, hairStyle, hairColor,
    eyeDetail, jewelry,
    // When character selected, outfitOverride takes priority over Subject Details clothing
    clothing: selectedChar && outfitOverride !== 'Unspecified' ? outfitOverride : clothing,
    features, mood, contentType, scene,
    character: selectedChar,
  });

  const finishBuild = (result, mode) => {
    setOutputs(result);
    setGenImages([]);
    pushHistory({
      positivePrompt: result.positivePrompt,
      negativePrompt: result.negativePrompt,
      recommendedEngine: result.recommendedEngine,
      mode,
      character: selectedChar?.name || null,
    });
    setHistory(loadHistory());
  };

  const handleBuild = async () => {
    setError('');
    setGenImages([]);
    const params = formParams();

    if (buildMode === 'openai') {
      const positivePrompt = buildStructuredVision(params);
      finishBuild({
        positivePrompt,
        negativePrompt: STANDARD_NEGATIVE,
        recommendedEngine: 'OpenAI Image',
        reason: 'Structured format optimized for OpenAI gpt-image-1.',
      }, 'openai');
      return;
    }

    if (buildMode === 'flux') {
      const positivePrompt = buildFluxVision(params);
      finishBuild({
        positivePrompt,
        negativePrompt: STANDARD_NEGATIVE,
        recommendedEngine: 'Replicate FLUX Pro',
        reason: 'Natural language format optimized for FLUX Pro.',
      }, 'flux');
      return;
    }

    // AI Refine — backend
    setLoading(true);
    try {
      const enrichedVision = buildStructuredVision(params);
      const result = await buildDirectorOutputs({
        vision: enrichedVision, contentType, mood,
        outputGoal: 'Build Prompt Only',
        character: selectedChar?.name || 'None',
        scene: scene || 'None',
        useIdentityLock: !!selectedChar?.locked,
      });
      const enhancedNegative = result.negativePrompt
        ? `${result.negativePrompt}, ${STANDARD_NEGATIVE}`
        : STANDARD_NEGATIVE;
      finishBuild({ ...result, negativePrompt: enhancedNegative }, 'ai');
    } catch (e) {
      setError(`Error: ${e?.message || String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!outputs?.positivePrompt) return;
    setGenerating(true);
    setGenImages([]);
    setGenError('');

    try {
      const charImg = selectedChar ? getCharacterImage(selectedChar) : null;

      if (charImg) {
        // Use reference-based generation for characters with portraits
        const engineId = ENGINE_ID_MAP[outputs.recommendedEngine] || 'openai_image';
        const result = await characterGenerate({
          engineId,
          positivePrompt: outputs.positivePrompt,
          negativePrompt: outputs.negativePrompt,
          characterImage: charImg,
          batchSize: 1,
        });
        const imgs = result.images || [];
        setGenImages(imgs);
        imgs.forEach(url => saveToLibrary(url, {
          source: 'director',
          character: selectedChar?.name,
          engine: engineId,
        }).catch(() => {}));
      } else {
        // Standard generation
        const result = await generateImage({
          engine: outputs.recommendedEngine,
          positivePrompt: outputs.positivePrompt,
          negativePrompt: outputs.negativePrompt,
          imageSize: 'Vertical 9:16',
          quality: 'High',
        });
        const imgs = result.images || [];
        setGenImages(imgs);
        imgs.forEach(url => saveToLibrary(url, {
          source: 'director',
          engine: outputs.recommendedEngine,
        }).catch(() => {}));
      }
    } catch (e) {
      setGenError(e?.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleLoadHistory = (entry) => {
    setOutputs({
      positivePrompt: entry.positivePrompt,
      negativePrompt: entry.negativePrompt,
      recommendedEngine: entry.recommendedEngine || '',
      reason: '',
    });
    setGenImages([]);
  };

  const subjectDisabled = !!selectedChar;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 'var(--content-max)', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
        <div>
          <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--accent-deep)', marginBottom: 10 }}>Thee Director</div>
          <h1 style={{ font: 'var(--display-lg)', color: 'var(--text-strong)', letterSpacing: '-0.015em', margin: '0 0 10px' }}>Direct with intention. Create with impact.</h1>
          <p style={{ font: 'var(--text-lg)', color: 'var(--text-muted)', margin: 0, maxWidth: 520 }}>Shape content that connects. Dial in every detail. Let Thee Studio handle the rest.</p>
        </div>
      </div>

      {/* Character selector */}
      {characters.length > 0 && (
        <Card style={{ padding: '16px 20px' }}>
          <CharacterSelector characters={characters} selectedId={selectedCharId} onSelect={setSelectedCharId} />
        </Card>
      )}

      {/* 3-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, alignItems: 'start' }}>

        {/* Col 1: Direction Controls */}
        <Card style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={LABEL}>Direction Controls</h3>

          <Field label="Vision" hint="Describe the creative direction in your own words.">
            <Input value={vision} onChange={setVision} placeholder="e.g. Golden hour rooftop, effortless luxury…" />
          </Field>
          <Field label="Content Type">
            <Select value={contentType} onChange={setContentType} options={CONTENT_TYPES} />
          </Field>
          <Field label="Mood / Tone">
            <Select value={mood} onChange={setMood} options={MOODS} />
          </Field>
          <Field label="Scene">
            <Select value={scene} onChange={setScene} options={LOCATIONS} />
          </Field>
          <Field label="Outfit">
            <Select value={outfitOverride} onChange={setOutfitOverride} options={CLOTHING_VIBES} placeholder="Select outfit…" />
          </Field>

          <div>
            <div style={{ ...LABEL, marginBottom: 10 }}>Build Mode</div>
            <PillToggle options={BUILD_MODES} value={buildMode} onChange={setBuildMode} />
          </div>

          {error && <p style={{ font: 'var(--text-sm)', color: 'var(--cherry)', margin: 0 }}>{error}</p>}

          <Button
            variant="primary"
            loading={loading}
            onClick={handleBuild}
            style={{ width: '100%' }}
          >
            <Icon name={BUILD_MODES.find(m => m.id === buildMode)?.icon || 'zap'} size={15} />
            {loading ? 'Building…' : 'Build Direction'}
          </Button>

          {outputs?.positivePrompt && (
            <Button
              variant="secondary"
              onClick={() => onNav && onNav('images', {
                positivePrompt: outputs.positivePrompt,
                negativePrompt: outputs.negativePrompt,
              })}
              style={{ width: '100%' }}
            >
              <Icon name="external-link" size={14} /> Open in Generator
            </Button>
          )}
        </Card>

        {/* Col 2: Subject Details */}
        <Card style={{ display: 'flex', flexDirection: 'column', gap: 14, opacity: subjectDisabled ? 0.45 : 1, transition: 'opacity var(--t-base)', pointerEvents: subjectDisabled ? 'none' : 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={LABEL}>Subject Details</h3>
            {subjectDisabled && (
              <span style={{ font: 'var(--text-xs)', color: 'var(--accent-deep)', background: 'var(--rose-deep)', padding: '3px 8px', borderRadius: 'var(--radius-pill)' }}>
                Using {selectedChar.name}
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Gender"><Select value={gender} onChange={setGender} options={GENDERS} /></Field>
            <Field label="Skin Tone"><Select value={skinTone} onChange={setSkinTone} options={SKIN_TONES} placeholder="Select…" /></Field>
          </div>
          <Field label="Hair Style"><Select value={hairStyle} onChange={setHairStyle} options={HAIR_STYLES} placeholder="Select…" /></Field>
          <Field label="Hair Color"><Select value={hairColor} onChange={setHairColor} options={HAIR_COLORS} placeholder="Select…" /></Field>
          <Field label="Eyes"><Select value={eyeDetail} onChange={setEyeDetail} options={EYE_DETAILS} placeholder="Select…" /></Field>
          <Field label="Jewelry"><Select value={jewelry} onChange={setJewelry} options={JEWELRY_OPTIONS} /></Field>
          <Field label="Clothing / Brand Vibe"><Select value={clothing} onChange={setClothing} options={CLOTHING_VIBES} placeholder="Select…" /></Field>
          <Field label="Special Features"><Select value={features} onChange={setFeatures} options={SPECIAL_FEATURES} /></Field>
        </Card>

        {/* Col 3: Build Prompt + Generate */}
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

          {outputs?.positivePrompt && (
            <Button
              variant="primary"
              loading={generating}
              onClick={handleGenerate}
              style={{ width: '100%' }}
            >
              <Icon name="sparkles" size={15} />
              {generating ? 'Generating…' : selectedChar && getCharacterImage(selectedChar) ? `Generate as ${selectedChar.name}` : 'Generate Here'}
            </Button>
          )}

          {genError && <p style={{ font: 'var(--text-sm)', color: 'var(--cherry)', margin: 0 }}>{genError}</p>}
        </Card>

      </div>

      {/* Inline generation results */}
      {genImages.length > 0 && (
        <div>
          <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 16 }}>
            Generated · {genImages.length} image{genImages.length > 1 ? 's' : ''}
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {genImages.map((url, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 200 }}>
                <div style={{ aspectRatio: '3/4', borderRadius: 'var(--radius-xl)', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
                  <img src={url} alt={`Generated ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <a href={url} download={`director-${Date.now()}-${i}.jpg`} target="_blank" rel="noreferrer">
                  <Button variant="secondary" style={{ width: '100%', fontSize: '0.75rem' }}>
                    <Icon name="download" size={13} /> Download
                  </Button>
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prompt history */}
      <HistoryPanel history={history} onLoad={handleLoadHistory} />

    </div>
  );
}
