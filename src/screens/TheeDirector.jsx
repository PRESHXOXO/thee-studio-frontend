import React from 'react';
import { Card } from '../components/surfaces/Card.jsx';
import { Field } from '../components/forms/Field.jsx';
import { Select } from '../components/forms/Select.jsx';
import { Input } from '../components/forms/Input.jsx';
import { Button } from '../components/core/Button.jsx';
import { PromptOutput } from '../components/feedback/PromptOutput.jsx';
import { GenerationProgress } from '../components/feedback/GenerationProgress.jsx';
import { Icon } from '../components/core/Icon.jsx';
import { buildDirectorOutputs, generateImage, characterGenerate, sanitizeForOpenAI, describeOutfitImage } from '../api/studio.js';
import { saveToLibrary } from '../lib/library.js';
import {
  LOCATIONS, GENDERS, SKIN_TONES, HAIR_COLORS,
  EYE_DETAILS, SPECIAL_FEATURES, STANDARD_NEGATIVE,
  buildStructuredVision, buildFluxVision,
  getPhysiqueOptions, getHairStyleOptions, getClothingOptions, getJewelryOptions,
} from '../lib/promptData.js';

const SHOT_TYPES = ['Portrait', 'Fashion', 'Lifestyle', 'Campaign', 'Cinematic', 'UGC'];
const ENERGIES   = ['Clean', 'Bold', 'Luxury', 'Candid', 'Cinematic', 'Raw', 'Soft', 'Romantic'];
const LIGHTINGS  = ['Natural', 'Golden Hour', 'Studio', 'Blue Hour', 'Night', 'Overcast'];

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
  const [lighting,     setLighting]     = React.useState('Natural');
  const [scene,        setScene]        = React.useState(initialScene);
  const [gender,       setGender]       = React.useState('Unspecified');
  const [physique,     setPhysique]     = React.useState('Unspecified');
  const [skinTone,     setSkinTone]     = React.useState('Unspecified');
  const [hairStyle,    setHairStyle]    = React.useState('Unspecified');
  const [hairColor,    setHairColor]    = React.useState('Unspecified');
  const [eyeDetail,    setEyeDetail]    = React.useState('Unspecified');
  const [jewelry,      setJewelry]      = React.useState('None');
  const [clothing,     setClothing]     = React.useState('Unspecified');
  const [features,     setFeatures]     = React.useState('None');

  const [buildMode,    setBuildMode]    = React.useState('openai');
  const [outfitOverride, setOutfitOverride] = React.useState('Unspecified');

  // Shoot-specific styling (active when character is selected)
  const [shootHairStyle,     setShootHairStyle]     = React.useState('Unspecified');
  const [shootHairColor,     setShootHairColor]     = React.useState('Unspecified');
  const [shootJewelry,       setShootJewelry]       = React.useState('None');
  const [outfitPhotoUrl,     setOutfitPhotoUrl]     = React.useState('');
  const [outfitPhotoDesc,    setOutfitPhotoDesc]    = React.useState('');
  const [outfitPhotoAnalyzing, setOutfitPhotoAnalyzing] = React.useState(false);
  const outfitFileRef = React.useRef(null);

  // Filtered options based on selected gender
  const physiqueOptions  = getPhysiqueOptions(gender);
  const hairStyleOptions = getHairStyleOptions(gender);
  const clothingOptions  = getClothingOptions(gender);
  const jewelryOptions   = getJewelryOptions(gender);

  const handleGenderChange = (newGender) => {
    const newPhysique   = getPhysiqueOptions(newGender).find(o => o.value === physique)    ? physique    : 'Unspecified';
    const newHairStyle  = getHairStyleOptions(newGender).find(o => o.value === hairStyle)  ? hairStyle   : 'Unspecified';
    const newClothing   = getClothingOptions(newGender).find(o => o.value === clothing)    ? clothing    : 'Unspecified';
    const newJewelry    = getJewelryOptions(newGender).find(o => o.value === jewelry)      ? jewelry     : 'None';
    const newShootHair  = getHairStyleOptions(newGender).find(o => o.value === shootHairStyle) ? shootHairStyle : 'Unspecified';
    const newShootJew   = getJewelryOptions(newGender).find(o => o.value === shootJewelry) ? shootJewelry : 'None';
    const newOutfit     = getClothingOptions(newGender).find(o => o.value === outfitOverride) ? outfitOverride : 'Unspecified';
    setGender(newGender);
    setPhysique(newPhysique);
    setHairStyle(newHairStyle);
    setClothing(newClothing);
    setJewelry(newJewelry);
    setShootHairStyle(newShootHair);
    setShootJewelry(newShootJew);
    setOutfitOverride(newOutfit);
  };

  const [loading,      setLoading]      = React.useState(false);
  const [error,        setError]        = React.useState('');
  const [outputs,      setOutputs]      = React.useState(null);

  const [generating,   setGenerating]   = React.useState(false);
  const [genImages,    setGenImages]    = React.useState([]);
  const [genError,     setGenError]     = React.useState('');

  const [history,      setHistory]      = React.useState(loadHistory);

  const [showSaveChar, setShowSaveChar] = React.useState(false);
  const [saveCharName, setSaveCharName] = React.useState('');

  const selectedChar = characters.find(c => c.id === selectedCharId) || null;

  // Collect current form params
  const formParams = () => ({
    vision: [vision, lighting !== 'Natural' ? `${lighting} lighting` : ''].filter(Boolean).join('. '),
    gender, physique, skinTone, hairStyle, hairColor,
    eyeDetail, jewelry,
    clothing: selectedChar && outfitOverride !== 'Unspecified' ? outfitOverride : clothing,
    features, mood, contentType, scene,
    character: selectedChar,
    niche: selectedChar?.fields?.niche || '',
    // Shoot-specific overrides (only applied when character selected)
    shootHairStyle: selectedChar ? shootHairStyle : 'Unspecified',
    shootHairColor: selectedChar ? shootHairColor : 'Unspecified',
    shootJewelry:   selectedChar ? shootJewelry   : 'None',
    outfitPhotoDesc: selectedChar ? outfitPhotoDesc : '',
  });

  const handleOutfitPhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;
      setOutfitPhotoUrl(dataUrl);
      setOutfitPhotoDesc('');
      setOutfitOverride('Unspecified'); // clear dropdown when photo used
      setOutfitPhotoAnalyzing(true);
      try {
        const desc = await describeOutfitImage(dataUrl);
        setOutfitPhotoDesc(desc);
      } catch (err) {
        setOutfitPhotoDesc('⚠ Could not analyze outfit — check your OpenAI key or try a clearer photo.');
      } finally {
        setOutfitPhotoAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const clearOutfitPhoto = () => {
    setOutfitPhotoUrl('');
    setOutfitPhotoDesc('');
  };

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
        reason: 'Structured format optimized for OpenAI gpt-image-2.',
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
      const engineId = ENGINE_ID_MAP[outputs.recommendedEngine] || 'openai_image';
      const isOpenAI = engineId === 'openai_image' || (outputs.recommendedEngine || '').toLowerCase().includes('openai');
      const positivePrompt = isOpenAI ? sanitizeForOpenAI(outputs.positivePrompt) : outputs.positivePrompt;

      if (charImg) {
        const result = await characterGenerate({
          engineId,
          positivePrompt,
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
        const result = await generateImage({
          engine: outputs.recommendedEngine,
          positivePrompt,
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

  const handleSaveCharacter = () => {
    const name = saveCharName.trim();
    if (!name) return;
    const hairParts = [
      hairStyle !== 'Unspecified' ? hairStyle : '',
      hairColor !== 'Unspecified' ? `in ${hairColor}` : '',
    ].filter(Boolean);
    const faceParts = [
      eyeDetail !== 'Unspecified' ? eyeDetail : '',
      features !== 'None' ? features : '',
    ].filter(Boolean);
    const newChar = {
      id: Date.now().toString(),
      name,
      refImages: [],
      fields: {
        tone:        skinTone !== 'Unspecified' ? skinTone : '',
        hair:        hairParts.join(', '),
        face:        faceParts.join(', '),
        body:        '',
        personality: vision || '',
        wardrobe:    clothing !== 'Unspecified' ? clothing : (outfitOverride !== 'Unspecified' ? outfitOverride : ''),
        niche:       '',
      },
      // Preserve full shoot context so it can be reloaded
      savedVision:      vision || '',
      savedMood:        mood,
      savedScene:       scene,
      savedContentType: contentType,
      savedShootHair:   shootHairStyle !== 'Unspecified' ? shootHairStyle : '',
      savedShootHairColor: shootHairColor !== 'Unspecified' ? shootHairColor : '',
      savedShootJewelry:   shootJewelry !== 'None' ? shootJewelry : '',
      savedOutfitOverride: outfitOverride !== 'Unspecified' ? outfitOverride : '',
      savedOutfitPhotoDesc: outfitPhotoDesc || '',
    };
    try {
      const existing = JSON.parse(localStorage.getItem('ts_characters') || '[]');
      existing.push(newChar);
      localStorage.setItem('ts_characters', JSON.stringify(existing));
    } catch {}
    setSaveCharName('');
    setShowSaveChar(false);
    onNav && onNav('characters');
  };

  // Fields locked per-character: Gender, Skin Tone, Eye Detail, Body Build
  const identityLocked = !!selectedChar;
  const LOCKED_STYLE = { opacity: 0.45, pointerEvents: 'none' };

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

      {/* Subject Details */}
      <Card style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={LABEL}>Subject Details</h3>
          {identityLocked && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, font: 'var(--text-xs)', color: 'var(--accent-deep)', background: 'var(--rose-deep)', padding: '3px 8px', borderRadius: 'var(--radius-pill)' }}>
              <Icon name="lock" size={11} /> Identity locked · {selectedChar.name}
            </span>
          )}
        </div>

        {/* Locked: Gender + Skin Tone */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={identityLocked ? LOCKED_STYLE : {}}>
            <Field label="Gender"><Select value={gender} onChange={handleGenderChange} options={GENDERS} /></Field>
          </div>
          <div style={identityLocked ? LOCKED_STYLE : {}}>
            <Field label="Skin Tone"><Select value={skinTone} onChange={setSkinTone} options={SKIN_TONES} placeholder="Select…" /></Field>
          </div>
        </div>

        {/* Locked: Body Build + Eyes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={identityLocked ? LOCKED_STYLE : {}}>
            <Field label="Body Type / Build"><Select value={physique} onChange={setPhysique} options={physiqueOptions} placeholder="Select…" /></Field>
          </div>
          <div style={identityLocked ? LOCKED_STYLE : {}}>
            <Field label="Eyes"><Select value={eyeDetail} onChange={setEyeDetail} options={EYE_DETAILS} placeholder="Select…" /></Field>
          </div>
        </div>

        {!identityLocked && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Hair Style"><Select value={hairStyle} onChange={setHairStyle} options={hairStyleOptions} placeholder="Select…" /></Field>
              <Field label="Hair Color"><Select value={hairColor} onChange={setHairColor} options={HAIR_COLORS} placeholder="Select…" /></Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Jewelry"><Select value={jewelry} onChange={setJewelry} options={jewelryOptions} /></Field>
              <Field label="Special Features"><Select value={features} onChange={setFeatures} options={SPECIAL_FEATURES} /></Field>
            </div>
            <Field label="Clothing / Brand Vibe"><Select value={clothing} onChange={setClothing} options={clothingOptions} placeholder="Select…" /></Field>
          </>
        )}

        {/* Shoot Styling overrides — only when character selected */}
        {selectedChar && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={LABEL}>Shoot Styling</div>
              <span style={{ font: 'var(--text-xs)', color: 'var(--accent-deep)', background: 'var(--rose-deep)', padding: '2px 7px', borderRadius: 'var(--radius-pill)' }}>
                overrides {selectedChar.name}'s defaults
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Hair Style">
                <Select value={shootHairStyle} onChange={setShootHairStyle} options={hairStyleOptions} placeholder="Keep default…" />
              </Field>
              <Field label="Hair Color">
                <Select value={shootHairColor} onChange={setShootHairColor} options={HAIR_COLORS} placeholder="Keep default…" />
              </Field>
            </div>
            <Field label="Jewelry">
              <Select value={shootJewelry} onChange={setShootJewelry} options={jewelryOptions} />
            </Field>
            <input ref={outfitFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleOutfitPhotoUpload} />
            {outfitPhotoUrl ? (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <img src={outfitPhotoUrl} alt="Outfit" style={{ width: 52, height: 70, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }} />
                  <button onClick={clearOutfitPhoto} style={{ position: 'absolute', top: -5, right: -5, width: 18, height: 18, borderRadius: '50%', background: 'var(--cherry)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>✕</button>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {outfitPhotoAnalyzing ? (
                    <p style={{ font: 'var(--text-xs)', color: 'var(--text-muted)', margin: 0 }}>Analyzing outfit…</p>
                  ) : outfitPhotoDesc ? (
                    <div style={{ padding: '8px 10px', background: 'var(--rose-glass)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                      <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--accent-deep)', marginBottom: 4 }}>Outfit Detected</div>
                      <p style={{ font: 'var(--text-xs)', color: 'var(--text-body)', margin: 0, lineHeight: 1.5 }}>{outfitPhotoDesc}</p>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <button
                onClick={() => outfitFileRef.current?.click()}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '8px 12px', borderRadius: 'var(--radius-md)',
                  border: '1.5px dashed var(--border)', background: 'transparent',
                  color: 'var(--text-muted)', cursor: 'pointer',
                  font: '500 0.8rem/1 var(--font-ui)', fontFamily: 'inherit',
                  width: '100%', justifyContent: 'center',
                }}
              >
                <Icon name="upload" size={13} /> Upload Outfit Photo
              </button>
            )}
          </div>
        )}
      </Card>

      {/* Direction Controls */}
      <Card style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <h3 style={LABEL}>Direction Controls</h3>

        <Field label="Vision" hint="Set the creative direction in your own words.">
          <textarea
            value={vision}
            onChange={e => setVision(e.target.value)}
            placeholder="e.g. Rooftop golden hour, quiet confidence, aspirational street energy…"
            rows={3}
            style={{
              width: '100%', boxSizing: 'border-box', resize: 'vertical',
              padding: '9px 12px', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)', background: 'var(--surface)',
              color: 'var(--text-strong)', font: 'var(--text-sm)',
              fontFamily: 'inherit', lineHeight: 1.5, outline: 'none',
            }}
          />
        </Field>

        <div>
          <div style={{ ...LABEL, marginBottom: 10 }}>Shot Type</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {SHOT_TYPES.map(s => (
              <button key={s} onClick={() => setContentType(s)} style={{
                padding: '6px 13px', borderRadius: 'var(--radius-pill)',
                border: `1.5px solid ${contentType === s ? 'var(--accent-deep)' : 'var(--border)'}`,
                background: contentType === s ? 'var(--rose-deep)' : 'transparent',
                color: contentType === s ? 'var(--accent-deep)' : 'var(--text-muted)',
                font: '500 0.78rem/1 var(--font-ui)', cursor: 'pointer',
                transition: 'all var(--t-fast)',
              }}>{s}</button>
            ))}
          </div>
        </div>

        <div>
          <div style={{ ...LABEL, marginBottom: 10 }}>Energy</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {ENERGIES.map(e => (
              <button key={e} onClick={() => setMood(e)} style={{
                padding: '6px 13px', borderRadius: 'var(--radius-pill)',
                border: `1.5px solid ${mood === e ? 'var(--accent-deep)' : 'var(--border)'}`,
                background: mood === e ? 'var(--rose-deep)' : 'transparent',
                color: mood === e ? 'var(--accent-deep)' : 'var(--text-muted)',
                font: '500 0.78rem/1 var(--font-ui)', cursor: 'pointer',
                transition: 'all var(--t-fast)',
              }}>{e}</button>
            ))}
          </div>
        </div>

        <div>
          <div style={{ ...LABEL, marginBottom: 10 }}>Lighting</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {LIGHTINGS.map(l => (
              <button key={l} onClick={() => setLighting(l)} style={{
                padding: '6px 13px', borderRadius: 'var(--radius-pill)',
                border: `1.5px solid ${lighting === l ? 'var(--accent-deep)' : 'var(--border)'}`,
                background: lighting === l ? 'var(--rose-deep)' : 'transparent',
                color: lighting === l ? 'var(--accent-deep)' : 'var(--text-muted)',
                font: '500 0.78rem/1 var(--font-ui)', cursor: 'pointer',
                transition: 'all var(--t-fast)',
              }}>{l}</button>
            ))}
          </div>
        </div>

        <Field label="Scene">
          <Select value={scene} onChange={setScene} options={LOCATIONS} />
        </Field>

        <div>
          <div style={{ ...LABEL, marginBottom: 10 }}>Build Mode</div>
          <PillToggle options={BUILD_MODES} value={buildMode} onChange={setBuildMode} />
        </div>

        {error && <p style={{ font: 'var(--text-sm)', color: 'var(--cherry)', margin: 0 }}>{error}</p>}

        <Button variant="primary" loading={loading} onClick={handleBuild} style={{ width: '100%' }}>
          <Icon name={BUILD_MODES.find(m => m.id === buildMode)?.icon || 'zap'} size={15} />
          {loading ? 'Building…' : 'Build Direction'}
        </Button>

        {outputs?.positivePrompt && (
          <Button
            variant="secondary"
            onClick={() => onNav && onNav('images', { positivePrompt: outputs.positivePrompt, negativePrompt: outputs.negativePrompt })}
            style={{ width: '100%' }}
          >
            <Icon name="external-link" size={14} /> Open in Generator
          </Button>
        )}
      </Card>

      {/* Build Prompt + Generate */}
      <Card style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h3 style={LABEL}>Build Prompt</h3>

        <PromptOutput
          label="Positive Prompt"
          value={outputs?.positivePrompt}
          placeholder="Your positive prompt will appear here after building."
          maxHeight={200}
        />
        <PromptOutput
          label="Negative Prompt"
          value={outputs?.negativePrompt}
          placeholder="Your negative prompt will appear here after building."
          maxHeight={100}
        />

        {outputs?.recommendedEngine && (
          <div style={{ padding: '10px 14px', background: 'var(--rose-glass)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>Recommended Engine</div>
            <div style={{ font: '600 0.9375rem/1.4 var(--font-ui)', color: 'var(--text-strong)' }}>{outputs.recommendedEngine}</div>
            {outputs.reason && <div style={{ font: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 4 }}>{outputs.reason}</div>}
          </div>
        )}

        {outputs?.positivePrompt && (
          <>
            <Button variant="primary" loading={generating} onClick={handleGenerate} style={{ width: '100%' }}>
              <Icon name="sparkles" size={15} />
              {generating ? 'Generating…' : selectedChar && getCharacterImage(selectedChar) ? `Generate as ${selectedChar.name}` : 'Generate Here'}
            </Button>
            <GenerationProgress
              active={generating}
              identityLocked={!!(selectedChar?.locked && getCharacterImage(selectedChar))}
              engine={outputs?.recommendedEngine || ''}
              batchSize={1}
            />
          </>
        )}

        {outputs?.positivePrompt && !selectedChar && (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            {!showSaveChar ? (
              <Button variant="secondary" onClick={() => setShowSaveChar(true)} style={{ width: '100%' }}>
                <Icon name="user-plus" size={14} /> Save as Creator
              </Button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Name this Creator</div>
                <input
                  autoFocus
                  value={saveCharName}
                  onChange={e => setSaveCharName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveCharacter(); if (e.key === 'Escape') setShowSaveChar(false); }}
                  placeholder="e.g. Angel, Maya, Jade…"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '9px 12px', borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)', background: 'var(--input-bg, #fff)',
                    font: 'var(--text-sm)', color: 'var(--text-body)',
                    outline: 'none', fontFamily: 'inherit',
                  }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button variant="primary" onClick={handleSaveCharacter} disabled={!saveCharName.trim()} style={{ flex: 1 }}>
                    <Icon name="user-check" size={13} /> Save & Go to Characters
                  </Button>
                  <Button variant="secondary" onClick={() => { setShowSaveChar(false); setSaveCharName(''); }}>
                    <Icon name="x" size={13} />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {genError && <p style={{ font: 'var(--text-sm)', color: 'var(--cherry)', margin: 0 }}>{genError}</p>}
      </Card>

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
