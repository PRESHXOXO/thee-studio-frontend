import React from 'react';
import { Button } from '../components/core/Button.jsx';
import { Card } from '../components/surfaces/Card.jsx';
import { Icon } from '../components/core/Icon.jsx';
import { analyzeCharacterImage, characterGenerate, extractFaceAnchor, generateCharacterSeed, generateCharacterVariations } from '../api/studio.js';
import { GENDERS, SKIN_TONES, HAIR_STYLES, HAIR_COLORS, EYE_DETAILS, SPECIAL_FEATURES, JEWELRY_OPTIONS, CLOTHING_VIBES } from '../lib/promptData.js';
import { Select } from '../components/forms/Select.jsx';
import { saveToLibrary, loadLibrary } from '../lib/library.js';

const FIELD_DEFS = [
  { id: 'face',        icon: 'scan-face',    label: 'Face',          placeholder: 'e.g. High cheekbones, almond eyes, soft heart shape' },
  { id: 'hair',        icon: 'wind',         label: 'Hair',          placeholder: 'e.g. Silk press, deep espresso, side part' },
  { id: 'body',        icon: 'person-stand', label: 'Body',          placeholder: 'e.g. 5\'6", elegant posture, lithe build' },
  { id: 'wardrobe',    icon: 'shirt',        label: 'Wardrobe',      placeholder: 'e.g. Minimal luxury, silk, tailored silhouettes' },
  { id: 'tone',        icon: 'droplet',      label: 'Skin Tone',     placeholder: 'e.g. Warm deep brown, dewy, luminous' },
  { id: 'personality', icon: 'sparkles',     label: 'Personality',   placeholder: 'e.g. Confident, creative, sophisticated' },
  { id: 'niche',       icon: 'camera',       label: 'Content Niche', placeholder: 'e.g. Beauty, fashion editorial, lifestyle' },
];

const LABEL = { font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6, display: 'block' };
const INPUT_STYLE = { width: '100%', boxSizing: 'border-box', padding: '8px 12px', background: 'var(--input-bg, #fff)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', font: 'var(--text-sm)', color: 'var(--text-body)', outline: 'none', fontFamily: 'inherit' };

const QUICK_ENGINES = [
  { id: 'openai_image',           label: 'OpenAI',       icon: 'zap' },
  { id: 'replicate_flux_schnell', label: 'FLUX Schnell', icon: 'flame' },
];

const QUICK_SCENES = [
  { id: 'none',      name: 'No Scene',    icon: 'minus-circle' },
  { id: 'studio',    name: 'Studio',      icon: 'camera' },
  { id: 'rooftop',   name: 'Rooftop',     icon: 'sunset' },
  { id: 'yacht',     name: 'Yacht',       icon: 'anchor' },
  { id: 'penthouse', name: 'Penthouse',   icon: 'building-2' },
  { id: 'poolside',  name: 'Poolside',    icon: 'droplets' },
  { id: 'jet',       name: 'Private Jet', icon: 'plane' },
  { id: 'hotel',     name: 'Hotel',       icon: 'bed' },
  { id: 'beach',     name: 'Beach',       icon: 'waves' },
  { id: 'desert',    name: 'Desert',      icon: 'sun' },
];

const QUICK_MOODS = ['Clean', 'Luxury', 'Bold', 'Romantic', 'Editorial', 'Cinematic', 'Soft', 'Playful'];
const BATCH_OPTIONS = [1, 2, 4];

// Outfit override — first entry means "use character's wardrobe field"
const QUICK_OUTFITS = [
  { id: 'default',          label: "Creator's Style",        prompt: null },
  { id: 'casual',           label: 'Casual',                 prompt: 'fitted white tee, high-waist dark jeans, clean white sneakers, minimal accessories' },
  { id: 'athleisure',       label: 'Athleisure',             prompt: 'matching athletic set, sports bra, biker shorts, sleek sneakers, gym bag' },
  { id: 'elevated_ath',     label: 'Skims Set',              prompt: 'Skims bodysuit, cycling shorts, oversized hoodie, clean sneakers, gold hoops' },
  { id: 'sundress',         label: 'Sundress',               prompt: 'flowy floral mini sundress, strappy sandals, dainty gold jewelry, sunglasses' },
  { id: 'brunch',           label: 'Brunch',                 prompt: 'linen coord set, strappy mules, sun hat, gold necklace — elevated summer daytime' },
  { id: 'denim',            label: 'Denim',                  prompt: 'vintage denim jacket, straight-leg jeans, fitted white tee, white sneakers or ankle boots' },
  { id: 'streetwear',       label: 'Streetwear',             prompt: 'streetwear luxury: cargo pants, oversized graphic hoodie, chunky sneakers, cap' },
  { id: 'date_night',       label: 'Date Night',             prompt: 'satin slip dress, strappy stiletto heels, diamond studs, sleek clutch — sensual but elegant' },
  { id: 'lbd',              label: 'LBD',                    prompt: 'fitted little black dress, pointed-toe pumps, minimal gold jewelry — classic and polished' },
  { id: 'night_out',        label: 'Night Out',              prompt: 'chic tailored blazer over a bodysuit, wide-leg trousers, heels, bold earrings' },
  { id: 'club',             label: 'Club Ready',             prompt: 'crystal-embellished mini dress, platform stilettos, full glam makeup, bold jewelry' },
  { id: 'biz_casual',       label: 'Business Casual',        prompt: 'fitted blazer, tailored trousers, silk blouse, block heels — polished and professional' },
  { id: 'power_suit',       label: 'Power Suit',             prompt: 'structured monochrome suit, no undershirt, pointed pumps, minimal accessories — commanding' },
  { id: 'high_fashion',     label: 'High Fashion',           prompt: 'avant-garde editorial look: Balenciaga, sharp structured silhouette, editorial styling' },
  { id: 'old_money',        label: 'Old Money',              prompt: 'cashmere knit, wide-leg cream trousers, loafers, structured bag — quiet luxury' },
  { id: 'monochrome',       label: 'Monochrome',             prompt: 'head-to-toe tonal look, Celine aesthetic, clean lines, one color, minimal accessories' },
  { id: 'luxury_casual',    label: 'Luxury Casual',          prompt: 'Bottega Veneta bag, linen coord set, slides, gold jewelry — effortless expensive' },
  { id: 'resort',           label: 'Resort',                 prompt: 'Zimmermann flowy maxi dress, woven sun hat, strappy sandals, gold jewelry' },
  { id: 'beach',            label: 'Beach',                  prompt: 'designer bikini, sheer sarong wrap, oversized sunglasses, gold accessories' },
  { id: 'pool',             label: 'Poolside',               prompt: 'luxury one-piece swimsuit, designer slides, oversized beach hat, linen cover-up' },
  { id: 'cozy_winter',      label: 'Winter Coat',            prompt: 'oversized tailored coat, turtleneck, knee-high boots, structured bag — cold weather editorial' },
  { id: 'y2k',              label: 'Y2K',                    prompt: 'Y2K revival: low-rise jeans, rhinestone crop top, butterfly clips, platform sandals' },
  { id: 'boudoir',          label: 'Boudoir Editorial',      prompt: 'silk robe, sheer lace bodysuit, soft natural confidence — tasteful editorial boudoir-inspired' },
];

