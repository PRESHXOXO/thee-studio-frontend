import React from 'react';
import { Card } from '../surfaces/Card.jsx';
import { Button } from '../core/Button.jsx';
import { Icon } from '../core/Icon.jsx';
import { GenerationProgress } from '../feedback/GenerationProgress.jsx';
import { ImageLightbox } from '../feedback/ImageLightbox.jsx';
import { Select } from '../forms/Select.jsx';
import { characterGenerate, generateImage, describeOutfitImage } from '../../api/studio.js';
import { buildCharacterPrompt } from '../../lib/characterPrompt.js';
import { saveToLibrary } from '../../lib/library.js';
import { compressImage } from '../../lib/imageUtils.js';
import { creatorMemoryPrompt, getCreatorMemory } from '../../lib/creatorMemory.js';
import {
  SHOOT_ENGINES, PORTRAIT_ANGLES, BATCH_OPTIONS, SHOOT_MOODS, SHOOT_LIGHTINGS, SHOOT_OUTFITS,
} from '../../lib/shootOptions.js';
import {
  LOCATIONS, GENDERS, SKIN_TONES, HAIR_COLORS, EYE_DETAILS, SPECIAL_FEATURES, STANDARD_NEGATIVE,
  buildStructuredVision, getPhysiqueOptions, getHairStyleOptions, getClothingOptions, getJewelryOptions,
} from '../../lib/promptData.js';

const LABEL = { font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 };

function PillButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className="ts-pill"
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '7px 13px', borderRadius: 'var(--radius-pill)', cursor: 'pointer',
        border: `1.5px solid ${active ? 'var(--accent-deep)' : 'var(--border)'}`,
        background: active ? 'var(--rose-deep)' : 'transparent',
        color: active ? 'var(--accent-deep)' : 'var(--text-muted)',
        font: '500 0.8125rem/1 var(--font-ui)', fontFamily: 'inherit',
      }}
    >
      {children}
    </button>
  );
}

function getAllImages(char) {
  if (!char) return [];
  if (char.refImages?.length) return char.refImages;
  if (char.image) return [char.image];
  return [];
}

