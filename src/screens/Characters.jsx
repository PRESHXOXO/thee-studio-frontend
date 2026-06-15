import React from 'react';
import { Button } from '../components/core/Button.jsx';
import { Card } from '../components/surfaces/Card.jsx';
import { Icon } from '../components/core/Icon.jsx';
import { analyzeCharacterImage, characterGenerate } from '../api/studio.js';

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
  { id: 'openai_image',         label: 'OpenAI',      icon: 'zap' },
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

const STANDARD_NEGATIVE = 'low resolution, blurry, plastic skin, waxy skin, over-smoothed face, AI beauty filter, uncanny face, distorted eyes, warped hands, extra fingers, broken anatomy, flat lighting, harsh flash, oversaturated colors, generic photo, artificial smile, overprocessed HDR, grainy, noisy';

function buildCharacterPrompt(char, sceneName, mood, identityLocked) {
  const f = char.fields || {};
  const parts = [];
  parts.push('Ultra-realistic 4K commercial lifestyle photography for a premium content creator brand.');
  if (identityLocked) {
    parts.push('IDENTITY LOCK ACTIVE: Preserve the exact physical appearance, hair, skin tone, and wardrobe of this specific creator. Do not generalize, alter, or reinterpret any of these traits.');
  }
  const talentParts = [f.face, f.tone].filter(Boolean).join('. ');
  if (talentParts) parts.push(`TALENT: ${talentParts}`);
  if (f.hair)        parts.push(`HAIR: ${f.hair}`);
  if (f.body)        parts.push(`BUILD: ${f.body}`);
  if (f.wardrobe)    parts.push(`WARDROBE: ${f.wardrobe}`);
  if (f.personality) parts.push(`ENERGY: ${f.personality}`);
  if (f.niche)       parts.push(`CONTENT CONTEXT: ${f.niche}`);
  if (sceneName)     parts.push(`SCENE: ${sceneName}`);
  if (mood)          parts.push(`MOOD: ${mood}`);
  parts.push('Photorealistic editorial photograph. Natural dimensional lighting. Professional commercial retouching. No AI artifacts. No distorted anatomy. Ultra-detailed 4K. Luxury campaign quality.');
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

function CreatorCard({ char, selected, onClick, onDelete }) {
  const [hovered, setHovered] = React.useState(false);
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
      {/* Portrait card */}
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
        {char.image
          ? <img src={char.image} alt={char.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)' }}>
              <Icon name="user" size={32} strokeWidth={1} />
            </div>
          )
        }
        {/* Delete button */}
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
        {/* Lock badge */}
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
      </div>
      {/* Name */}
      <div style={{
        font: '600 0.8125rem/1.2 var(--font-ui)',
        color: selected ? 'var(--accent-deep)' : 'var(--text-strong)',
        textAlign: 'center',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        width: '100%',
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
  const [quickScene, setQuickScene]   = React.useState('none');
  const [quickMood, setQuickMood]     = React.useState('Clean');
  const [quickEngine, setQuickEngine] = React.useState('openai_image');
  const [generating, setGenerating]   = React.useState(false);
  const [genImages, setGenImages]     = React.useState([]);
  const [genError, setGenError]       = React.useState('');
  const fileInputRef                = React.useRef(null);

  React.useEffect(() => {
    if (!onCharacterChange) return;
    const char = characters.find(c => c.id === activeId) || null;
    onCharacterChange(char);
  }, [activeId, characters]);

  React.useEffect(() => {
    if (!initialCharacter) return;
    const init = async () => {
      const compressed = initialCharacter.image
        ? await compressImage(initialCharacter.image)
        : null;
      const newEditing = {
        name: initialCharacter.name || 'New Creator',
        image: compressed,
        fields: Object.fromEntries(FIELD_DEFS.map(f => [f.id, ''])),
      };
      setEditing(newEditing);
      setActiveId(null);
      setAnalyzeError('');
      setSaveError('');
      if (initialCharacter.image) {
        runAnalysis(initialCharacter.image, newEditing);
      }
    };
    init();
  }, [initialCharacter]);

  const runAnalysis = async (imageDataUrl, currentEditing) => {
    setAnalyzing(true);
    setAnalyzeError('');
    try {
      const result = await analyzeCharacterImage(imageDataUrl);
      setEditing(ed => ({
        ...(ed || currentEditing),
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

  const active = activeId != null ? characters.find(c => c.id === activeId) : null;

  const handleToggleLock = () => {
    if (!activeId) return;
    const updated = characters.map(c => c.id === activeId ? { ...c, locked: !c.locked } : c);
    saveCharacters(updated);
    setCharacters(updated);
  };

  const handleQuickShoot = async () => {
    if (!active) return;
    const sceneName = quickScene === 'none' ? '' : QUICK_SCENES.find(s => s.id === quickScene)?.name || '';
    const positivePrompt = buildCharacterPrompt(active, sceneName, quickMood, !!active.locked);

    // If character has no image, fall back to Image Generator with text prompt
    if (!active.image) {
      onNav && onNav('images', { positivePrompt, negativePrompt: STANDARD_NEGATIVE });
      return;
    }

    // Character has an image — use reference generation inline
    setGenerating(true);
    setGenImages([]);
    setGenError('');
    try {
      const result = await characterGenerate({
        engineId: quickEngine,
        positivePrompt,
        negativePrompt: STANDARD_NEGATIVE,
        characterImage: active.image,
      });
      setGenImages(result.images || []);
    } catch (e) {
      setGenError(e.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleNew = () => {
    setEditing({ name: 'New Creator', image: null, fields: Object.fromEntries(FIELD_DEFS.map(f => [f.id, ''])) });
    setActiveId(null);
    setAnalyzeError('');
    setSaveError('');
  };

  const handleEdit = (char) => {
    setEditing({ name: char.name, image: char.image, fields: { ...char.fields } });
    setActiveId(char.id);
    setAnalyzeError('');
    setSaveError('');
  };

  const handleSave = () => {
    if (!editing) return;
    setSaveError('');
    const updated = activeId != null
      ? characters.map(c => c.id === activeId ? { ...c, ...editing } : c)
      : [...characters, { id: Date.now(), ...editing }];
    try {
      saveCharacters(updated);
    } catch {
      try {
        const slim = updated.map((c, i) => i < updated.length - 1 ? { ...c, image: null } : c);
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

  const handleDelete = (id) => {
    const updated = characters.filter(c => c.id !== id);
    saveCharacters(updated);
    setCharacters(updated);
    if (activeId === id) { setActiveId(null); setEditing(null); }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async ev => {
      const original = ev.target.result;
      const compressed = await compressImage(original);
      setEditing(ed => ({ ...ed, image: compressed }));
      runAnalysis(original, editing);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const displayChar = editing
    ? { name: editing.name, image: editing.image, fields: editing.fields }
    : active;

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
              title={active.locked ? 'Identity Locked — click to unlock' : 'Lock identity to protect this creator\'s traits'}
            >
              <Icon name="fingerprint" size={15} /> {active.locked ? 'Locked' : 'Lock Identity'}
            </Button>
          )}
          {!editing && active && <Button variant="secondary" onClick={() => handleEdit(active)}><Icon name="pencil" size={14} /> Edit</Button>}
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

      {/* Detail panel — portrait + identity fields */}
      {showPanel && (
        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 20, alignItems: 'start' }}>

          {/* Portrait */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div
              onClick={() => editing && fileInputRef.current?.click()}
              style={{ aspectRatio: '3/4', borderRadius: 'var(--radius-xl)', background: 'var(--grad-portrait)', boxShadow: 'var(--shadow-md)', overflow: 'hidden', cursor: editing ? 'pointer' : 'default', position: 'relative' }}
            >
              {displayChar?.image
                ? <img src={displayChar.image} alt="Creator" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
            {editing && editing.image && !analyzing && (
              <Button variant="secondary" onClick={() => runAnalysis(editing.image, editing)} style={{ width: '100%' }}>
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

      {/* Quick Shoot — shown when character selected and not editing */}
      {activeId != null && !editing && active && (
        <Card style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ ...LABEL, marginBottom: 2 }}>Quick Shoot</div>
              <div style={{ font: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                {active.image
                  ? 'Character portrait used as visual reference for generation.'
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

          {/* Engine picker */}
          <div>
            <div style={{ ...LABEL, marginBottom: 10 }}>Engine</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {QUICK_ENGINES.map(eng => {
                const isActive = quickEngine === eng.id;
                return (
                  <button key={eng.id} onClick={() => setQuickEngine(eng.id)} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '7px 13px', borderRadius: 'var(--radius-pill)', cursor: 'pointer',
                    border: `1.5px solid ${isActive ? 'var(--accent-deep)' : 'var(--border)'}`,
                    background: isActive ? 'var(--rose-deep)' : 'transparent',
                    color: isActive ? 'var(--accent-deep)' : 'var(--text-muted)',
                    font: '500 0.8125rem/1 var(--font-ui)', fontFamily: 'inherit',
                    transition: 'all var(--t-fast)',
                  }}>
                    <Icon name={eng.icon} size={13} strokeWidth={1.75} /> {eng.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scene picker */}
          <div>
            <div style={{ ...LABEL, marginBottom: 10 }}>Scene</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {QUICK_SCENES.map(sc => {
                const isActive = quickScene === sc.id;
                return (
                  <button
                    key={sc.id}
                    onClick={() => setQuickScene(sc.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '7px 13px', borderRadius: 'var(--radius-pill)', cursor: 'pointer',
                      border: `1.5px solid ${isActive ? 'var(--accent-deep)' : 'var(--border)'}`,
                      background: isActive ? 'var(--rose-deep)' : 'transparent',
                      color: isActive ? 'var(--accent-deep)' : 'var(--text-muted)',
                      font: '500 0.8125rem/1 var(--font-ui)', fontFamily: 'inherit',
                      transition: 'all var(--t-fast)',
                    }}
                  >
                    <Icon name={sc.icon} size={13} strokeWidth={1.75} />
                    {sc.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mood picker */}
          <div>
            <div style={{ ...LABEL, marginBottom: 10 }}>Mood</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {QUICK_MOODS.map(m => {
                const isActive = quickMood === m;
                return (
                  <button
                    key={m}
                    onClick={() => setQuickMood(m)}
                    style={{
                      padding: '7px 14px', borderRadius: 'var(--radius-pill)', cursor: 'pointer',
                      border: `1.5px solid ${isActive ? 'var(--accent-deep)' : 'var(--border)'}`,
                      background: isActive ? 'var(--rose-deep)' : 'transparent',
                      color: isActive ? 'var(--accent-deep)' : 'var(--text-muted)',
                      font: '500 0.8125rem/1 var(--font-ui)', fontFamily: 'inherit',
                      transition: 'all var(--t-fast)',
                    }}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Button variant="primary" onClick={handleQuickShoot} loading={generating} disabled={generating} style={{ alignSelf: 'flex-start' }}>
              <Icon name="zap" size={15} /> {generating ? 'Generating…' : 'Build + Generate'}
            </Button>
            {generating && (
              <span style={{ font: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                Using your portrait as visual reference…
              </span>
            )}
          </div>

          {/* Generation error */}
          {genError && (
            <p style={{ font: 'var(--text-sm)', color: 'var(--cherry)', margin: 0 }}>
              {genError}
            </p>
          )}

          {/* Generated results */}
          {genImages.length > 0 && (
            <div>
              <div style={{ ...LABEL, marginBottom: 12 }}>Result</div>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                {genImages.map((url, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 160 }}>
                    <div style={{ aspectRatio: '3/4', borderRadius: 'var(--radius-xl)', overflow: 'hidden', boxShadow: 'var(--shadow-md)' }}>
                      <img src={url} alt={`Generated ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <a href={url} download={`thee-studio-${Date.now()}.png`} target="_blank" rel="noreferrer" style={{ flex: 1 }}>
                        <Button variant="secondary" style={{ width: '100%', fontSize: '0.75rem' }}>
                          <Icon name="download" size={13} /> Save
                        </Button>
                      </a>
                      <Button variant="secondary" onClick={() => onNav && onNav('images', { positivePrompt: '', negativePrompt: '' })} style={{ fontSize: '0.75rem' }}>
                        <Icon name="external-link" size={13} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </Card>
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

      {/* Empty state */}
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
