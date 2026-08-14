import React from 'react';
import { Card } from '../surfaces/Card.jsx';
import { Button } from '../core/Button.jsx';
import { Icon } from '../core/Icon.jsx';
import { GenerationProgress } from '../feedback/GenerationProgress.jsx';
import { ImageLightbox } from '../feedback/ImageLightbox.jsx';
import { Select } from '../forms/Select.jsx';
import { ReferenceImageTray } from '../director/ReferenceImageTray.jsx';
import { DirectorStatusCard } from '../director/DirectorStatusCard.jsx';
import { castQuickShootPlain, characterGenerate, generateImage, pollCastQuickShootStatus, preflightCastReferences } from '../../api/studio.js';
import { hasSupabaseConfig, isStagingSupabaseProject } from '../../lib/supabase.js';
import { fetchAdminAccess } from '../../api/adminTelemetry.js';
import { canonicalCreatorId } from '../../lib/cloudCreators.js';
import { buildCharacterPrompt } from '../../lib/characterPrompt.js';
import { saveToLibrary } from '../../lib/library.js';
import { downloadImageAsPng } from '../../lib/libraryAssets.js';
import { compressImage } from '../../lib/imageUtils.js';
import { creatorMemoryPrompt, getCreatorMemory } from '../../lib/creatorMemory.js';
import {
  PORTRAIT_ANGLES, BATCH_OPTIONS, SHOOT_MOODS, SHOOT_LIGHTINGS, SHOOT_OUTFITS,
} from '../../lib/shootOptions.js';
import {
  LOCATIONS, GENDERS, SKIN_TONES, HAIR_COLORS, EYE_DETAILS, SPECIAL_FEATURES, STANDARD_NEGATIVE,
  buildStructuredVision, getPhysiqueOptions, getHairStyleOptions, getClothingOptions, getJewelryOptions,
} from '../../lib/promptData.js';

const LABEL = { font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 };
const MANAGED_ENGINE_ID = 'openai_image';
const DATA_IMAGE = /^data:image\/(?:jpeg|png|webp);base64,/i;

const QUICK_SHOOT_POLL_INTERVAL_MS = 2500;
const QUICK_SHOOT_POLL_TIMEOUT_MS = 5 * 60 * 1000;

const FASHION_SAFE_RENDER_RULE = [
  'FASHION-SAFE RENDER:',
  'Preserve the outfit reference as closely as possible: same silhouette, neckline, cutouts, slit, fit, lace or mesh pattern, accessories, and sexy eveningwear/editorial energy.',
  'Where transparent fabric would otherwise create unintended exposure, add discreet tonal or illusion lining beneath only those sections while keeping the garment visually sheer-looking and fashion-forward.',
  'Do not add unnecessary coverage elsewhere and do not introduce nudity or sexual activity.',
].join(' ');

function pendingQuickShootKey(creatorId) {
  return `thee-studio:quick-shoot-pending:${creatorId || 'no-creator'}`;
}

function savePendingQuickShootJob(creatorId, jobId) {
  try { window.localStorage.setItem(pendingQuickShootKey(creatorId), jobId); } catch {}
}

function clearPendingQuickShootJob(creatorId) {
  try { window.localStorage.removeItem(pendingQuickShootKey(creatorId)); } catch {}
}

function loadPendingQuickShootJob(creatorId) {
  try { return window.localStorage.getItem(pendingQuickShootKey(creatorId)); } catch { return null; }
}

async function awaitCastQuickShootResult(result, creatorId) {
  if (result.status !== 'pending') return result;
  savePendingQuickShootJob(creatorId, result.jobId);
  const deadline = Date.now() + QUICK_SHOOT_POLL_TIMEOUT_MS;
  try {
    while (Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, QUICK_SHOOT_POLL_INTERVAL_MS));
      const polled = await pollCastQuickShootStatus(result.jobId);
      if (polled.status === 'succeeded') return polled;
      if (polled.status === 'failed') {
        const error = new Error(polled.error || 'Image generation failed. The provider did not return a specific reason.');
        error.category = polled.errorCategory || 'unknown';
        throw error;
      }
    }
    throw new Error('Generation is taking longer than expected. It may still finish — check back shortly.');
  } finally {
    clearPendingQuickShootJob(creatorId);
  }
}