const STANDARD_NEGATIVE = 'low resolution, blurry, plastic skin, waxy skin, over-smoothed face, AI beauty filter, uncanny face, distorted eyes, warped hands, extra fingers, broken anatomy, flat lighting, harsh flash, oversaturated colors, generic photo, artificial smile, overprocessed HDR, grainy, noisy';

function buildCharacterPrompt(char, sceneName, mood, identityLocked, outfitOverride = null) {
  const f = char.fields || {};
  const parts = [];

  // FACE + SKIN ONLY — everything else is shoot-specific
  if (char.faceAnchor) {
    parts.push(`FACE & SKIN LOCK — ${char.name}: ${char.faceAnchor} Lock ONLY the face and skin tone. The outfit, hair styling, and background in the reference photo are NOT part of this shoot — they will be replaced by the creative direction below.`);
  } else if (f.face || f.tone) {
    parts.push(`TALENT — ${char.name}: ${[f.face, f.tone].filter(Boolean).join('. ')}. Preserve the face and skin tone only. Do not carry over the outfit or background from the reference image.`);
  }

  parts.push('Ultra-realistic 4K commercial lifestyle photography for a premium content creator brand.');

  // OUTFIT — explicit override of reference photo
  const wardrobe = outfitOverride || f.wardrobe;
  if (wardrobe) {
    parts.push(`OUTFIT FOR THIS SHOOT (REQUIRED — replace any outfit from the reference photo): ${wardrobe}. The creator must be wearing this specific outfit. Do not use the clothing from the reference image.`);
  }

  // SCENE — explicit override of reference background
  if (sceneName) {
    parts.push(`SCENE (REQUIRED — replace the reference photo background): ${sceneName}. The background must be this environment, not whatever was behind the subject in the reference photo.`);
  }

  if (mood)          parts.push(`MOOD: ${mood}`);
  if (f.hair)        parts.push(`HAIR: ${f.hair}`);
  if (f.body)        parts.push(`BUILD: ${f.body}`);
  if (f.personality) parts.push(`ENERGY: ${f.personality}`);
  if (f.niche)       parts.push(`CONTENT CONTEXT: ${f.niche}`);

  if (identityLocked) {
    parts.push('IDENTITY LOCK: Face and skin tone are fixed. Only the outfit and location change between shoots.');
  }

  parts.push('Photorealistic editorial photograph. Natural dimensional lighting. Professional commercial retouching. No AI artifacts. No distorted anatomy. Ultra-detailed 4K. Luxury campaign quality. Fully clothed, brand-appropriate content.');
  return parts.join('\n\n');
}

function compressImage(dataUrl, maxPx = 480, quality = 0.82) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function loadCharacters() {
  try { return JSON.parse(localStorage.getItem('ts_characters') || '[]'); } catch { return []; }
}
function saveCharacters(list) {
  try {
    localStorage.setItem('ts_characters', JSON.stringify(list));
  } catch {
    throw new Error('Storage full — delete some characters and try again.');
  }
}

// Returns primary image for a character (supports legacy single-image + new refImages array)
function getPrimaryImage(char) {
  return char.refImages?.[0] || char.image || null;
}

function getAllImages(char) {
  if (char.refImages?.length) return char.refImages;
  if (char.image) return [char.image];
  return [];
}

