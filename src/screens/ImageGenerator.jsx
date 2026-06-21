import React from 'react';
import { Card } from '../components/surfaces/Card.jsx';
import { Select } from '../components/forms/Select.jsx';
import { Button } from '../components/core/Button.jsx';
import { Icon } from '../components/core/Icon.jsx';
import { GenerationProgress } from '../components/feedback/GenerationProgress.jsx';
import { generateImage, characterGenerate, fetchEngineChoices, sanitizeForOpenAI, generateCharacterSeed, generateCharacterVariations, generateCharacterVariationShot } from '../api/studio.js';
import { saveToLibrary } from '../lib/library.js';
import {
  GENDERS, SKIN_TONES, HAIR_COLORS, EYE_DETAILS, SPECIAL_FEATURES,
  LOCATIONS, STANDARD_NEGATIVE, buildStructuredVision, buildFluxVision,
  getHairStyleOptions, getClothingOptions, getJewelryOptions, getPhysiqueOptions,
  CONTENT_NICHES, STYLE_DIRECTIONS,
} from '../lib/promptData.js';
import { ImageLightbox } from '../components/feedback/ImageLightbox.jsx';

const FALLBACK_ENGINES = [
  'Fast Draft',
  'DreamShaper Classic',
  'Replicate FLUX Schnell',
  'Replicate FLUX Pro',
  'Replicate NSFW XL',
  'OpenAI Image',
  'Prompt Only',
  'Uncensored Portrait XL',
  'Thee Studio Cloud Preview — Setup Needed',
  'Photoreal Portrait — Setup Needed',
  'Editorial Beauty — Setup Needed',
];

const PERF_OPTIONS    = ['Safe CPU', 'Fast Draft', 'Balanced', 'High Detail'].map(v => ({ value: v, label: v }));
const STYLE_OPTIONS   = ['Editorial Portrait', 'Lifestyle Creator', 'Product Shot', 'Fashion Lookbook', 'Beauty Close-Up', 'Cinematic Scene'].map(v => ({ value: v, label: v }));
const FORMAT_OPTIONS  = [
  { value: 'Vertical 9:16',   label: 'Vertical 9:16' },
  { value: 'Instagram 4:5',   label: 'Instagram 4:5' },
  { value: 'Square 1:1',      label: 'Square 1:1' },
  { value: 'Landscape 16:9',  label: 'Landscape 16:9' },
];
const QUALITY_OPTIONS = ['Draft', 'Standard', 'High'].map(v => ({ value: v, label: v }));

const FORMAT_DIMS = {
  'Vertical 9:16':  [832,  1216],
  'Instagram 4:5':  [896,  1120],
  'Square 1:1':     [1024, 1024],
  'Landscape 16:9': [1216, 832],
};

const VIBES     = ['Clean', 'Bold', 'Luxury', 'Raw', 'Romantic', 'Cinematic', 'Moody', 'Soft'];
const LIGHTINGS = ['Natural', 'Golden Hour', 'Blue Hour', 'Studio', 'Night', 'Overcast'];
const SHOT_TYPES = ['Portrait', 'Fashion', 'Lifestyle', 'Campaign', 'Street', 'Beauty'];

const LABEL = { font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 };
const INPUT_STYLE = { width: '100%', boxSizing: 'border-box', padding: '8px 12px', background: 'var(--input-bg, #fff)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', font: 'var(--text-sm)', color: 'var(--text-body)', outline: 'none', fontFamily: 'inherit' };

const TEXTAREA = {
  width: '100%', boxSizing: 'border-box', resize: 'vertical',
  minHeight: 80, padding: '10px 12px',
  background: 'var(--input-bg, #fff)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)', font: 'var(--text-sm)', color: 'var(--text-body)',
  lineHeight: 1.5, outline: 'none', fontFamily: 'inherit',
};

function compressImage(dataUrl, maxPx = 768, quality = 0.92) {
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

function Pill({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 14px', borderRadius: 'var(--radius-pill)', cursor: 'pointer',
        border: `1.5px solid ${active ? 'var(--accent-deep)' : 'var(--border)'}`,
        background: active ? 'var(--rose-deep)' : 'transparent',
        color: active ? 'var(--accent-deep)' : 'var(--text-muted)',
        font: '500 0.78rem/1 var(--font-ui)',
        transition: 'all var(--t-fast)',
      }}
    >
      {label}
    </button>
  );
}