function Section({ icon, title, hint, first, children }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 16,
      paddingTop: first ? 0 : 20,
      borderTop: first ? 'none' : '1px solid var(--border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <span style={{
          width: 30, height: 30, borderRadius: 9, flexShrink: 0,
          background: 'var(--rose-deep)', color: 'var(--accent-deep)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name={icon} size={15} strokeWidth={2} />
        </span>
        <div>
          <div style={{ font: '600 1rem/1.1 var(--font-display)', color: 'var(--text-strong)', letterSpacing: '-0.01em' }}>{title}</div>
          {hint && <div style={{ font: 'var(--text-xs)', color: 'var(--text-faint)', marginTop: 3, lineHeight: 1.4 }}>{hint}</div>}
        </div>
      </div>
      {children}
    </div>
  );
}

const FIELD_LABEL = { font: '600 0.72rem/1 var(--font-ui)', letterSpacing: '0.03em', color: 'var(--text-muted)', marginBottom: 9 };

function PillButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className="ts-pill"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
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
  const [identityMode, setIdentityMode] = React.useState(restored.identityMode || 'lifestyle');
  const [quickAngle, setQuickAngle]     = React.useState(restored.quickAngle || 'front-facing');
  const [scene, setScene]               = React.useState(restored.scene || initialScene);
  const [outfit, setOutfit]             = React.useState(restored.outfit || 'default');
  const [mood, setMood]                 = React.useState(restored.mood || 'Clean');
  const [lighting, setLighting]         = React.useState(restored.lighting || 'Natural');
  const [notes, setNotes]               = React.useState(restored.notes ?? initialNotes);
  const [batchSize, setBatchSize]       = React.useState(restored.batchSize || 1);
  const [activeRef, setActiveRef]       = React.useState(restored.activeRef || 0);

  const [shotReferences, setShotReferences] = React.useState([]);
  const legacyOutfitPhotoDesc = restored.outfitPhotoDesc || '';

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
  const [genErrorCategory, setGenErrorCategory] = React.useState('');
  const [lightboxSrc, setLightboxSrc] = React.useState(null);
  const [anchorSaved, setAnchorSaved] = React.useState(false);
  const [preflightResult, setPreflightResult] = React.useState(null);
  const [preflighting, setPreflighting] = React.useState(false);
  const [canPreflight, setCanPreflight] = React.useState(false);

  const allImages = getAllImages(creator);
  const cloudCreatorId = canonicalCreatorId(creator);
  const embeddedIdentityAvailable = allImages.some(image => typeof image === 'string' && DATA_IMAGE.test(image));
  const creatorIdentityBound = Boolean(creator && (cloudCreatorId || embeddedIdentityAvailable));
  const identityWarning = creator && !creatorIdentityBound
    ? `${creator.name || 'This Cast member'} is selected, but Guided cannot bind a canonical or embedded identity to the render. No generation will start until identity is available.`
    : '';

  React.useEffect(() => {
    let cancelled = false;
    if (!hasSupabaseConfig() || !isStagingSupabaseProject()) return;
    fetchAdminAccess().then(access => {
      if (!cancelled) setCanPreflight(access.allowed);
    });
    return () => { cancelled = true; };
  }, []);

  async function runReferencePreflight() {
    if (!hasSupabaseConfig() || !allImages.length) return;
    setPreflighting(true);
    setPreflightResult(null);
    try {
      const result = await preflightCastReferences(allImages, cloudCreatorId);
      setPreflightResult(result);
    } catch (error) {
      setPreflightResult({ error: error.message || 'Preflight failed.' });
    } finally {
      setPreflighting(false);
    }
  }

  const creatorIdRef = React.useRef(creator?.id ?? null);

  React.useEffect(() => {
    const nextCreatorId = creator?.id ?? null;
    if (creatorIdRef.current === nextCreatorId) return;
    creatorIdRef.current = nextCreatorId;
    setActiveRef(0); setGenImages([]); setGenError(''); setGenErrorCategory('');
    setShotReferences([]);
  }, [creator?.id]);

  React.useEffect(() => {
    if (!hasSupabaseConfig()) return;
    const pendingJobId = loadPendingQuickShootJob(cloudCreatorId);
    if (!pendingJobId) return;
    let cancelled = false;
    setGenerating(true);
    setGenError('');
    setGenErrorCategory('');
    awaitCastQuickShootResult({ status: 'pending', jobId: pendingJobId }, cloudCreatorId)
      .then(result => { if (!cancelled) setGenImages(result.images || []); })
      .catch(error => {
        if (!cancelled) {
          setGenError(error.message || 'Generation failed.');
          setGenErrorCategory(error.category || '');
        }
      })
      .finally(() => { if (!cancelled) setGenerating(false); });
    return () => { cancelled = true; };
  }, [creator?.id, cloudCreatorId]);

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

  const handleShotReferencesChange = (nextReferences) => {
    setShotReferences(nextReferences);
  };

  const composedMood = [mood, lighting !== 'Natural' && `${lighting} lighting`].filter(Boolean).join(' — ');

  const snapshotSettings = () => ({
    version: 2,
    workflow: 'guided',
    identityMode,
    quickAngle,
    scene,
    outfit,
    mood,
    lighting,
    notes,
    batchSize,
    activeRef,
    outfitPhotoDesc: legacyOutfitPhotoDesc,
    referenceRoles: shotReferences.map(reference => ({
      name: reference.name,
      role: reference.role,
    })),
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

  const handleGenerate = async (fashionSafetyMode = 'auto') => {
    setGenerating(true);
    setGenImages([]);
    setGenError('');
    setGenErrorCategory('');
    try {
      let images = [];

      if (creator) {
        if (!creatorIdentityBound) throw new Error(identityWarning);
        const hasOutfitReference = shotReferences.some(reference => reference.role === 'outfit');
        const outfitOverride = hasOutfitReference
          ? null
          : legacyOutfitPhotoDesc || SHOOT_OUTFITS.find(o => o.id === outfit)?.prompt || null;
        const outfitOrAngle = identityMode === 'portrait' ? quickAngle : outfitOverride;
        const sceneName = scene === 'None' ? '' : scene;
        let positivePrompt = buildCharacterPrompt(creator, sceneName, composedMood, creatorIdentityBound, outfitOrAngle, identityMode);
        const memory = getCreatorMemory(creator.id);
        const memoryBlock = creatorMemoryPrompt(memory);
        if (memoryBlock) positivePrompt += `\n\n${memoryBlock}`;
        if (notes.trim()) positivePrompt += `\n\nDIRECTOR'S NOTES:\n${notes.trim()}`;
        if (fashionSafetyMode === 'coverage') positivePrompt += `\n\n${FASHION_SAFE_RENDER_RULE}`;

        if (allImages.length) {
          const primaryIdentity = allImages[activeRef] || allImages[0];
          const remainingIdentityAnchors = allImages.filter(image => image !== primaryIdentity);
          const providerReferences = shotReferences.length
            ? [
                ...shotReferences,
                ...remainingIdentityAnchors
                  .slice(0, Math.max(0, 3 - shotReferences.length))
                  .map((dataUrl, index) => ({
                    dataUrl,
                    role: 'identity',
                    name: `Creator angle ${index + 2}`,
                  })),
              ]
            : [];
          const sequence = [];
          const sequenceKey = crypto.randomUUID();
          for (let index = 0; index < batchSize; index += 1) {
            const submitted = await characterGenerate({
              engineId: MANAGED_ENGINE_ID,
              positivePrompt,
              negativePrompt: STANDARD_NEGATIVE,
              characterImage: primaryIdentity,
              anchorReferences: providerReferences,
              mode: identityMode,
              batchSize: 1,
              creatorId: cloudCreatorId,
              requestKey: `${sequenceKey}:guided-image-${index + 1}`,
            });
            const result = await awaitCastQuickShootResult(submitted, cloudCreatorId);
            const image = result.images?.[0];
            if (!image) throw new Error(`Guided render ${index + 1} of ${batchSize} finished without an image.`);
            sequence.push(image);
          }
          images = sequence;
        } else if (hasSupabaseConfig()) {
          const sequence = [];
          const sequenceKey = crypto.randomUUID();
          for (let index = 0; index < batchSize; index += 1) {
            const submitted = await castQuickShootPlain({
              positivePrompt,
              negativePrompt: STANDARD_NEGATIVE,
              batchSize: 1,
              creatorId: cloudCreatorId,
              requestKey: `${sequenceKey}:guided-image-${index + 1}`,
            });
            const result = await awaitCastQuickShootResult(submitted, cloudCreatorId);
            const image = result.images?.[0];
            if (!image) throw new Error(`Guided render ${index + 1} of ${batchSize} finished without an image.`);
            sequence.push(image);
          }
          images = sequence;
        } else {
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
        if (hasSupabaseConfig() && images.length !== batchSize) {
          throw new Error(`Guided requested ${batchSize} image${batchSize === 1 ? '' : 's'} but received ${images.length}. The incomplete batch was not silently accepted.`);
        }
        images.forEach(url => saveToLibrary(url, {
          source: 'quick_shoot', character: creator.id, scene: sceneName || undefined,
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
        if (fashionSafetyMode === 'coverage') positivePrompt += `\n\n${FASHION_SAFE_RENDER_RULE}`;
        if (shotReferences.length) {
          const sequence = [];
          const sequenceKey = crypto.randomUUID();
          for (let index = 0; index < batchSize; index += 1) {
            const submitted = await characterGenerate({
              engineId: MANAGED_ENGINE_ID,
              positivePrompt,
              negativePrompt: STANDARD_NEGATIVE,
              characterImage: null,
              anchorReferences: shotReferences,
              mode: identityMode,
              batchSize: 1,
              requestKey: `${sequenceKey}:guided-open-image-${index + 1}`,
            });
            const result = await awaitCastQuickShootResult(submitted, null);
            const image = result.images?.[0];
            if (!image) throw new Error(`Guided render ${index + 1} of ${batchSize} finished without an image.`);
            sequence.push(image);
          }
          images = sequence;
        } else if (hasSupabaseConfig()) {
          const result = await castQuickShootPlain({
            positivePrompt,
            negativePrompt: STANDARD_NEGATIVE,
            batchSize,
          });
          images = result.images || [];
        } else {
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
        if (hasSupabaseConfig() && images.length !== batchSize) {
          throw new Error(`Guided requested ${batchSize} image${batchSize === 1 ? '' : 's'} but received ${images.length}. The incomplete batch was not silently accepted.`);
        }
        images.forEach(url => saveToLibrary(url, {
          source: 'director', scene: scene !== 'None' ? scene : undefined,
          prompt: positivePrompt,
          campaign: campaignId || undefined,
          settings: snapshotSettings(),
        }).catch(() => {}));
      }

      setGenImages(images);
      onGenerated?.(images);
    } catch (e) {
      setGenError(e.message || 'Generation failed');
      setGenErrorCategory(e.category || '');
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

  const controlsJSX = (
    <>
      {!creator && allowNoCreator && (
        <Section icon="user-round-search" title="Build the subject" hint="No saved creator — describe who's in frame." first>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><div style={FIELD_LABEL}>Gender</div><Select value={rawGender} onChange={handleRawGenderChange} options={GENDERS} /></div>
            <div><div style={FIELD_LABEL}>Skin Tone</div><Select value={rawSkinTone} onChange={setRawSkinTone} options={SKIN_TONES} /></div>
            <div><div style={FIELD_LABEL}>Body Build</div><Select value={rawPhysique} onChange={setRawPhysique} options={rawPhysiqueOptions} /></div>
            <div><div style={FIELD_LABEL}>Eyes</div><Select value={rawEyeDetail} onChange={setRawEyeDetail} options={EYE_DETAILS} /></div>
            <div><div style={FIELD_LABEL}>Hair Style</div><Select value={rawHairStyle} onChange={setRawHairStyle} options={rawHairStyleOptions} /></div>
            <div><div style={FIELD_LABEL}>Hair Color</div><Select value={rawHairColor} onChange={setRawHairColor} options={HAIR_COLORS} /></div>
            <div><div style={FIELD_LABEL}>Jewelry</div><Select value={rawJewelry} onChange={setRawJewelry} options={rawJewelryOptions} /></div>
            <div><div style={FIELD_LABEL}>Special Features</div><Select value={rawFeatures} onChange={setRawFeatures} options={SPECIAL_FEATURES} /></div>
          </div>
          <div><div style={FIELD_LABEL}>Clothing / Brand Vibe</div><Select value={rawClothing} onChange={setRawClothing} options={rawClothingOptions} /></div>
        </Section>
      )}

      <Section icon="sliders-horizontal" title="Setup" first={!(!creator && allowNoCreator)}>
        {creator && allImages.length > 1 && (
          <div>
            <div style={FIELD_LABEL}>Which angle leads</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', overflowX: 'auto', paddingBottom: 4 }}>
              {allImages.map((img, i) => {
                const on = activeRef === i;
                return (
                  <button
                    key={i}
                    onClick={() => setActiveRef(i)}
                    aria-pressed={on}
                    aria-label={`Use reference ${i + 1}`}
                    style={{
                      position: 'relative', width: 48, height: 64, borderRadius: 8, overflow: 'hidden',
                      cursor: 'pointer', padding: 0, flexShrink: 0, background: 'var(--surface-sunken)',
                      border: `1.5px solid ${on ? 'var(--coral)' : 'var(--border)'}`,
                      boxShadow: on ? '0 0 0 3px rgba(255,107,53,0.18)' : 'none',
                      transition: 'box-shadow var(--t-fast), border-color var(--t-fast), opacity var(--t-fast)',
                      opacity: on ? 1 : 0.72,
                    }}
                  >
                    <img src={img} alt={`Ref ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <div style={FIELD_LABEL}>Shot type</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <PillButton active={identityMode === 'portrait'} onClick={() => setIdentityMode('portrait')}>
              <Icon name="user" size={13} strokeWidth={1.75} /> Portrait Anchor
            </PillButton>
            <PillButton active={identityMode === 'lifestyle'} onClick={() => setIdentityMode('lifestyle')}>
              <Icon name="layout" size={13} strokeWidth={1.75} /> Lifestyle Scene
            </PillButton>
          </div>
        </div>
      </Section>

      <div style={{ paddingTop: 20, borderTop: '1px solid var(--border)' }}>
        <ReferenceImageTray
          references={shotReferences}
          onChange={handleShotReferencesChange}
          maxReferences={creator ? 3 : 4}
          defaultRole={!creator ? 'identity' : identityMode === 'portrait' ? 'makeup' : 'outfit'}
          identityLocked={Boolean(creator)}
          disabled={generating}
          title="Shot references"
          description={creator
            ? `${creator.name} already owns the Identity slot. Add up to three Outfit, Background, Hair, Makeup, or Pose references.`
            : 'Start with an Identity image, then add up to three styling or scene references.'}
        />
      </div>

      {identityMode === 'portrait' ? (
        <Section icon="camera" title="Framing">
          <div>
            <div style={FIELD_LABEL}>Camera angle</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PORTRAIT_ANGLES.map(angle => (
                <PillButton key={angle} active={quickAngle === angle} onClick={() => setQuickAngle(angle)}>{angle}</PillButton>
              ))}
            </div>
          </div>
        </Section>
      ) : (
        <Section icon="sparkles" title="The look" hint="Set the scene, styling, and mood for this shot.">
          <div>
            <div style={FIELD_LABEL}>Scene</div>
            <Select value={scene} onChange={setScene} options={LOCATIONS} />
          </div>

          <div style={{ maxWidth: 320 }}>
            <div style={FIELD_LABEL}>Outfit</div>
            <Select
              value={outfit}
              onChange={setOutfit}
              options={SHOOT_OUTFITS.map(option => ({ value: option.id, label: option.label }))}
            />
            <div style={{ marginTop: 7, font: 'var(--text-xs)', color: 'var(--text-faint)', lineHeight: 1.4 }}>
              Presets guide styling. Outfit references above override them.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <div>
              <div style={FIELD_LABEL}>Mood</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {SHOOT_MOODS.map(m => <PillButton key={m} active={mood === m} onClick={() => setMood(m)}>{m}</PillButton>)}
              </div>
            </div>
            <div>
              <div style={FIELD_LABEL}>Lighting</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {SHOOT_LIGHTINGS.map(l => <PillButton key={l} active={lighting === l} onClick={() => setLighting(l)}>{l}</PillButton>)}
              </div>
            </div>
          </div>
        </Section>
      )}

      <Section icon="zap" title="Finishing">
        <div>
          <div style={FIELD_LABEL}>Notes <span style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--text-faint)' }}>(optional)</span></div>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Anything specific for this shot — angle, prop, energy…"
            rows={2}
            style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', padding: '11px 13px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface-inset)', color: 'var(--text-body)', font: 'var(--text-sm)', fontFamily: 'inherit', lineHeight: 1.5, outline: 'none' }}
          />
        </div>

        <div>
          <div style={FIELD_LABEL}>Batch</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {BATCH_OPTIONS.map(n => (
              <PillButton key={n} active={batchSize === n} onClick={() => setBatchSize(n)}>{n} image{n > 1 ? 's' : ''}</PillButton>
            ))}
          </div>
        </div>
      </Section>
    </>
  );

  const showLivePreview = !generating && genImages.length === 0;
  const livePreviewImg = creator ? allImages[activeRef] || allImages[0] : null;
  const guidedDirection = [
    identityMode === 'portrait' ? `Portrait · ${quickAngle}` : scene !== 'None' ? scene : 'Lifestyle scene',
    notes.trim() || null,
  ].filter(Boolean).join(' · ');

  const canvasJSX = (
    <>
      {showLivePreview && (
        <div style={{
          aspectRatio: '3/4', borderRadius: 'var(--radius-xl)', overflow: 'hidden',
          background: 'var(--grad-portrait)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '100%', maxWidth: layout === 'split' ? 'none' : 260, alignSelf: 'center',
        }}>
          {livePreviewImg
            ? <img src={livePreviewImg} alt={creator?.name || 'Reference'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <Icon name={creator ? 'user-round' : 'user-round-search'} size={40} strokeWidth={1} style={{ color: 'var(--text-faint)' }} />
          }
        </div>
      )}

      {(() => {
        const outfitLabel = SHOOT_OUTFITS.find(o => o.id === outfit)?.label;
        const parts = [
          creator?.name,
          identityMode === 'portrait' ? 'Portrait' : 'Lifestyle',
          identityMode === 'lifestyle' && scene !== 'None' ? scene : null,
          outfit !== 'default' ? outfitLabel : null,
          mood,
          lighting,
        ].filter(Boolean);
        if (!parts.length) return null;
        return (
          <div style={{
            display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6,
            padding: '9px 12px', borderRadius: 'var(--radius-md)',
            background: 'var(--surface-sunken)', border: '1px solid var(--border)',
            font: 'var(--text-sm)', color: 'var(--text-body)',
          }}>
            {parts.map((p, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span style={{ color: 'var(--text-faint)' }}>·</span>}
                <span style={i === 0 ? { fontWeight: 600 } : undefined}>{p}</span>
              </React.Fragment>
            ))}
          </div>
        );
      })()}

      <DirectorStatusCard
        creator={creator}
        workflow="Guided"
        identityLocked={creator ? creatorIdentityBound : shotReferences.some(reference => reference.role === 'identity')}
        count={batchSize}
        format="PNG"
        sceneSummary={guidedDirection}
        referenceRoles={shotReferences.map(reference => reference.role)}
        ready={!identityWarning}
        warning={identityWarning}
        compact
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Button variant="primary" onClick={() => handleGenerate('auto')} loading={generating} disabled={generating || Boolean(identityWarning)} full={layout === 'split'} style={layout === 'split' ? {} : { alignSelf: 'flex-start' }}>
          <Icon name="zap" size={15} /> {generating ? 'Generating…' : `Generate ${batchSize === 1 ? 'photo' : `${batchSize} photos`}`}
        </Button>
        <GenerationProgress active={generating} identityLocked={creator ? creatorIdentityBound : shotReferences.some(reference => reference.role === 'identity')} batchSize={batchSize} />
        {creator && hasSupabaseConfig() && !cloudCreatorId && embeddedIdentityAvailable && (
          <p style={{ font: 'var(--text-xs)', color: 'var(--text-faint)', margin: 0 }}>
            This legacy creator can render from its embedded Identity reference, but it is not cloud-linked to profile history yet.
          </p>
        )}
      </div>

      {genError && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
          <p style={{ font: 'var(--text-sm)', color: 'var(--cherry)', margin: 0 }}>{genError}</p>
          {genErrorCategory === 'safety_moderation' && !generating && (
            <>
              <Button variant="secondary" onClick={() => handleGenerate('coverage')} disabled={generating}>
                <Icon name="sparkles" size={14} /> Try Fashion-Safe Render
              </Button>
              <p style={{ font: 'var(--text-xs)', color: 'var(--text-faint)', margin: 0 }}>
                This starts a new generation and may use credits. Your current creator, references, scene, and styling stay in place.
              </p>
            </>
          )}
        </div>
      )}
      {canPreflight && allImages.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Button variant="secondary" onClick={runReferencePreflight} loading={preflighting} disabled={preflighting}>
            Check References (staging debug — no provider call)
          </Button>
          {preflightResult && (
            <pre style={{ font: 'var(--text-xs)', color: 'var(--text-muted)', whiteSpace: 'pre-wrap', margin: 0 }}>
              {JSON.stringify(preflightResult, null, 2)}
            </pre>
          )}
        </div>
      )}
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
                <Button
                  variant="secondary"
                  style={{ width: '100%', fontSize: '0.75rem' }}
                  onClick={() => downloadImageAsPng(url, `thee-studio-${Date.now()}-${i + 1}.png`).catch(error => setGenError(error.message || 'PNG download failed.'))}
                >
                  <Icon name="download" size={13} /> Download PNG
                </Button>
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