// Shared shoot form + generate pipeline — used embedded on the Characters
// page (Quick Shoot, always has a creator, layout="stacked") and standalone
// inside the unified Director screen's Guided tab (may run without a
// creator via the raw-attribute escape hatch, when allowNoCreator is true;
// layout="split" for a docked-controls + persistent-canvas arrangement).
export function ShootBuilder({
  creator,
  allowNoCreator = false,
  onGenerated,
  onSaveAsCreator,
  initialScene = 'None',
  initialNotes = '',
  initialSettings = null,
  campaignId = null,
  layout = 'stacked',
}) {
  const restored = initialSettings?.workflow === 'guided' ? initialSettings : {};
  const [identityMode, setIdentityMode] = React.useState(restored.identityMode || 'lifestyle'); // 'portrait' | 'lifestyle'
  const [quickAngle, setQuickAngle]     = React.useState(restored.quickAngle || 'front-facing');
  const [scene, setScene]               = React.useState(restored.scene || initialScene);
  const [outfit, setOutfit]             = React.useState(restored.outfit || 'default');
  const [mood, setMood]                 = React.useState(restored.mood || 'Clean');
  const [lighting, setLighting]         = React.useState(restored.lighting || 'Natural');
  const [notes, setNotes]               = React.useState(restored.notes ?? initialNotes);
  const [engine, setEngine]             = React.useState(restored.engine || 'openai_image');
  const [batchSize, setBatchSize]       = React.useState(restored.batchSize || 1);
  const [activeRef, setActiveRef]       = React.useState(restored.activeRef || 0);

  // Outfit photo upload — analyzed description overrides the outfit pill.
  const [outfitPhotoUrl, setOutfitPhotoUrl] = React.useState('');
  const [outfitPhotoDesc, setOutfitPhotoDesc] = React.useState(restored.outfitPhotoDesc || '');
  const [outfitPhotoAnalyzing, setOutfitPhotoAnalyzing] = React.useState(false);
  const outfitFileRef = React.useRef(null);

  // Raw-attribute escape hatch (no creator) — only rendered when allowNoCreator.
  const [rawGender, setRawGender]     = React.useState(restored.rawGender || 'Unspecified');
  const [rawPhysique, setRawPhysique] = React.useState(restored.rawPhysique || 'Unspecified');
  const [rawSkinTone, setRawSkinTone] = React.useState(restored.rawSkinTone || 'Unspecified');
  const [rawHairStyle, setRawHairStyle] = React.useState(restored.rawHairStyle || 'Unspecified');
  const [rawHairColor, setRawHairColor] = React.useState(restored.rawHairColor || 'Unspecified');
  const [rawEyeDetail, setRawEyeDetail] = React.useState(restored.rawEyeDetail || 'Unspecified');
  const [rawJewelry, setRawJewelry]   = React.useState(restored.rawJewelry || 'None');
  const [rawClothing, setRawClothing] = React.useState(restored.rawClothing || 'Unspecified');
  const [rawFeatures, setRawFeatures] = React.useState(restored.rawFeatures || 'None');

  const [generating, setGenerating] = React.useState(false);
  const [genImages, setGenImages]   = React.useState([]);
  const [genError, setGenError]     = React.useState('');
  const [lightboxSrc, setLightboxSrc] = React.useState(null);
  const [anchorSaved, setAnchorSaved] = React.useState(false);

  const allImages = getAllImages(creator);

  const creatorIdRef = React.useRef(creator?.id ?? null);

  // Reset per-shot media when the user changes creator after mount. Do not
  // wipe a History re-run's restored reference index on the initial render.
  React.useEffect(() => {
    const nextCreatorId = creator?.id ?? null;
    if (creatorIdRef.current === nextCreatorId) return;
    creatorIdRef.current = nextCreatorId;
    setActiveRef(0); setGenImages([]); setGenError('');
    setOutfitPhotoUrl(''); setOutfitPhotoDesc('');
  }, [creator?.id]);

  const rawPhysiqueOptions  = getPhysiqueOptions(rawGender);
  const rawHairStyleOptions = getHairStyleOptions(rawGender);
  const rawClothingOptions  = getClothingOptions(rawGender);
  const rawJewelryOptions   = getJewelryOptions(rawGender);

  const handleRawGenderChange = (g) => {
    setRawGender(g);
    setRawPhysique(getPhysiqueOptions(g).find(o => o.value === rawPhysique) ? rawPhysique : 'Unspecified');
    setRawHairStyle(getHairStyleOptions(g).find(o => o.value === rawHairStyle) ? rawHairStyle : 'Unspecified');
    setRawClothing(getClothingOptions(g).find(o => o.value === rawClothing) ? rawClothing : 'Unspecified');
    setRawJewelry(getJewelryOptions(g).find(o => o.value === rawJewelry) ? rawJewelry : 'None');
  };

  const handleOutfitPhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;
      setOutfitPhotoUrl(dataUrl);
      setOutfitPhotoDesc('');
      setOutfit('default');
      setOutfitPhotoAnalyzing(true);
      try {
        const desc = await describeOutfitImage(dataUrl);
        setOutfitPhotoDesc(desc);
      } catch {
        setOutfitPhotoDesc('');
      } finally {
        setOutfitPhotoAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const clearOutfitPhoto = () => { setOutfitPhotoUrl(''); setOutfitPhotoDesc(''); };

  // Lighting/notes don't have dedicated slots in buildCharacterPrompt's
  // fixed template — folded into the mood argument and appended as a
  // trailing paragraph respectively, additive only, template untouched.
  const composedMood = [mood, lighting !== 'Natural' && `${lighting} lighting`].filter(Boolean).join(' — ');

  const snapshotSettings = () => ({
    version: 1,
    workflow: 'guided',
    identityMode,
    quickAngle,
    scene,
    outfit,
    mood,
    lighting,
    notes,
    engine,
    batchSize,
    activeRef,
    outfitPhotoDesc,
    rawGender,
    rawPhysique,
    rawSkinTone,
    rawHairStyle,
    rawHairColor,
    rawEyeDetail,
    rawJewelry,
    rawClothing,
    rawFeatures,
  });

  const handleGenerate = async () => {
    setGenerating(true);
    setGenImages([]);
    setGenError('');
    try {
      let images = [];

      if (creator) {
        if (creator.locked && !allImages.length) {
          throw new Error('Identity lock is on but this creator has no reference images. Add one first.');
        }
        const outfitOverride = outfitPhotoDesc
          || SHOOT_OUTFITS.find(o => o.id === outfit)?.prompt
          || null;
        const outfitOrAngle = identityMode === 'portrait' ? quickAngle : outfitOverride;
        const sceneName = scene === 'None' ? '' : scene;
        let positivePrompt = buildCharacterPrompt(creator, sceneName, composedMood, !!creator.locked, outfitOrAngle, identityMode);
        const memory = getCreatorMemory(creator.id);
        const memoryBlock = creatorMemoryPrompt(memory);
        if (memoryBlock) positivePrompt += `\n\n${memoryBlock}`;
        if (notes.trim()) positivePrompt += `\n\nDIRECTOR'S NOTES:\n${notes.trim()}`;

        if (allImages.length) {
          const result = await characterGenerate({
            engineId: engine,
            positivePrompt,
            negativePrompt: STANDARD_NEGATIVE,
            characterImage: allImages[activeRef] || allImages[0],
            anchorImages: allImages,
            mode: identityMode,
            batchSize,
          });
          images = result.images || [];
        } else {
          // No reference photo — nothing to identity-lock against, but the
          // built prompt is still a valid text-to-image prompt.
          const result = await generateImage({
            engine: 'OpenAI Image',
            positivePrompt,
            negativePrompt: STANDARD_NEGATIVE,
            imageSize: 'Vertical 9:16',
            quality: 'High',
            performanceMode: 'Balanced',
            imageStyle: 'Lifestyle Creator',
          });
          images = result.images || [];
        }
        images.forEach(url => saveToLibrary(url, {
          source: 'quick_shoot', character: creator.id, engine, scene: sceneName || undefined,
          prompt: positivePrompt, mood: composedMood, mode: identityMode,
          campaign: campaignId || undefined,
          settings: snapshotSettings(),
          memoryVersion: memory.version,
        }).catch(() => {}));
      } else {
        if (!allowNoCreator) throw new Error('No creator selected.');
        let positivePrompt = buildStructuredVision({
          vision: notes,
          gender: rawGender, physique: rawPhysique, skinTone: rawSkinTone,
          hairStyle: rawHairStyle, hairColor: rawHairColor, eyeDetail: rawEyeDetail,
          jewelry: rawJewelry, clothing: rawClothing, features: rawFeatures,
          mood: composedMood, contentType: identityMode === 'portrait' ? 'Portrait' : 'Lifestyle',
          scene,
        });
        const result = await generateImage({
          engine: 'OpenAI Image',
          positivePrompt,
          negativePrompt: STANDARD_NEGATIVE,
          imageSize: 'Vertical 9:16',
          quality: 'High',
          performanceMode: 'Balanced',
          imageStyle: 'Lifestyle Creator',
        });
        images = result.images || [];
        images.forEach(url => saveToLibrary(url, {
          source: 'director', engine: 'OpenAI Image', scene: scene !== 'None' ? scene : undefined,
          prompt: positivePrompt,
          campaign: campaignId || undefined,
          settings: snapshotSettings(),
        }).catch(() => {}));
      }

      setGenImages(images);
      onGenerated?.(images);
    } catch (e) {
      setGenError(e.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveAsAnchor = async (url) => {
    if (!creator || !onSaveAsCreator) return;
    try {
      let src = url;
      if (!url.startsWith('data:')) {
        const res = await fetch(url);
        const blob = await res.blob();
        src = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
      }
      const compressed = await compressImage(src);
      onSaveAsCreator(compressed);
      setAnchorSaved(true);
      setTimeout(() => setAnchorSaved(false), 2000);
    } catch (e) {
      console.warn('Save as anchor failed:', e);
    }
  };

  // --- Controls: everything the user dials in before generating ---
  const controlsJSX = (
    <>
      {creator && allImages.length > 1 && (
        <div>
          <div style={{ ...LABEL, marginBottom: 10 }}>Reference Photo</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {allImages.map((img, i) => (
              <button
                key={i}
                onClick={() => setActiveRef(i)}
                aria-pressed={activeRef === i}
                aria-label={`Use reference ${i + 1}`}
                style={{
                  width: 52, height: 69, borderRadius: 8, overflow: 'hidden', cursor: 'pointer', padding: 0,
                  border: `2px solid ${activeRef === i ? 'var(--accent-deep)' : 'var(--border)'}`,
                  boxShadow: activeRef === i ? 'var(--depth-media-active)' : 'var(--depth-media-rest)',
                  background: 'none', flexShrink: 0, transition: 'box-shadow var(--t-fast), border-color var(--t-fast)',
                }}
              >
                <img src={img} alt={`Ref ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </button>
            ))}
          </div>
        </div>
      )}

      {!creator && allowNoCreator && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><div style={LABEL}>Gender</div><Select value={rawGender} onChange={handleRawGenderChange} options={GENDERS} /></div>
            <div><div style={LABEL}>Skin Tone</div><Select value={rawSkinTone} onChange={setRawSkinTone} options={SKIN_TONES} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><div style={LABEL}>Body Build</div><Select value={rawPhysique} onChange={setRawPhysique} options={rawPhysiqueOptions} /></div>
            <div><div style={LABEL}>Eyes</div><Select value={rawEyeDetail} onChange={setRawEyeDetail} options={EYE_DETAILS} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><div style={LABEL}>Hair Style</div><Select value={rawHairStyle} onChange={setRawHairStyle} options={rawHairStyleOptions} /></div>
            <div><div style={LABEL}>Hair Color</div><Select value={rawHairColor} onChange={setRawHairColor} options={HAIR_COLORS} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><div style={LABEL}>Jewelry</div><Select value={rawJewelry} onChange={setRawJewelry} options={rawJewelryOptions} /></div>
            <div><div style={LABEL}>Special Features</div><Select value={rawFeatures} onChange={setRawFeatures} options={SPECIAL_FEATURES} /></div>
          </div>
          <div><div style={LABEL}>Clothing / Brand Vibe</div><Select value={rawClothing} onChange={setRawClothing} options={rawClothingOptions} /></div>
        </>
      )}

      <div>
        <div style={{ ...LABEL, marginBottom: 10 }}>Engine</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {SHOOT_ENGINES.map(eng => (
            <PillButton key={eng.id} active={engine === eng.id} onClick={() => setEngine(eng.id)}>
              <Icon name={eng.icon} size={13} strokeWidth={1.75} /> {eng.label}
            </PillButton>
          ))}
        </div>
      </div>

      <div>
        <div style={{ ...LABEL, marginBottom: 10 }}>Mode</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <PillButton active={identityMode === 'portrait'} onClick={() => setIdentityMode('portrait')}>
            <Icon name="user" size={13} strokeWidth={1.75} /> Portrait Anchor
          </PillButton>
          <PillButton active={identityMode === 'lifestyle'} onClick={() => setIdentityMode('lifestyle')}>
            <Icon name="layout" size={13} strokeWidth={1.75} /> Lifestyle Scene
          </PillButton>
        </div>
      </div>

      {identityMode === 'portrait' ? (
        <div>
          <div style={{ ...LABEL, marginBottom: 10 }}>Camera Angle</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {PORTRAIT_ANGLES.map(angle => (
              <PillButton key={angle} active={quickAngle === angle} onClick={() => setQuickAngle(angle)}>{angle}</PillButton>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div>
            <div style={LABEL}>Scene</div>
            <Select value={scene} onChange={setScene} options={LOCATIONS} />
          </div>

          <div>
            <div style={{ ...LABEL, marginBottom: 10 }}>
              Outfit for this shot
              {outfit !== 'default' && !outfitPhotoUrl && (
                <button onClick={() => setOutfit('default')} style={{ marginLeft: 10, font: '500 0.72rem/1 var(--font-ui)', color: 'var(--text-faint)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>reset</button>
              )}
            </div>
            {outfitPhotoUrl ? (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <img src={outfitPhotoUrl} alt="Outfit" style={{ width: 52, height: 70, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }} />
                  <button onClick={clearOutfitPhoto} style={{ position: 'absolute', top: -5, right: -5, width: 18, height: 18, borderRadius: '50%', background: 'var(--cherry)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10, padding: 0 }}>✕</button>
                </div>
                <div style={{ flex: 1, font: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {outfitPhotoAnalyzing ? 'Analyzing outfit…' : (outfitPhotoDesc || 'Could not analyze — pick an outfit pill instead.')}
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                  {SHOOT_OUTFITS.map(o => (
                    <PillButton key={o.id} active={outfit === o.id} onClick={() => setOutfit(o.id)}>{o.label}</PillButton>
                  ))}
                </div>
                <input ref={outfitFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleOutfitPhotoUpload} />
                <button
                  onClick={() => outfitFileRef.current?.click()}
                  style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-deep)', font: '500 0.78rem/1 var(--font-ui)', padding: 0, fontFamily: 'inherit' }}
                >
                  <Icon name="upload" size={12} /> Or upload a photo of the outfit
                </button>
              </>
            )}
          </div>

          <div>
            <div style={{ ...LABEL, marginBottom: 10 }}>Mood</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {SHOOT_MOODS.map(m => <PillButton key={m} active={mood === m} onClick={() => setMood(m)}>{m}</PillButton>)}
            </div>
          </div>

          <div>
            <div style={{ ...LABEL, marginBottom: 10 }}>Lighting</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {SHOOT_LIGHTINGS.map(l => <PillButton key={l} active={lighting === l} onClick={() => setLighting(l)}>{l}</PillButton>)}
            </div>
          </div>
        </>
      )}

      <div>
        <div style={LABEL}>Notes <span style={{ textTransform: 'none', letterSpacing: 0 }}>(optional)</span></div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Anything specific for this shot — angle, prop, energy…"
          rows={2}
          style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface-inset)', color: 'var(--text-body)', font: 'var(--text-sm)', fontFamily: 'inherit', lineHeight: 1.5, outline: 'none' }}
        />
      </div>

      <div>
        <div style={{ ...LABEL, marginBottom: 10 }}>Batch</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {BATCH_OPTIONS.map(n => (
            <PillButton key={n} active={batchSize === n} onClick={() => setBatchSize(n)}>{n} image{n > 1 ? 's' : ''}</PillButton>
          ))}
        </div>
      </div>
    </>
  );

  // --- Canvas: active reference before generating, progress + output after ---
  const showLivePreview = !generating && genImages.length === 0;
  const livePreviewImg = creator ? allImages[activeRef] || allImages[0] : null;

  const canvasJSX = (
    <>
      {showLivePreview && (
        <div style={{
          aspectRatio: '3/4', borderRadius: 'var(--radius-xl)', overflow: 'hidden',
          background: 'var(--grad-portrait)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          // Split layout constrains this via its 340px panel. Stacked (Cast
          // Quick Shoot) has no such cap, so bound it or a 3/4 portrait fills
          // the whole card at full width.
          width: '100%', maxWidth: layout === 'split' ? 'none' : 260, alignSelf: 'center',
        }}>
          {livePreviewImg
            ? <img src={livePreviewImg} alt={creator?.name || 'Reference'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <Icon name={creator ? 'user-round' : 'user-round-search'} size={40} strokeWidth={1} style={{ color: 'var(--text-faint)' }} />
          }
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Button variant="primary" onClick={handleGenerate} loading={generating} disabled={generating} full={layout === 'split'} style={layout === 'split' ? {} : { alignSelf: 'flex-start' }}>
          <Icon name="zap" size={15} /> {generating ? 'Generating…' : 'Build + Generate'}
        </Button>
        <GenerationProgress active={generating} identityLocked={!!creator?.locked} engine={engine} batchSize={batchSize} />
      </div>

      {genError && <p style={{ font: 'var(--text-sm)', color: 'var(--cherry)', margin: 0 }}>{genError}</p>}
      {anchorSaved && (
        <div style={{ font: 'var(--text-sm)', color: 'var(--accent-deep)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="check" size={14} /> Saved as anchor photo!
        </div>
      )}

      {genImages.length > 0 && (
        <div>
          <div style={{ ...LABEL, marginBottom: 12 }}>Result · {genImages.length} image{genImages.length > 1 ? 's' : ''}</div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {genImages.map((url, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8, width: layout === 'split' ? '100%' : 160 }}>
                <div onClick={() => setLightboxSrc(url)} style={{ aspectRatio: '3/4', borderRadius: 'var(--radius-xl)', overflow: 'hidden', boxShadow: 'var(--shadow-md)', cursor: 'zoom-in' }}>
                  <img src={url} alt={`Generated ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <a href={url} download={`thee-studio-${Date.now()}-${i}.jpg`} target="_blank" rel="noreferrer">
                  <Button variant="secondary" style={{ width: '100%', fontSize: '0.75rem' }}><Icon name="download" size={13} /> Download</Button>
                </a>
                {creator && onSaveAsCreator && (
                  <Button variant="secondary" style={{ width: '100%', fontSize: '0.75rem' }} onClick={() => handleSaveAsAnchor(url)}>
                    <Icon name="bookmark" size={13} /> Save as Anchor
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </>
  );

  if (layout === 'split') {
    return (
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <Card style={{ flex: '1 1 460px', minWidth: 320, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {controlsJSX}
        </Card>
        <div style={{ flex: '0 0 340px', minWidth: 300, position: 'sticky', top: 84 }}>
          <Card style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 20 }}>
            <div style={LABEL}>{genImages.length > 0 ? 'Output' : 'Canvas'}</div>
            {canvasJSX}
          </Card>
        </div>
      </div>
    );
  }

  return (
    <Card style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {controlsJSX}
      {canvasJSX}
    </Card>
  );
}