function ImageResult({ src, index, onOpen }) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onOpen && onOpen(src)}
      style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border)', position: 'relative', cursor: 'zoom-in' }}
    >
      <img src={src} alt={`Generated ${index + 1}`} style={{ width: '100%', display: 'block' }} />
      {hovered && (
        <div style={{ position: 'absolute', bottom: 8, left: 8, right: 8, display: 'flex', gap: 6 }}>
          <a
            href={src}
            download={`thee-studio-${Date.now()}-${index}.jpg`}
            style={{ flex: 1, textDecoration: 'none' }}
            onClick={e => e.stopPropagation()}
          >
            <button style={{
              width: '100%', padding: '7px 0', borderRadius: 'var(--radius-md)',
              background: 'rgba(255,255,255,0.93)', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              font: '500 0.75rem/1 var(--font-ui)', color: 'var(--text-strong)',
              boxShadow: 'var(--shadow-sm)',
            }}>
              <Icon name="download" size={13} /> Download
            </button>
          </a>
        </div>
      )}
    </div>
  );
}

export function ImageGenerator({ initialPrompts, onNav }) {
  // Engine + generation state
  const [engineOptions, setEngineOptions] = React.useState([]);
  const [engine, setEngine]               = React.useState('OpenAI Image');
  const [perf, setPerf]                   = React.useState('Balanced');
  const [style, setStyle]                 = React.useState('Lifestyle Creator');
  const [format, setFormat]               = React.useState('Vertical 9:16');
  const [quality, setQuality]             = React.useState('High');
  const [positivePrompt, setPositive]     = React.useState('');
  const [negativePrompt, setNegative]     = React.useState('');
  const [loading, setLoading]             = React.useState(false);
  const [error, setError]                 = React.useState('');
  const [status, setStatus]               = React.useState('');
  const [images, setImages]               = React.useState([]);
  const [lightboxSrc, setLightboxSrc]     = React.useState(null);
  const [selectedChar, setSelectedChar]   = React.useState(null);

  // Prompt builder state
  const [vibe, setVibe]         = React.useState('');
  const [lighting, setLighting] = React.useState('');
  const [shotType, setShotType] = React.useState('');
  const [scene, setScene]       = React.useState('None');
  const [hairStyle, setHairStyle] = React.useState('Unspecified');
  const [hairColor, setHairColor] = React.useState('Unspecified');
  const [outfit, setOutfit]     = React.useState('Unspecified');
  const [jewelry, setJewelry]   = React.useState('None');
  const [vision, setVision]     = React.useState('');

  // Build with Thee Studio (AI subject generation) state
  const [aiGenName,     setAiGenName]     = React.useState('');
  const [aiGenGender,   setAiGenGender]   = React.useState('Woman');
  const [aiGenSkin,     setAiGenSkin]     = React.useState('Unspecified');
  const [aiGenHairSt,   setAiGenHairSt]   = React.useState('Unspecified');
  const [aiGenHairCo,   setAiGenHairCo]   = React.useState('Unspecified');
  const [aiGenEye,      setAiGenEye]      = React.useState('Unspecified');
  const [aiGenBody,     setAiGenBody]     = React.useState('Unspecified');
  const [aiGenFeatures, setAiGenFeatures] = React.useState('None');
  const [aiGenJewelry,  setAiGenJewelry]  = React.useState('None');
  const [aiGenClothing, setAiGenClothing] = React.useState('Unspecified');
  const [aiGenNiche,    setAiGenNiche]    = React.useState('');
  const [aiGenVision,   setAiGenVision]   = React.useState('');
  const [aiGenStep,      setAiGenStep]      = React.useState('');
  const [aiGenImages,    setAiGenImages]    = React.useState([]);
  const [aiGenAnchor,    setAiGenAnchor]    = React.useState('');
  const [aiGenLoading,   setAiGenLoading]   = React.useState(false);
  const [aiGenError,     setAiGenError]     = React.useState('');
  const [aiGenProgress,  setAiGenProgress]  = React.useState(0);
  const [aiGenSeed,      setAiGenSeed]      = React.useState(null); // { image, faceAnchor, skinToneLock }
  const [aiGenApproval,  setAiGenApproval]  = React.useState(false); // waiting for user to approve headshot
  const [aiGenLocked,    setAiGenLocked]    = React.useState(false); // identity lock animation active

  const aiGenHairOptions     = getHairStyleOptions(aiGenGender);
  const aiGenClothingOptions = getClothingOptions(aiGenGender);
  const aiGenJewelryOptions  = getJewelryOptions(aiGenGender);
  const hairStyleOptions     = getHairStyleOptions('Unspecified');
  const clothingOptions      = getClothingOptions('Unspecified');
  const jewelryOptions       = getJewelryOptions('Unspecified');

  const handleAiGenGenderChange = (newGender) => {
    const newHair     = getHairStyleOptions(newGender).find(o => o.value === aiGenHairSt)  ? aiGenHairSt   : 'Unspecified';
    const newClothing = getClothingOptions(newGender).find(o => o.value === aiGenClothing) ? aiGenClothing : 'Unspecified';
    const newJewelry  = getJewelryOptions(newGender).find(o => o.value === aiGenJewelry)   ? aiGenJewelry  : 'None';
    const newBody     = getPhysiqueOptions(newGender).find(o => o.value === aiGenBody)      ? aiGenBody     : 'Unspecified';
    setAiGenGender(newGender);
    setAiGenHairSt(newHair);
    setAiGenClothing(newClothing);
    setAiGenJewelry(newJewelry);
    setAiGenBody(newBody);
  };

  // Smooth progress animation for AI generation
  React.useEffect(() => {
    if (!aiGenLoading && aiGenImages.length === 0) { setAiGenProgress(0); return; }
    if (!aiGenLoading) { setAiGenProgress(100); return; }
    // Step 1 (headshot only): ceiling at 100. Step 2 (4 variations): index into remaining slots.
    const ceilings = aiGenApproval ? [100] : [14, 32, 52, 70, 88, 100];
    const ceiling  = aiGenApproval ? 100 : ceilings[Math.min(aiGenImages.length, 5)];
    const id = setInterval(() => {
      setAiGenProgress(prev => {
        if (prev >= ceiling) return prev;
        const step = Math.max(0.2, (ceiling - prev) * 0.04);
        return Math.min(ceiling, prev + step);
      });
    }, 40);
    return () => clearInterval(id);
  }, [aiGenLoading, aiGenImages.length, aiGenApproval]);

  React.useEffect(() => {
    fetchEngineChoices().then(choices => {
      const list = (choices?.length ? choices : FALLBACK_ENGINES);
      const opts = list.map(c => ({ value: c, label: c }));
      setEngineOptions(opts);
      const openai = list.find(c => c.toLowerCase().includes('openai'));
      if (openai) {
        setEngine(openai);
      } else {
        const isReady = c => !c.includes('Setup Needed') && !c.includes('Disabled');
        setEngine(list.find(isReady) || list[0]);
      }
    });
  }, []);

  React.useEffect(() => {
    if (initialPrompts?.positivePrompt) setPositive(initialPrompts.positivePrompt);
    if (initialPrompts?.negativePrompt) setNegative(initialPrompts.negativePrompt);
  }, [initialPrompts]);

  const _buildAiGenParams = () => ({
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
  });

  // Step 1 — generate headshot only, then wait for approval
  const handleAiGenerate = async () => {
    setAiGenLoading(true);
    setAiGenError('');
    setAiGenImages([]);
    setAiGenAnchor('');
    setAiGenSeed(null);
    setAiGenApproval(false);
    setAiGenLocked(false);
    setAiGenProgress(0);
    try {
      setAiGenStep('Generating headshot…');
      const seedResult = await generateCharacterSeed(_buildAiGenParams());
      setAiGenSeed(seedResult);
      setAiGenImages([seedResult.image]);
      setAiGenAnchor(seedResult.faceAnchor || '');
      setAiGenApproval(true);
      setAiGenStep('');
    } catch (e) {
      setAiGenError(e.message || 'Generation failed');
      setAiGenStep('');
    } finally {
      setAiGenLoading(false);
    }
  };

  // Step 2 — user approved, fire lock animation then generate 4 shots one at a time
  const handleAiGenApprove = async () => {
    if (!aiGenSeed) return;
    setAiGenLocked(true);
    setAiGenApproval(false);
    setAiGenLoading(true);
    setAiGenError('');
    setAiGenProgress(0);
    const shotLabels = ['Bust Up', '¾ Left', '¾ Right', 'Full Body'];
    const baseParams = {
      ..._buildAiGenParams(),
      seedImage: aiGenSeed.image,
      faceAnchor: aiGenSeed.faceAnchor || '',
      skinToneLock: aiGenSeed.skinToneLock || '',
    };
    try {
      for (let i = 0; i < 4; i++) {
        setAiGenStep(`Generating ${shotLabels[i]}…`);
        const result = await generateCharacterVariationShot({ ...baseParams, shotIndex: i });
        const img = result.image || null;
        // Append each image as it arrives — seed stays at index 0
        setAiGenImages(prev => {
          const next = [...prev];
          next[i + 1] = img;
          return next;
        });
      }
      setAiGenStep('');
      setAiGenLocked(false); // switch to full grid view once all shots are in
    } catch (e) {
      setAiGenError(e.message || 'Generation failed');
      setAiGenStep('');
      setAiGenLocked(false);
    } finally {
      setAiGenLoading(false);
    }
  };

  const handleSaveCreator = async () => {
    if (!aiGenImages.length) return;
    const validImgs = aiGenImages.filter(img => img && !img.startsWith('ERROR:'));
    if (!validImgs.length) return;
    const compressed = await Promise.all(validImgs.slice(0, 5).map(img => compressImage(img)));
    const newChar = {
      id: Date.now().toString(),
      name: aiGenName || 'Creator',
      faceAnchor: aiGenAnchor,
      refImages: compressed,
      locked: true,
      fields: { tone: aiGenSkin !== 'Unspecified' ? aiGenSkin : '', hair: aiGenHairSt !== 'Unspecified' ? aiGenHairSt : '', face: aiGenEye !== 'Unspecified' ? aiGenEye : '', body: aiGenBody !== 'Unspecified' ? aiGenBody : '', wardrobe: aiGenClothing !== 'Unspecified' ? aiGenClothing : '', personality: aiGenVision || '', niche: aiGenNiche || '' },
    };
    try {
      const existing = JSON.parse(localStorage.getItem('ts_characters') || '[]');
      existing.push(newChar);
      localStorage.setItem('ts_characters', JSON.stringify(existing));
    } catch {}
    onNav?.('characters');
  };

  const handleAiGenUse = async () => {
    if (!aiGenImages.length) return;
    const validImgs = aiGenImages.filter(img => img && !img.startsWith('ERROR:'));
    if (!validImgs.length) return;
    const compressed = await Promise.all(validImgs.slice(0, 5).map(img => compressImage(img)));
    setSelectedChar({
      name: aiGenName || 'Creator',
      faceAnchor: aiGenAnchor,
      refImages: compressed,
      locked: true,
    });
    setStudioOpen(false);
  };

  const handleGenerate = async () => {
    setError('');
    setStatus('');
    setLoading(true);
    setImages([]);
    try {
      const validEngines = engineOptions.map(o => o.value);
      const safeEngine = validEngines.includes(engine)
        ? engine
        : validEngines.find(v => !v.includes('Setup Needed')) || validEngines[0];

      if (!safeEngine) {
        throw new Error('No engine selected. Wait for the engine list to load, then try again.');
      }

      const [width, height] = FORMAT_DIMS[format] || [832, 1216];
      const isOpenAI = safeEngine.toLowerCase().includes('openai');

      // Merge prompt builder modifiers
      const mods = [
        shotType && `${shotType} shot`,
        vibe && `${vibe} vibe`,
        lighting && `${lighting} lighting`,
        scene !== 'None' && scene && `Scene: ${scene}`,
        hairStyle !== 'Unspecified' && `Hair: ${hairStyle}`,
        hairColor !== 'Unspecified' && `Hair color: ${hairColor}`,
        outfit !== 'Unspecified' && `Outfit: ${outfit}`,
        jewelry !== 'None' && `Jewelry: ${jewelry}`,
        vision,
      ].filter(Boolean).join('. ');

      const builtPrompt = mods ? `${positivePrompt}${positivePrompt ? '. ' : ''}${mods}` : positivePrompt;
      const finalPositive = isOpenAI ? sanitizeForOpenAI(builtPrompt) : builtPrompt;

      const charRefImage = selectedChar?.refImages?.[0];
      const useCharRef = isOpenAI && charRefImage;

      const result = useCharRef
        ? await characterGenerate({
            engineId: safeEngine,
            positivePrompt: finalPositive,
            negativePrompt,
            imageSize: format,
            batchSize: 1,
            characterImage: charRefImage,
          })
        : await generateImage({
            engine: safeEngine,
            performanceMode: perf,
            imageStyle: style,
            imageSize: format,
            quality,
            width,
            height,
            positivePrompt: finalPositive,
            negativePrompt,
          });
      const imgs = result.images || [];
      setImages(imgs);
      if (result.status) setStatus(result.status);
      imgs.forEach(url => {
        saveToLibrary(url, {
          source: 'generator',
          engine: safeEngine,
          prompt: finalPositive.slice(0, 120),
        }).catch(() => {});
      });
    } catch (e) {
      setError(e?.message || 'Generation failed. Make sure your Gradio app is running on port 7860.');
    } finally {
      setLoading(false);
    }
  };

  const aspectStyle = format === 'Vertical 9:16' ? '9/16'
    : format === 'Instagram 4:5' ? '4/5'
    : format === 'Square 1:1' ? '1/1'
    : '16/9';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 'var(--content-max)', margin: '0 auto' }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
        <div>
          <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--accent-deep)', marginBottom: 10 }}>Image Generator</div>
          <h1 style={{ font: 'var(--display-lg)', color: 'var(--text-strong)', letterSpacing: '-0.015em', margin: '0 0 10px' }}>Image Generator</h1>
          <p style={{ font: 'var(--text-lg)', color: 'var(--text-muted)', margin: 0, maxWidth: 480 }}>Create studio-grade imagery with precision and style.</p>
        </div>
      </div>

      {/* Build with Thee Studio — AI subject generation */}
      <Card style={{ padding: '20px 20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 'var(--radius)',
            background: 'var(--rose-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--accent-deep)', flexShrink: 0,
          }}>
            <Icon name="wand-2" size={16} strokeWidth={1.75} />
          </div>
          <div>
            <div style={{ font: '600 0.88rem/1 var(--font-ui)', color: 'var(--text-strong)' }}>
              Build with Thee Studio
              {selectedChar && (
                <span style={{ marginLeft: 10, font: '500 0.75rem/1 var(--font-ui)', color: 'var(--accent-deep)', background: 'var(--rose-deep)', padding: '2px 8px', borderRadius: 'var(--radius-pill)' }}>
                  {selectedChar.name} · Ready
                </span>
              )}
            </div>
            <div style={{ font: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 3 }}>
              Describe your subject — AI generates 5 reference photos and locks their face for identity-consistent generation
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Row 1: Name + Gender */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={LABEL}>Creator Name</div>
                <input value={aiGenName} onChange={e => setAiGenName(e.target.value)} placeholder="e.g. Angel, Maya, Jade…" style={INPUT_STYLE} />
              </div>
              <div>
                <div style={LABEL}>Gender</div>
                <Select value={aiGenGender} onChange={handleAiGenGenderChange} options={GENDERS} />
              </div>
            </div>
            {/* Row 2: Skin + Eye */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={LABEL}>Skin Tone</div>
                <Select value={aiGenSkin} onChange={setAiGenSkin} options={SKIN_TONES} />
              </div>
              <div>
                <div style={LABEL}>Eye Detail</div>
                <Select value={aiGenEye} onChange={setAiGenEye} options={EYE_DETAILS} />
              </div>
            </div>
            {/* Row 3: Hair Style + Hair Color */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={LABEL}>Hair Style</div>
                <Select value={aiGenHairSt} onChange={setAiGenHairSt} options={aiGenHairOptions} />
              </div>
              <div>
                <div style={LABEL}>Hair Color</div>
                <Select value={aiGenHairCo} onChange={setAiGenHairCo} options={HAIR_COLORS} />
              </div>
            </div>
            {/* Row 4: Special Features + Jewelry */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={LABEL}>Special Features</div>
                <Select value={aiGenFeatures} onChange={setAiGenFeatures} options={SPECIAL_FEATURES} />
              </div>
              <div>
                <div style={LABEL}>Signature Jewelry</div>
                <Select value={aiGenJewelry} onChange={setAiGenJewelry} options={aiGenJewelryOptions} />
              </div>
            </div>
            {/* Row 5: Body + Clothing */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={LABEL}>Their Build</div>
                <Select value={aiGenBody} onChange={setAiGenBody} options={getPhysiqueOptions(aiGenGender)} />
              </div>
              <div>
                <div style={LABEL}>Signature Look / Clothing</div>
                <Select value={aiGenClothing} onChange={setAiGenClothing} options={aiGenClothingOptions} />
              </div>
            </div>
            {/* Row 6: Their World (Content Niche pills) */}
            <div>
              <div style={LABEL}>Their World</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                {CONTENT_NICHES.map(n => (
                  <Pill key={n} label={n} active={aiGenNiche === n} onClick={() => setAiGenNiche(aiGenNiche === n ? '' : n)} />
                ))}
              </div>
            </div>
            {/* Row 7: Their Energy (Style Direction pills) */}
            <div>
              <div style={LABEL}>Their Energy</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                {STYLE_DIRECTIONS.map(d => (
                  <Pill key={d} label={d} active={aiGenVision === d} onClick={() => setAiGenVision(aiGenVision === d ? '' : d)} />
                ))}
              </div>
            </div>

            {aiGenError && <p style={{ font: 'var(--text-sm)', color: 'var(--cherry)', margin: 0 }}>{aiGenError}</p>}

            {/* Progress bar */}
            {(aiGenLoading || aiGenImages.length > 0) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, font: '500 0.8rem/1 var(--font-ui)' }}>
                    {aiGenLoading && <Icon name="sparkles" size={14} strokeWidth={1.75} style={{ animation: 'spin 1.4s linear infinite' }} />}
                    <span style={{ color: aiGenLoading ? 'var(--accent-deep)' : 'var(--text-muted)' }}>
                      {aiGenLoading ? (aiGenStep || 'Working…') : 'Complete'}
                    </span>
                  </div>
                  <span style={{ font: 'var(--text-xs)', color: 'var(--accent-deep)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {Math.round(aiGenProgress)}%
                  </span>
                </div>
                <div style={{ height: 6, background: 'var(--rose-deep)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${aiGenProgress}%`, background: 'var(--grad-coral)', borderRadius: 99 }} />
                </div>
                {!aiGenApproval && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4 }}>
                    {['Headshot', 'Bust Up', '¾ Left', '¾ Right', 'Full Body'].map((label, i) => (
                      <div key={i} style={{ textAlign: 'center', font: '500 0.6rem/1 var(--font-ui)', letterSpacing: '0.03em', textTransform: 'uppercase', color: aiGenImages[i] ? 'var(--accent-deep)' : 'var(--text-faint)', transition: 'color 0.4s ease' }}>
                        {label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Generated image preview */}
            {aiGenImages.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  {aiGenLocked ? 'Identity Locked' : aiGenApproval ? 'Headshot Preview' : `Reference Photos · ${aiGenImages.length}/5`}
                  {aiGenAnchor && !aiGenApproval && !aiGenLocked && <span style={{ color: 'var(--accent-deep)', marginLeft: 10 }}>● Face Lock Ready</span>}
                </div>
                {(aiGenApproval || aiGenLocked) ? (
                  // Approval / locked view — headshot centered with optional lock animation
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <style>{`
                      @keyframes ts-scan {
                        0%   { top: 0%; opacity: 1; }
                        100% { top: 100%; opacity: 0; }
                      }
                      @keyframes ts-lock-pop {
                        0%   { transform: translate(-50%,-50%) scale(0.4); opacity: 0; }
                        60%  { transform: translate(-50%,-50%) scale(1.15); opacity: 1; }
                        80%  { transform: translate(-50%,-50%) scale(0.95); }
                        100% { transform: translate(-50%,-50%) scale(1); opacity: 1; }
                      }
                      @keyframes ts-lock-ring {
                        0%   { transform: translate(-50%,-50%) scale(1); opacity: 0.7; }
                        100% { transform: translate(-50%,-50%) scale(2.2); opacity: 0; }
                      }
                      @keyframes ts-badge-in {
                        0%   { opacity: 0; transform: translateY(6px) scale(0.95); }
                        100% { opacity: 1; transform: translateY(0) scale(1); }
                      }
                      @keyframes ts-pulse-glow {
                        0%, 100% { box-shadow: 0 0 0 0 rgba(220,80,80,0.35); }
                        50%       { box-shadow: 0 0 0 8px rgba(220,80,80,0); }
                      }
                      @keyframes ts-corner-draw {
                        0%   { stroke-dashoffset: 60; }
                        100% { stroke-dashoffset: 0; }
                      }
                    `}</style>

                    <div style={{ width: '45%', position: 'relative' }}>
                      {/* Headshot */}
                      <div
                        onClick={() => !aiGenLocked && setLightboxSrc(aiGenImages[0])}
                        style={{
                          aspectRatio: '2/3',
                          borderRadius: 'var(--radius-lg)',
                          overflow: 'hidden',
                          border: aiGenLocked ? '2px solid var(--accent-deep)' : '2px solid var(--accent-deep)',
                          cursor: aiGenLocked ? 'default' : 'zoom-in',
                          position: 'relative',
                          animation: aiGenLocked ? 'ts-pulse-glow 2s ease-in-out infinite' : 'none',
                        }}
                      >
                        <img src={aiGenImages[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Headshot" />

                        {/* Scan line — plays once on lock */}
                        {aiGenLocked && (
                          <div style={{
                            position: 'absolute', left: 0, right: 0, height: 3,
                            background: 'linear-gradient(90deg, transparent, var(--accent-deep), transparent)',
                            top: 0,
                            animation: 'ts-scan 0.9s ease-in forwards',
                            animationDelay: '0.05s',
                            pointerEvents: 'none',
                          }} />
                        )}

                        {/* Corner brackets SVG overlay */}
                        {aiGenLocked && (
                          <svg viewBox="0 0 100 150" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                            {[['0,0','20,0','0,0','0,20'],['80,0','100,0','100,0','100,20'],['0,130','0,150','0,150','20,150'],['80,150','100,150','100,150','100,130']].map(([a,b,c,d], idx) => (
                              <polyline key={idx} points={`${a} ${b}`} fill="none" stroke="var(--accent-deep)" strokeWidth="3" strokeLinecap="round"
                                style={{ strokeDasharray: 60, strokeDashoffset: 60, animation: `ts-corner-draw 0.4s ease forwards`, animationDelay: `${0.2 + idx * 0.06}s` }} />
                            ))}
                            {[['0,0','0,20'],['80,0','100,0'],['0,130','0,150'],['100,130','100,150']].map(([a,b], idx) => (
                              <polyline key={`v${idx}`} points={`${a} ${b}`} fill="none" stroke="var(--accent-deep)" strokeWidth="3" strokeLinecap="round"
                                style={{ strokeDasharray: 60, strokeDashoffset: 60, animation: `ts-corner-draw 0.4s ease forwards`, animationDelay: `${0.22 + idx * 0.06}s` }} />
                            ))}
                          </svg>
                        )}

                        {/* Lock icon pop */}
                        {aiGenLocked && (
                          <>
                            <div style={{
                              position: 'absolute', top: '50%', left: '50%',
                              width: 56, height: 56, borderRadius: '50%',
                              background: 'var(--accent-deep)',
                              transform: 'translate(-50%,-50%)',
                              animation: 'ts-lock-ring 0.7s ease-out forwards',
                              animationDelay: '0.5s',
                              opacity: 0,
                              pointerEvents: 'none',
                            }} />
                            <div style={{
                              position: 'absolute', top: '50%', left: '50%',
                              width: 52, height: 52, borderRadius: '50%',
                              background: 'rgba(0,0,0,0.72)',
                              backdropFilter: 'blur(4px)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              animation: 'ts-lock-pop 0.5s cubic-bezier(.34,1.56,.64,1) forwards',
                              animationDelay: '0.45s',
                              opacity: 0,
                              pointerEvents: 'none',
                            }}>
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2"/>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                              </svg>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Identity locked badge */}
                    {aiGenLocked && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 7,
                        padding: '7px 14px', borderRadius: 99,
                        background: 'var(--rose-deep)',
                        border: '1px solid var(--accent-deep)',
                        animation: 'ts-badge-in 0.4s ease forwards',
                        animationDelay: '0.8s',
                        opacity: 0,
                      }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent-deep)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2"/>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                        <span style={{ font: '600 0.75rem/1 var(--font-ui)', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--accent-deep)' }}>
                          Identity Locked
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
                    {['Headshot', 'Bust Up', '¾ Left', '¾ Right', 'Full Body'].map((label, i) => (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <div
                          onClick={() => aiGenImages[i] && !aiGenImages[i].startsWith('ERROR:') && setLightboxSrc(aiGenImages[i])}
                          style={{ aspectRatio: '2/3', borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: 'var(--rose-glass)', border: '1px solid var(--border)', cursor: aiGenImages[i] ? 'zoom-in' : 'default' }}
                        >
                          {aiGenImages[i] && !aiGenImages[i].startsWith('ERROR:')
                            ? <img src={aiGenImages[i]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={label} />
                            : aiGenLoading && <div style={{ width: '100%', height: '100%', background: 'var(--grad-portrait)', opacity: 0.4 }} />
                          }
                        </div>
                        <div style={{ font: 'var(--text-xs)', color: 'var(--text-muted)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.65rem' }}>{label}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            {aiGenApproval && !aiGenLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ font: '600 0.85rem/1.4 var(--font-ui)', color: 'var(--text-strong)' }}>
                  Is this {aiGenName || 'your creator'}?
                </div>
                <div style={{ font: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                  Approve the headshot and we'll generate the full casting sheet. Not feeling it? Try again for a new face.
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <Button variant="primary" onClick={handleAiGenApprove}>
                    <Icon name="check" size={14} /> That's them — generate the rest
                  </Button>
                  <Button variant="secondary" onClick={handleAiGenerate}>
                    <Icon name="refresh-cw" size={14} /> Try again
                  </Button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {aiGenImages.length <= 1 ? (
                  <Button variant="primary" loading={aiGenLoading} onClick={handleAiGenerate} disabled={aiGenLoading}>
                    <Icon name="sparkles" size={15} style={aiGenLoading ? { animation: 'spin 1s linear infinite' } : {}} />
                    {aiGenLoading ? (aiGenStep || 'Generating…') : 'Generate Headshot'}
                  </Button>
                ) : (
                  <>
                    <Button variant="primary" loading={aiGenLoading} onClick={handleAiGenUse} disabled={aiGenLoading}>
                      <Icon name="user-check" size={15} />
                      Lock Identity
                    </Button>
                    <Button variant="secondary" onClick={handleSaveCreator} disabled={aiGenLoading}>
                      <Icon name="user-plus" size={14} /> Save Creator
                    </Button>
                    <Button variant="secondary" onClick={handleAiGenerate} disabled={aiGenLoading}>
                      <Icon name="refresh-cw" size={14} /> Start Over
                    </Button>
                  </>
                )}
                {selectedChar && (
                  <Button variant="secondary" onClick={() => setSelectedChar(null)}>
                    <Icon name="x" size={13} /> Clear Subject
                  </Button>
                )}
              </div>
            )}
          </div>
      </Card>

      {/* Prompt Builder */}
      <Card style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ font: '600 0.88rem/1 var(--font-ui)', color: 'var(--text-strong)', marginBottom: 4 }}>Prompt Builder</div>

        <textarea
          style={{ ...TEXTAREA, minHeight: 90 }}
          value={positivePrompt}
          onChange={e => setPositive(e.target.value)}
          placeholder="Describe your shot — subject, scene, style, energy…"
        />

        {/* Shot type + Vibe + Lighting pills */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <div style={{ ...LABEL, marginBottom: 8 }}>Shot Type</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {SHOT_TYPES.map(s => <Pill key={s} label={s} active={shotType === s} onClick={() => setShotType(shotType === s ? '' : s)} />)}
            </div>
          </div>
          <div>
            <div style={{ ...LABEL, marginBottom: 8 }}>Vibe</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {VIBES.map(v => <Pill key={v} label={v} active={vibe === v} onClick={() => setVibe(vibe === v ? '' : v)} />)}
            </div>
          </div>
          <div>
            <div style={{ ...LABEL, marginBottom: 8 }}>Lighting</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {LIGHTINGS.map(l => <Pill key={l} label={l} active={lighting === l} onClick={() => setLighting(lighting === l ? '' : l)} />)}
            </div>
          </div>
        </div>

        {/* Scene + Hair */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div>
            <div style={LABEL}>Scene / Location</div>
            <Select value={scene} onChange={setScene} options={LOCATIONS} />
          </div>
          <div>
            <div style={LABEL}>Hair Style</div>
            <Select value={hairStyle} onChange={setHairStyle} options={hairStyleOptions} />
          </div>
          <div>
            <div style={LABEL}>Hair Color</div>
            <Select value={hairColor} onChange={setHairColor} options={HAIR_COLORS} />
          </div>
        </div>

        {/* Outfit + Jewelry */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <div style={LABEL}>Outfit</div>
            <Select value={outfit} onChange={setOutfit} options={clothingOptions} />
          </div>
          <div>
            <div style={LABEL}>Jewelry & Accessories</div>
            <Select value={jewelry} onChange={setJewelry} options={jewelryOptions} />
          </div>
        </div>

        {/* Art direction */}
        <div>
          <div style={LABEL}>Art Direction / Vision</div>
          <textarea
            style={{ ...TEXTAREA, minHeight: 60 }}
            value={vision}
            onChange={e => setVision(e.target.value)}
            placeholder="Any specific direction, angle, or campaign brief notes…"
          />
        </div>
      </Card>

      {/* Generation Settings */}
      <Card style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ font: '600 0.88rem/1 var(--font-ui)', color: 'var(--text-strong)' }}>Generation Settings</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
          <div>
            <div style={LABEL}>Engine</div>
            <Select value={engine} onChange={setEngine} options={engineOptions} placeholder={engineOptions.length ? 'Select engine…' : 'Loading…'} />
          </div>
          <div>
            <div style={LABEL}>Performance</div>
            <Select value={perf} onChange={setPerf} options={PERF_OPTIONS} />
          </div>
          <div>
            <div style={LABEL}>Image Style</div>
            <Select value={style} onChange={setStyle} options={STYLE_OPTIONS} />
          </div>
          <div>
            <div style={LABEL}>Format</div>
            <Select value={format} onChange={setFormat} options={FORMAT_OPTIONS} />
          </div>
          <div>
            <div style={LABEL}>Quality</div>
            <Select value={quality} onChange={setQuality} options={QUALITY_OPTIONS} />
          </div>
        </div>

        <div>
          <div style={LABEL}>Negative Prompt</div>
          <textarea
            style={{ ...TEXTAREA, minHeight: 60 }}
            value={negativePrompt}
            onChange={e => setNegative(e.target.value)}
            placeholder="Describe what to avoid…"
          />
        </div>

        {error  && <p style={{ font: 'var(--text-sm)', color: 'var(--cherry)', margin: 0 }}>{error}</p>}
        {status && !error && <p style={{ font: 'var(--text-sm)', color: 'var(--text-muted)', margin: 0 }}>{status}</p>}

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Button variant="primary" loading={loading} onClick={handleGenerate} disabled={!engine} style={{ minWidth: 140 }}>
            <Icon name="sparkles" size={15} style={loading ? { animation: 'spin 1s linear infinite' } : {}} /> Generate
          </Button>
          <GenerationProgress
            active={loading}
            identityLocked={!!(selectedChar?.refImages?.length && engine?.toLowerCase().includes('openai'))}
            engine={engine}
            batchSize={1}
            style={{ flex: 1 }}
          />
        </div>
      </Card>

      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}

      {/* Output canvas */}
      {images.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
          {images.map((src, i) => (
            <ImageResult key={i} src={src} index={i} onOpen={setLightboxSrc} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{
              aspectRatio: aspectStyle,
              borderRadius: 'var(--radius-lg)',
              background: loading ? 'var(--grad-portrait)' : 'var(--rose-glass)',
              border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: loading ? 0.6 : 0.5,
              transition: 'opacity var(--t-base)',
            }}>
              {!loading && <Icon name="image" size={28} strokeWidth={1} style={{ color: 'var(--border-strong)' }} />}
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