function PillButton({ active, onClick, children, style }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '7px 13px', borderRadius: 'var(--radius-pill)', cursor: 'pointer',
        border: `1.5px solid ${active ? 'var(--accent-deep)' : 'var(--border)'}`,
        background: active ? 'var(--rose-deep)' : 'transparent',
        color: active ? 'var(--accent-deep)' : 'var(--text-muted)',
        font: '500 0.8125rem/1 var(--font-ui)', fontFamily: 'inherit',
        transition: 'all var(--t-fast)',
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function RefImageSlot({ src, active, onClick, onDelete, onUpload, index }) {
  const [hov, setHov] = React.useState(false);
  const fileRef = React.useRef(null);

  if (!src) {
    return (
      <>
        <button
          onClick={() => fileRef.current?.click()}
          style={{
            width: 58, height: 77, borderRadius: 8, cursor: 'pointer',
            border: '1.5px dashed var(--border)',
            background: 'var(--surface-raised)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-faint)', flexShrink: 0,
            transition: 'border-color var(--t-fast)',
          }}
        >
          <Icon name="plus" size={16} strokeWidth={1.5} />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ''; }}
        />
      </>
    );
  }

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onClick}
      style={{
        width: 58, height: 77, borderRadius: 8, overflow: 'hidden', cursor: 'pointer', flexShrink: 0, position: 'relative',
        border: `2px solid ${active ? 'var(--accent-deep)' : 'transparent'}`,
        boxShadow: active ? 'var(--shadow-sm)' : 'none',
        transition: 'border-color var(--t-fast)',
      }}
    >
      <img src={src} alt={`Ref ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      {hov && (
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          style={{
            position: 'absolute', top: 2, right: 2, width: 18, height: 18,
            borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none',
            cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Icon name="x" size={10} />
        </button>
      )}
    </div>
  );
}

function CreatorCard({ char, selected, onClick, onDelete }) {
  const [hovered, setHovered] = React.useState(false);
  const portrait = getPrimaryImage(char);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        cursor: 'pointer', position: 'relative',
        transform: hovered ? 'translateY(-3px)' : 'none',
        transition: 'transform var(--t-base)',
      }}
    >
      <div style={{
        width: '100%', aspectRatio: '3/4',
        borderRadius: 'var(--radius-xl)',
        background: 'var(--grad-portrait)',
        overflow: 'hidden',
        border: `2px solid ${selected ? 'var(--accent-deep)' : 'transparent'}`,
        boxShadow: selected ? 'var(--shadow-md)' : hovered ? 'var(--shadow-sm)' : 'var(--shadow-xs)',
        transition: 'box-shadow var(--t-base), border-color var(--t-base)',
        position: 'relative',
      }}>
        {portrait
          ? <img src={portrait} alt={char.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)' }}>
              <Icon name="user" size={32} strokeWidth={1} />
            </div>
          )
        }
        {hovered && (
          <button
            onClick={e => { e.stopPropagation(); onDelete(); }}
            style={{
              position: 'absolute', top: 8, right: 8,
              width: 24, height: 24, borderRadius: '50%',
              background: 'rgba(0,0,0,0.55)', border: 'none',
              cursor: 'pointer', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Icon name="x" size={12} />
          </button>
        )}
        {char.locked && (
          <div style={{
            position: 'absolute', bottom: 8, left: 8,
            width: 22, height: 22, borderRadius: '50%',
            background: 'var(--accent-deep)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
          }}>
            <Icon name="fingerprint" size={13} />
          </div>
        )}
        {char.faceAnchor && (
          <div title="Face Lock active — AI has memorized this creator's facial geometry" style={{
            position: 'absolute', top: 8, right: 8,
            background: 'var(--accent-deep)', color: '#fff',
            borderRadius: 'var(--radius-pill)', padding: '2px 6px',
            font: '700 0.6rem/1 var(--font-ui)', letterSpacing: '0.04em',
            boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
          }}>
            FACE LOCK
          </div>
        )}
        {getAllImages(char).length > 1 && (
          <div style={{
            position: 'absolute', bottom: 8, right: 8,
            background: 'rgba(0,0,0,0.55)', color: '#fff', borderRadius: 6,
            font: '600 0.65rem/1 var(--font-ui)', padding: '2px 5px',
          }}>
            {getAllImages(char).length}
          </div>
        )}
      </div>
      <div style={{
        font: '600 0.8125rem/1.2 var(--font-ui)',
        color: selected ? 'var(--accent-deep)' : 'var(--text-strong)',
        textAlign: 'center',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%',
      }}>
        {char.name}
      </div>
    </div>
  );
}

export function Characters({ initialCharacter, onCharacterChange, onNav }) {
  const [characters, setCharacters] = React.useState(loadCharacters);
  const [activeId, setActiveId]     = React.useState(null);
  const [editing, setEditing]       = React.useState(null);
  const [analyzing, setAnalyzing]   = React.useState(false);
  const [analyzeError, setAnalyzeError] = React.useState('');
  const [saveError, setSaveError]   = React.useState('');
  const [saved, setSaved]           = React.useState(false);

  // AI Generate Creator state
  const [aiGenOpen,     setAiGenOpen]     = React.useState(false);
  const [aiGenName,     setAiGenName]     = React.useState('');
  const [aiGenGender,   setAiGenGender]   = React.useState('Woman');
  const [aiGenSkin,     setAiGenSkin]     = React.useState('Unspecified');
  const [aiGenHairSt,   setAiGenHairSt]   = React.useState('Unspecified');
  const [aiGenHairCo,   setAiGenHairCo]   = React.useState('Unspecified');
  const [aiGenEye,      setAiGenEye]      = React.useState('Unspecified');
  const [aiGenBody,     setAiGenBody]     = React.useState('');
  const [aiGenFeatures, setAiGenFeatures] = React.useState('None');
  const [aiGenJewelry,  setAiGenJewelry]  = React.useState('None');
  const [aiGenClothing, setAiGenClothing] = React.useState('Unspecified');
  const [aiGenNiche,    setAiGenNiche]    = React.useState('');
  const [aiGenVision,   setAiGenVision]   = React.useState('');
  const [aiGenStep,     setAiGenStep]     = React.useState('');
  const [aiGenImages,   setAiGenImages]   = React.useState([]);
  const [aiGenAnchor,   setAiGenAnchor]   = React.useState('');
  const [aiGenLoading,  setAiGenLoading]  = React.useState(false);
  const [aiGenError,    setAiGenError]    = React.useState('');

  // Quick Shoot state
  const [quickScene,  setQuickScene]  = React.useState('none');
  const [quickMood,   setQuickMood]   = React.useState('Clean');
  const [quickOutfit, setQuickOutfit] = React.useState('default');
  const [quickEngine, setQuickEngine] = React.useState('openai_image');
  const [quickBatch,  setQuickBatch]  = React.useState(1);
  const [activeRef,   setActiveRef]   = React.useState(0); // index into getAllImages
  const [generating,  setGenerating]  = React.useState(false);
  const [genImages,   setGenImages]   = React.useState([]);
  const [genError,    setGenError]    = React.useState('');

  // Shot history — library entries for active character
  const [shotHistory, setShotHistory] = React.useState([]);

  const fileInputRef    = React.useRef(null);
  const refFileRefs     = React.useRef([null, null, null]);

  const active = activeId != null ? characters.find(c => c.id === activeId) : null;

  // Refresh shot history when active character changes or new images generated
  React.useEffect(() => {
    if (!active) { setShotHistory([]); return; }
    setShotHistory(
      loadLibrary()
        .filter(e => e.character === active.name)
        .slice(0, 16)
    );
  }, [activeId, characters, genImages]);

  // Reset activeRef when switching characters
  React.useEffect(() => { setActiveRef(0); setGenImages([]); setGenError(''); }, [activeId]);

  React.useEffect(() => {
    if (!onCharacterChange) return;
    onCharacterChange(active || null);
  }, [activeId, characters]);

  React.useEffect(() => {
    if (!initialCharacter) return;
    const init = async () => {
      const compressed = initialCharacter.image ? await compressImage(initialCharacter.image) : null;
      const newEditing = {
        name: initialCharacter.name || 'New Creator',
        refImages: compressed ? [compressed] : [],
        fields: Object.fromEntries(FIELD_DEFS.map(f => [f.id, ''])),
      };
      setEditing(newEditing);
      setActiveId(null);
      setAnalyzeError('');
      setSaveError('');
      if (initialCharacter.image) runAnalysis(initialCharacter.image, newEditing);
    };
    init();
  }, [initialCharacter]);

  const runAnalysis = async (imageDataUrl, currentEditing) => {
    setAnalyzing(true);
    setAnalyzeError('');
    try {
      // Run both in parallel — general fields + precise face anchor
      const [result, faceAnchor] = await Promise.all([
        analyzeCharacterImage(imageDataUrl),
        extractFaceAnchor(imageDataUrl).catch(() => ''),
      ]);
      setEditing(ed => ({
        ...(ed || currentEditing),
        faceAnchor: faceAnchor || ed?.faceAnchor || '',
        fields: {
          face:        result.face        || ed?.fields?.face        || '',
          hair:        result.hair        || ed?.fields?.hair        || '',
          body:        result.body        || ed?.fields?.body        || '',
          wardrobe:    result.wardrobe    || ed?.fields?.wardrobe    || '',
          tone:        result.tone        || ed?.fields?.tone        || '',
          personality: result.personality || ed?.fields?.personality || '',
          niche:       result.niche       || ed?.fields?.niche       || '',
        },
      }));
    } catch (e) {
      setAnalyzeError(e.message || 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleToggleLock = () => {
    if (!activeId) return;
    const updated = characters.map(c => c.id === activeId ? { ...c, locked: !c.locked } : c);
    saveCharacters(updated);
    setCharacters(updated);
  };

  const handleQuickShoot = async () => {
    if (!active) return;
    const allImages = getAllImages(active);
    const sceneName = quickScene === 'none' ? '' : QUICK_SCENES.find(s => s.id === quickScene)?.name || '';
    const outfitPrompt = QUICK_OUTFITS.find(o => o.id === quickOutfit)?.prompt || null;
    const positivePrompt = buildCharacterPrompt(active, sceneName, quickMood, !!active.locked, outfitPrompt);

    if (!allImages.length) {
      onNav && onNav('images', { positivePrompt, negativePrompt: STANDARD_NEGATIVE });
      return;
    }

    const refImage = allImages[activeRef] || allImages[0];
    setGenerating(true);
    setGenImages([]);
    setGenError('');
    try {
      const result = await characterGenerate({
        engineId: quickEngine,
        positivePrompt,
        negativePrompt: STANDARD_NEGATIVE,
        characterImage: refImage,
        batchSize: quickBatch,
      });
      const imgs = result.images || [];
      setGenImages(imgs);
      imgs.forEach(url => {
        saveToLibrary(url, {
          source: 'quick_shoot',
          character: active.name,
          engine: quickEngine,
          scene: sceneName || undefined,
          mood: quickMood,
        }).catch(() => {});
      });
    } catch (e) {
      setGenError(e.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleNew = () => {
    setEditing({ name: 'New Creator', refImages: [], fields: Object.fromEntries(FIELD_DEFS.map(f => [f.id, ''])) });
    setActiveId(null);
    setAnalyzeError('');
    setSaveError('');
  };

  const handleEdit = (char) => {
    // Migrate legacy single image to refImages array
    const refImages = char.refImages?.length
      ? char.refImages
      : char.image ? [char.image] : [];
    setEditing({ name: char.name, refImages, faceAnchor: char.faceAnchor || '', fields: { ...char.fields } });
    setActiveId(char.id);
    setAnalyzeError('');
    setSaveError('');
  };

  const handleSave = () => {
    if (!editing) return;
    setSaveError('');
    // Normalize: always store refImages, keep legacy image as first ref for compat
    const charData = {
      ...editing,
      image: editing.refImages?.[0] || null,
    };
    const updated = activeId != null
      ? characters.map(c => c.id === activeId ? { ...c, ...charData } : c)
      : [...characters, { id: Date.now(), ...charData }];
    try {
      saveCharacters(updated);
    } catch {
      try {
        const slim = updated.map((c, i) => i < updated.length - 1 ? { ...c, image: null, refImages: [] } : c);
        saveCharacters(slim);
        setCharacters(slim);
      } catch {
        setSaveError('Storage full — delete some characters and try again.');
        return;
      }
    }
    setCharacters(updated);
    const savedId = activeId ?? updated[updated.length - 1].id;
    setActiveId(savedId);
    setEditing(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAiGenerate = async () => {
    setAiGenLoading(true);
    setAiGenError('');
    setAiGenImages([]);
    setAiGenAnchor('');
    const params = {
      name: aiGenName || 'Creator',
      gender: aiGenGender,
      skinTone: aiGenSkin,
      hairStyle: aiGenHairSt,
      hairColor: aiGenHairCo,
      eyeDetail: aiGenEye,
      body: aiGenBody,
      features: aiGenFeatures,
      jewelry: aiGenJewelry,
      clothing: aiGenClothing,
      niche: aiGenNiche,
      vision: aiGenVision,
    };
    try {
      // Step 1: generate seed headshot + face anchor
      setAiGenStep('Generating headshot…');
      const seedResult = await generateCharacterSeed(params);
      setAiGenImages([seedResult.image]);
      setAiGenAnchor(seedResult.faceAnchor || '');

      // Step 2: generate 4 variations — bust up, 3/4 left, 3/4 right, full body
      setAiGenStep('Generating bust up & 3/4 shots…');
      const varResult = await generateCharacterVariations({
        ...params,
        seedImage: seedResult.image,
        faceAnchor: seedResult.faceAnchor || '',
      });
      setAiGenImages([seedResult.image, ...(varResult.images || [])]);
      setAiGenStep('');
    } catch (e) {
      setAiGenError(e.message || 'Generation failed');
      setAiGenStep('');
    } finally {
      setAiGenLoading(false);
    }
  };

  const handleAiGenUse = async () => {
    if (!aiGenImages.length) return;
    const compressed = await Promise.all(aiGenImages.slice(0, 5).map(img => compressImage(img)));
    const newEditing = {
      name: aiGenName || 'Creator',
      faceAnchor: aiGenAnchor,
      refImages: compressed,
      fields: Object.fromEntries(FIELD_DEFS.map(f => [f.id, ''])),
    };
    setEditing(newEditing);
    setActiveId(null);
    setAiGenOpen(false);
    // Auto-analyze the first generated photo to fill in fields
    if (compressed[0]) runAnalysis(aiGenImages[0], newEditing);
  };

  const handleDelete = (id) => {
    const updated = characters.filter(c => c.id !== id);
    saveCharacters(updated);
    setCharacters(updated);
    if (activeId === id) { setActiveId(null); setEditing(null); }
  };

  const handlePrimaryUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async ev => {
      const original = ev.target.result;
      const compressed = await compressImage(original);
      setEditing(ed => ({
        ...ed,
        refImages: [compressed, ...(ed.refImages || []).slice(1)],
      }));
      runAnalysis(original, editing);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRefUpload = async (file, index) => {
    const reader = new FileReader();
    reader.onload = async ev => {
      const compressed = await compressImage(ev.target.result);
      setEditing(ed => {
        const imgs = [...(ed.refImages || [])];
        imgs[index] = compressed;
        return { ...ed, refImages: imgs };
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRefDelete = (index) => {
    setEditing(ed => {
      const imgs = [...(ed.refImages || [])];
      imgs.splice(index, 1);
      return { ...ed, refImages: imgs };
    });
  };

  const displayChar = editing
    ? { name: editing.name, refImages: editing.refImages, image: editing.refImages?.[0] || null, fields: editing.fields }
    : active;

  const displayImages = displayChar ? getAllImages(displayChar) : [];
  const primaryDisplay = displayImages[0] || null;

  const showPanel = !!(editing || activeId != null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 'var(--content-max)', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
        <div>
          <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--accent-deep)', marginBottom: 10 }}>Character Studio</div>
          <h1 style={{ font: 'var(--display-lg)', color: 'var(--text-strong)', letterSpacing: '-0.015em', margin: '0 0 10px' }}>Character Studio</h1>
          <p style={{ font: 'var(--text-lg)', color: 'var(--text-muted)', margin: 0, maxWidth: 480 }}>Craft consistent, iconic identities for your AI creations.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {analyzing && (
            <span style={{ font: 'var(--text-sm)', color: 'var(--accent-deep)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="sparkles" size={14} /> Analyzing…
            </span>
          )}
          {saved && (
            <span style={{ font: 'var(--text-sm)', color: 'var(--accent-deep)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="check" size={14} /> Saved!
            </span>
          )}
          {editing && <Button variant="primary" onClick={handleSave}><Icon name="save" size={15} /> Save Creator</Button>}
          {editing && <Button variant="secondary" onClick={() => { setEditing(null); setAnalyzeError(''); setSaveError(''); }}>Cancel</Button>}
          {!editing && active && (
            <Button
              variant={active.locked ? 'primary' : 'secondary'}
              onClick={handleToggleLock}
              title={active.locked ? 'Identity Locked — click to unlock' : 'Lock identity'}
            >
              <Icon name="fingerprint" size={15} /> {active.locked ? 'Locked' : 'Lock Identity'}
            </Button>
          )}
          {!editing && active && <Button variant="secondary" onClick={() => handleEdit(active)}><Icon name="pencil" size={14} /> Edit</Button>}
          <Button variant="secondary" onClick={() => { setAiGenOpen(o => !o); setEditing(null); }}>
            <Icon name="wand-2" size={15} /> Build With Thee Studio
          </Button>
          <Button variant="secondary" onClick={handleNew}><Icon name="plus" size={15} /> New Creator</Button>
        </div>
      </div>

      {analyzeError && (
        <p style={{ font: 'var(--text-sm)', color: 'var(--cherry)', margin: 0 }}>
          Analysis: {analyzeError} — fields can still be filled manually.
        </p>
      )}
      {saveError && (
        <p style={{ font: 'var(--text-sm)', color: 'var(--cherry)', margin: 0 }}>
          Save failed: {saveError}
        </p>
      )}

      {/* AI Generate Creator Panel */}
      {aiGenOpen && (
        <div style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 'var(--radius)', background: 'var(--rose-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-deep)', flexShrink: 0 }}>
              <Icon name="wand-2" size={18} strokeWidth={1.75} />
            </div>
            <div>
              <div style={{ font: '600 0.9rem/1 var(--font-ui)', color: 'var(--text-strong)' }}>Build Creator with Thee Studio</div>
              <div style={{ font: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 3 }}>Describe your creator — AI generates 4 reference photos and locks their face automatically.</div>
            </div>
          </div>

          {/* Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Row 1: Name + Gender */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={LABEL}>Creator Name</label>
                <input value={aiGenName} onChange={e => setAiGenName(e.target.value)} placeholder="e.g. Angel, Maya, Jade…" style={INPUT_STYLE} />
              </div>
              <div>
                <label style={LABEL}>Gender</label>
                <Select value={aiGenGender} onChange={setAiGenGender} options={GENDERS} />
              </div>
            </div>
            {/* Row 2: Skin + Eye */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={LABEL}>Skin Tone</label>
                <Select value={aiGenSkin} onChange={setAiGenSkin} options={SKIN_TONES} />
              </div>
              <div>
                <label style={LABEL}>Eye Detail</label>
                <Select value={aiGenEye} onChange={setAiGenEye} options={EYE_DETAILS} />
              </div>
            </div>
            {/* Row 3: Hair Style + Hair Color */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={LABEL}>Hair Style</label>
                <Select value={aiGenHairSt} onChange={setAiGenHairSt} options={HAIR_STYLES} />
              </div>
              <div>
                <label style={LABEL}>Hair Color</label>
                <Select value={aiGenHairCo} onChange={setAiGenHairCo} options={HAIR_COLORS} />
              </div>
            </div>
            {/* Row 4: Special Features + Jewelry */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={LABEL}>Special Features</label>
                <Select value={aiGenFeatures} onChange={setAiGenFeatures} options={SPECIAL_FEATURES} />
              </div>
              <div>
                <label style={LABEL}>Signature Jewelry</label>
                <Select value={aiGenJewelry} onChange={setAiGenJewelry} options={JEWELRY_OPTIONS} />
              </div>
            </div>
            {/* Row 5: Body + Niche */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={LABEL}>Body / Build</label>
                <input value={aiGenBody} onChange={e => setAiGenBody(e.target.value)} placeholder="e.g. slim, curvy, athletic, petite…" style={INPUT_STYLE} />
              </div>
              <div>
                <label style={LABEL}>Content Niche</label>
                <input value={aiGenNiche} onChange={e => setAiGenNiche(e.target.value)} placeholder="e.g. fashion, fitness, beauty, lifestyle…" style={INPUT_STYLE} />
              </div>
            </div>
            {/* Row 6: Clothing (full width) */}
            <div>
              <label style={LABEL}>Signature Look / Clothing</label>
              <Select value={aiGenClothing} onChange={setAiGenClothing} options={CLOTHING_VIBES} />
            </div>
            {/* Row 7: Vision (full width) */}
            <div>
              <label style={LABEL}>Vision / Style Direction</label>
              <input value={aiGenVision} onChange={e => setAiGenVision(e.target.value)} placeholder="e.g. Editorial luxury, sophisticated energy, warm and approachable…" style={INPUT_STYLE} />
            </div>
          </div>

          {aiGenError && <p style={{ font: 'var(--text-sm)', color: 'var(--cherry)', margin: 0 }}>{aiGenError}</p>}

          {/* Progress bar — visible while loading or once images arrive */}
          {(aiGenLoading || aiGenImages.length > 0) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-deep)', font: '500 0.8rem/1 var(--font-ui)' }}>
                  {aiGenLoading && <Icon name="sparkles" size={14} strokeWidth={1.75} />}
                  <span style={{ color: aiGenLoading ? 'var(--accent-deep)' : 'var(--text-muted)' }}>
                    {aiGenLoading ? (aiGenStep || 'Working…') : 'Complete'}
                  </span>
                </div>
                <span style={{ font: 'var(--text-xs)', color: 'var(--accent-deep)', fontWeight: 600 }}>
                  {aiGenImages.length} / 5
                </span>
              </div>
              <div style={{ height: 5, background: 'var(--rose-deep)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: aiGenLoading && aiGenImages.length === 0 ? '8%' : `${(aiGenImages.length / 5) * 100}%`,
                  background: 'var(--grad-coral)',
                  borderRadius: 99,
                  transition: 'width 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
                }} />
              </div>
              {/* Shot labels under the bar */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4 }}>
                {['Headshot', 'Bust Up', '¾ Left', '¾ Right', 'Full Body'].map((label, i) => (
                  <div key={i} style={{ textAlign: 'center', font: '500 0.6rem/1 var(--font-ui)', letterSpacing: '0.03em', textTransform: 'uppercase', color: aiGenImages[i] ? 'var(--accent-deep)' : 'var(--text-faint)', transition: 'color 0.4s ease' }}>
                    {label}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Generated image preview */}
          {aiGenImages.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Reference Photos · {aiGenImages.length}/5
                {aiGenAnchor && <span style={{ color: 'var(--accent-deep)', marginLeft: 10 }}>● Face Lock Ready</span>}
              </div>
              {(() => {
                const SHOT_LABELS = ['Headshot', 'Bust Up', '¾ Left', '¾ Right', 'Full Body'];
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
                    {SHOT_LABELS.map((label, i) => (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <div style={{ aspectRatio: '2/3', borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: 'var(--rose-glass)', border: '1px solid var(--border)' }}>
                          {aiGenImages[i]
                            ? <img src={aiGenImages[i]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={label} />
                            : aiGenLoading && <div style={{ width: '100%', height: '100%', background: 'var(--grad-portrait)', opacity: 0.4 }} />
                          }
                        </div>
                        <div style={{ font: 'var(--text-xs)', color: 'var(--text-muted)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.65rem' }}>{label}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <Button
              variant="primary"
              loading={aiGenLoading}
              onClick={aiGenImages.length ? handleAiGenUse : handleAiGenerate}
              disabled={aiGenLoading}
            >
              <Icon name={aiGenImages.length ? 'user-check' : 'sparkles'} size={15} />
              {aiGenLoading ? (aiGenStep || 'Generating…') : aiGenImages.length ? 'Use These Photos & Create Creator' : 'Generate 5 Reference Photos'}
            </Button>
            {aiGenImages.length > 0 && !aiGenLoading && (
              <Button variant="secondary" onClick={handleAiGenerate}>
                <Icon name="refresh-cw" size={14} /> Regenerate
              </Button>
            )}
            <Button variant="secondary" onClick={() => setAiGenOpen(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Detail panel */}
      {showPanel && (
        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 20, alignItems: 'start' }}>

          {/* Portrait + reference slots */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Primary portrait */}
            <div
              onClick={() => editing && fileInputRef.current?.click()}
              style={{ aspectRatio: '3/4', borderRadius: 'var(--radius-xl)', background: 'var(--grad-portrait)', boxShadow: 'var(--shadow-md)', overflow: 'hidden', cursor: editing ? 'pointer' : 'default', position: 'relative' }}
            >
              {primaryDisplay
                ? <img src={primaryDisplay} alt="Creator" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : editing && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text-faint)' }}>
                    <Icon name="upload" size={24} strokeWidth={1.5} />
                    <span style={{ font: 'var(--text-sm)' }}>Upload photo</span>
                  </div>
                )
              }
              {analyzing && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#fff' }}>
                  <Icon name="sparkles" size={28} strokeWidth={1.5} />
                  <span style={{ font: 'var(--text-sm)', fontWeight: 600 }}>Reading creator…</span>
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePrimaryUpload} />

            {/* Additional reference photo slots (editing mode or view mode when refs exist) */}
            {(editing || displayImages.length > 1) && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {/* Slots 1–3 (indices 1–3) */}
                {[1, 2, 3].map(i => (
                  <RefImageSlot
                    key={i}
                    index={i}
                    src={displayImages[i] || null}
                    active={!editing && activeRef === i}
                    onClick={() => !editing && displayImages[i] && setActiveRef(i)}
                    onDelete={() => editing && handleRefDelete(i)}
                    onUpload={file => handleRefUpload(file, i)}
                  />
                ))}
              </div>
            )}

            {editing && primaryDisplay && !analyzing && (
              <Button variant="secondary" onClick={() => runAnalysis(primaryDisplay, editing)} style={{ width: '100%' }}>
                <Icon name="sparkles" size={13} /> Re-analyze
              </Button>
            )}
            {editing
              ? <input value={editing.name} onChange={e => setEditing(ed => ({ ...ed, name: e.target.value }))} style={{ ...INPUT_STYLE, textAlign: 'center', fontWeight: 600 }} />
              : <div style={{ textAlign: 'center', font: '600 0.9375rem/1 var(--font-ui)', color: 'var(--text-strong)' }}>
                  {displayChar?.name}
                </div>
            }
          </div>

          {/* Identity fields */}
          <Card style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {FIELD_DEFS.map(f => (
              <div key={f.id}>
                <label style={LABEL}>
                  <Icon name={f.icon} size={12} strokeWidth={2} style={{ marginRight: 5 }} />
                  {f.label}
                </label>
                {editing
                  ? <input
                      value={editing.fields[f.id] || ''}
                      onChange={e => setEditing(ed => ({ ...ed, fields: { ...ed.fields, [f.id]: e.target.value } }))}
                      placeholder={analyzing ? 'Analyzing…' : f.placeholder}
                      style={{ ...INPUT_STYLE, opacity: analyzing ? 0.5 : 1 }}
                      disabled={analyzing}
                    />
                  : <div style={{ font: 'var(--text-sm)', color: displayChar?.fields?.[f.id] ? 'var(--text-body)' : 'var(--text-faint)', lineHeight: 1.5 }}>
                      {displayChar?.fields?.[f.id] || '—'}
                    </div>
                }
              </div>
            ))}
          </Card>
        </div>
      )}

      {/* Quick Shoot */}
      {activeId != null && !editing && active && (
        <Card style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ ...LABEL, marginBottom: 2 }}>Quick Shoot</div>
              <div style={{ font: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                {getAllImages(active).length
                  ? `${getAllImages(active).length} reference photo${getAllImages(active).length > 1 ? 's' : ''} · portrait used as visual reference`
                  : 'No portrait uploaded — will generate from identity fields only.'}
              </div>
            </div>
            {active.locked && (
              <span style={{
                display: 'flex', alignItems: 'center', gap: 6,
                font: '600 0.75rem/1 var(--font-ui)', color: 'var(--accent-deep)',
                background: 'var(--rose-deep)', padding: '5px 10px', borderRadius: 'var(--radius-pill)',
              }}>
                <Icon name="fingerprint" size={13} /> Identity Locked
              </span>
            )}
          </div>

          {/* Reference picker — only when multiple refs */}
          {getAllImages(active).length > 1 && (
            <div>
              <div style={{ ...LABEL, marginBottom: 10 }}>Reference Photo</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {getAllImages(active).map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveRef(i)}
                    style={{
                      width: 52, height: 69, borderRadius: 8, overflow: 'hidden', cursor: 'pointer', padding: 0,
                      border: `2px solid ${activeRef === i ? 'var(--accent-deep)' : 'var(--border)'}`,
                      boxShadow: activeRef === i ? 'var(--shadow-sm)' : 'none',
                      transition: 'border-color var(--t-fast)', background: 'none', flexShrink: 0,
                    }}
                  >
                    <img src={img} alt={`Ref ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </button>
                ))}
                <span style={{ font: 'var(--text-xs)', color: 'var(--text-faint)', marginLeft: 4 }}>
                  Using ref {activeRef + 1}
                </span>
              </div>
            </div>
          )}

          {/* Engine */}
          <div>
            <div style={{ ...LABEL, marginBottom: 10 }}>Engine</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {QUICK_ENGINES.map(eng => (
                <PillButton key={eng.id} active={quickEngine === eng.id} onClick={() => setQuickEngine(eng.id)}>
                  <Icon name={eng.icon} size={13} strokeWidth={1.75} /> {eng.label}
                </PillButton>
              ))}
            </div>
          </div>

          {/* Scene */}
          <div>
            <div style={{ ...LABEL, marginBottom: 10 }}>Scene</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {QUICK_SCENES.map(sc => (
                <PillButton key={sc.id} active={quickScene === sc.id} onClick={() => setQuickScene(sc.id)}>
                  <Icon name={sc.icon} size={13} strokeWidth={1.75} /> {sc.name}
                </PillButton>
              ))}
            </div>
          </div>

          {/* Outfit */}
          <div>
            <div style={{ ...LABEL, marginBottom: 10 }}>
              Outfit
              {quickOutfit !== 'default' && (
                <button
                  onClick={() => setQuickOutfit('default')}
                  style={{ marginLeft: 10, font: '500 0.72rem/1 var(--font-ui)', color: 'var(--text-faint)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  reset
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
              {QUICK_OUTFITS.map(o => (
                <PillButton key={o.id} active={quickOutfit === o.id} onClick={() => setQuickOutfit(o.id)} style={{ flexShrink: 0 }}>
                  {o.label}
                </PillButton>
              ))}
            </div>
            {quickOutfit !== 'default' && (
              <div style={{ font: 'var(--text-xs)', color: 'var(--text-faint)', marginTop: 6, lineHeight: 1.4 }}>
                {QUICK_OUTFITS.find(o => o.id === quickOutfit)?.prompt}
              </div>
            )}
          </div>

          {/* Mood */}
          <div>
            <div style={{ ...LABEL, marginBottom: 10 }}>Mood</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {QUICK_MOODS.map(m => (
                <PillButton key={m} active={quickMood === m} onClick={() => setQuickMood(m)}>
                  {m}
                </PillButton>
              ))}
            </div>
          </div>

          {/* Batch size */}
          <div>
            <div style={{ ...LABEL, marginBottom: 10 }}>Batch</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {BATCH_OPTIONS.map(n => (
                <PillButton key={n} active={quickBatch === n} onClick={() => setQuickBatch(n)}>
                  {n} image{n > 1 ? 's' : ''}
                </PillButton>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Button variant="primary" onClick={handleQuickShoot} loading={generating} disabled={generating} style={{ alignSelf: 'flex-start' }}>
              <Icon name="zap" size={15} /> {generating ? 'Generating…' : 'Build + Generate'}
            </Button>
            {generating && (
              <span style={{ font: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                {quickBatch > 1 ? `Generating ${quickBatch} images…` : 'Using your portrait as visual reference…'}
              </span>
            )}
          </div>

          {genError && (
            <p style={{ font: 'var(--text-sm)', color: 'var(--cherry)', margin: 0 }}>{genError}</p>
          )}

          {genImages.length > 0 && (
            <div>
              <div style={{ ...LABEL, marginBottom: 12 }}>
                Result · {genImages.length} image{genImages.length > 1 ? 's' : ''}
              </div>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                {genImages.map((url, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 160 }}>
                    <div style={{ aspectRatio: '3/4', borderRadius: 'var(--radius-xl)', overflow: 'hidden', boxShadow: 'var(--shadow-md)' }}>
                      <img src={url} alt={`Generated ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <a href={url} download={`thee-studio-${Date.now()}-${i}.jpg`} target="_blank" rel="noreferrer">
                      <Button variant="secondary" style={{ width: '100%', fontSize: '0.75rem' }}>
                        <Icon name="download" size={13} /> Download
                      </Button>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Shot History */}
      {activeId != null && !editing && shotHistory.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ ...LABEL, marginBottom: 0 }}>
              Shot History · {shotHistory.length} image{shotHistory.length !== 1 ? 's' : ''}
            </div>
            <button
              onClick={() => onNav && onNav('library')}
              style={{ font: 'var(--text-sm)', color: 'var(--accent-deep)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}
            >
              View all in Library <Icon name="arrow-right" size={13} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12 }}>
            {shotHistory.map(entry => (
              <div key={entry.id} style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border)', aspectRatio: '3/4', background: 'var(--grad-portrait)' }}>
                <img src={entry.url} alt="Shot" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Creator gallery */}
      {characters.length > 0 && (
        <div>
          <div style={{ ...LABEL, marginBottom: 16 }}>Your Creators</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 20 }}>
            {characters.map(c => (
              <CreatorCard
                key={c.id}
                char={c}
                selected={c.id === activeId && !editing}
                onClick={() => { setActiveId(c.id); setEditing(null); setAnalyzeError(''); setSaveError(''); }}
                onDelete={() => handleDelete(c.id)}
              />
            ))}
          </div>
        </div>
      )}

      {characters.length === 0 && !editing && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-faint)' }}>
          <Icon name="sparkles" size={40} strokeWidth={1} />
          <div style={{ font: 'var(--text-lg)', marginTop: 16, marginBottom: 8, color: 'var(--text-muted)' }}>No creators yet</div>
          <div style={{ font: 'var(--text-sm)' }}>Import a photo or click New Creator to get started.</div>
        </div>
      )}

    </div>
  );
}
