import React from 'react';
import { Card } from '../surfaces/Card.jsx';
import { Button } from '../core/Button.jsx';
import { Icon } from '../core/Icon.jsx';
import { GenerationProgress } from '../feedback/GenerationProgress.jsx';
import { ImageLightbox } from '../feedback/ImageLightbox.jsx';
import { Select } from '../forms/Select.jsx';
import { ReferenceImageTray } from '../director/ReferenceImageTray.jsx';
import { castQuickShootPlain, characterGenerate, generateImage, pollCastQuickShootStatus, preflightCastReferences } from '../../api/studio.js';
import { hasSupabaseConfig, isStagingSupabaseProject } from '../../lib/supabase.js';
import { fetchAdminAccess } from '../../api/adminTelemetry.js';
import { canonicalCreatorId } from '../../lib/cloudCreators.js';
import { buildCharacterPrompt } from '../../lib/characterPrompt.js';
import { saveToLibrary } from '../../lib/library.js';
import { compressImage } from '../../lib/imageUtils.js';
import { creatorMemoryPrompt, getCreatorMemory } from '../../lib/creatorMemory.js';
import { referencePromptBlock } from '../../lib/directorReferences.js';
import {
  SHOOT_ENGINES, PORTRAIT_ANGLES, BATCH_OPTIONS, SHOOT_MOODS, SHOOT_LIGHTINGS, SHOOT_OUTFITS,
} from '../../lib/shootOptions.js';
import {
  LOCATIONS, GENDERS, SKIN_TONES, HAIR_COLORS, EYE_DETAILS, SPECIAL_FEATURES, STANDARD_NEGATIVE,
  buildStructuredVision, getPhysiqueOptions, getHairStyleOptions, getClothingOptions, getJewelryOptions,
} from '../../lib/promptData.js';

const LABEL = { font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 };

// Identity-locked Quick Shoot submits are asynchronous (background provider
// job) — the result comes back as { status: 'pending', jobId } and must be
// polled. These helpers own that loop plus the localStorage handoff that
// lets a browser refresh resume polling an already-owned pending job instead
// of losing it (and never resubmit — polling is always a read).
const QUICK_SHOOT_POLL_INTERVAL_MS = 2500;
const QUICK_SHOOT_POLL_TIMEOUT_MS = 5 * 60 * 1000;

function pendingQuickShootKey(creatorId) {
  return `thee-studio:quick-shoot-pending:${creatorId || 'no-creator'}`;
}

function savePendingQuickShootJob(creatorId, jobId) {
  try { window.localStorage.setItem(pendingQuickShootKey(creatorId), jobId); } catch { /* storage unavailable — resume just won't work */ }
}

function clearPendingQuickShootJob(creatorId) {
  try { window.localStorage.removeItem(pendingQuickShootKey(creatorId)); } catch { /* no-op */ }
}

function loadPendingQuickShootJob(creatorId) {
  try { return window.localStorage.getItem(pendingQuickShootKey(creatorId)); } catch { return null; }
}

// Resolves a characterGenerate()/castQuickShootPlain() result to its final
// images. Synchronous results (status !== 'pending') pass through
// immediately. Pending results are polled — each poll is a read-only status
// check that can never submit another generation, so calling this
// concurrently or after a refresh (which resumes with the same jobId) is safe.
async function awaitCastQuickShootResult(result, creatorId) {
  if (result.status !== 'pending') return result;
  savePendingQuickShootJob(creatorId, result.jobId);
  const deadline = Date.now() + QUICK_SHOOT_POLL_TIMEOUT_MS;
  try {
    while (Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, QUICK_SHOOT_POLL_INTERVAL_MS));
      const polled = await pollCastQuickShootStatus(result.jobId);
      if (polled.status === 'succeeded') return polled;
      if (polled.status === 'failed') throw new Error(polled.error || 'Image generation failed. The provider did not return a specific reason.');
    }
    throw new Error('Generation is taking longer than expected. It may still finish — check back shortly.');
  } finally {
    clearPendingQuickShootJob(creatorId);
  }
}

// Editorial section wrapper — turns the old flat wall of uppercase labels into
// grouped, titled blocks with an icon chip and a hairline divider, so the form
// reads like a directed shoot sheet rather than a generic settings panel.
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

// Small control label — no longer a heavy all-caps header competing with the
// section titles; sits quietly above each control cluster.
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

  const [shotReferences, setShotReferences] = React.useState([]);
  // Preserve the analyzed description from old History entries after replacing
  // the one-off outfit uploader with role-aware visual references.
  const legacyOutfitPhotoDesc = restored.outfitPhotoDesc || '';

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
  const [preflightResult, setPreflightResult] = React.useState(null);
  const [preflighting, setPreflighting] = React.useState(false);
  const [canPreflight, setCanPreflight] = React.useState(false);

  const allImages = getAllImages(creator);

  // Owner-only staging diagnostic: server-authoritative admin check (never
  // trust a client-side role flag) gated additionally on this build actually
  // being wired to the staging Supabase project — never production, never a
  // customer account, regardless of environment.
  React.useEffect(() => {
    let cancelled = false;
    if (!hasSupabaseConfig() || !isStagingSupabaseProject()) return;
    fetchAdminAccess().then(access => {
      if (!cancelled) setCanPreflight(access.allowed);
    });
    return () => { cancelled = true; };
  }, []);

  // Staging owner-only debug tool: validates the currently-selected
  // reference images (MIME/signature/size/dimensions) without ever calling
  // OpenAI. Lets a suspect reference be diagnosed before spending a real
  // provider request.
  async function runReferencePreflight() {
    if (!hasSupabaseConfig() || !allImages.length) return;
    setPreflighting(true);
    setPreflightResult(null);
    try {
      const result = await preflightCastReferences(allImages, canonicalCreatorId(creator));
      setPreflightResult(result);
    } catch (error) {
      setPreflightResult({ error: error.message || 'Preflight failed.' });
    } finally {
      setPreflighting(false);
    }
  }

  const creatorIdRef = React.useRef(creator?.id ?? null);

  // Reset per-shot media when the user changes creator after mount. Do not
  // wipe a History re-run's restored reference index on the initial render.
  React.useEffect(() => {
    const nextCreatorId = creator?.id ?? null;
    if (creatorIdRef.current === nextCreatorId) return;
    creatorIdRef.current = nextCreatorId;
    setActiveRef(0); setGenImages([]); setGenError('');
    setShotReferences([]);
  }, [creator?.id]);

  // Resume an owned pending Quick Shoot job after a page refresh (or when
  // switching back to a creator with one in flight) instead of losing it.
  // Reading localStorage and polling never submits a new generation.
  React.useEffect(() => {
    if (!hasSupabaseConfig()) return;
    const creatorId = canonicalCreatorId(creator);
    const pendingJobId = loadPendingQuickShootJob(creatorId);
    if (!pendingJobId) return;
    let cancelled = false;
    setGenerating(true);
    setGenError('');
    awaitCastQuickShootResult({ status: 'pending', jobId: pendingJobId }, creatorId)
      .then(result => { if (!cancelled) setGenImages(result.images || []); })
      .catch(error => { if (!cancelled) setGenError(error.message || 'Generation failed.'); })
      .finally(() => { if (!cancelled) setGenerating(false); });
    return () => { cancelled = true; };
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

  const handleShotReferencesChange = (nextReferences) => {
    setShotReferences(nextReferences);
    // The current OpenAI path is the only Guided engine that consumes every
    // labeled visual input. Keep the selected engine honest when refs are used.
    if (nextReferences.length) setEngine('openai_image');
  };

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
        const hasOutfitReference = shotReferences.some(reference => reference.role === 'outfit');
        const outfitOverride = hasOutfitReference
          ? null
          : legacyOutfitPhotoDesc || SHOOT_OUTFITS.find(o => o.id === outfit)?.prompt || null;
        const outfitOrAngle = identityMode === 'portrait' ? quickAngle : outfitOverride;
        const sceneName = scene === 'None' ? '' : scene;
        let positivePrompt = buildCharacterPrompt(creator, sceneName, composedMood, !!creator.locked, outfitOrAngle, identityMode);
        const memory = getCreatorMemory(creator.id);
        const memoryBlock = creatorMemoryPrompt(memory);
        if (memoryBlock) positivePrompt += `\n\n${memoryBlock}`;
        if (notes.trim()) positivePrompt += `\n\nDIRECTOR'S NOTES:\n${notes.trim()}`;

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
          const referenceBlock = referencePromptBlock(
            providerReferences,
            { startsAfterIdentity: true }
          );
          if (referenceBlock) positivePrompt += `\n\n${referenceBlock}`;
          const identityCreatorId = canonicalCreatorId(creator);
          const submitted = await characterGenerate({
            engineId: engine,
            positivePrompt,
            negativePrompt: STANDARD_NEGATIVE,
            characterImage: primaryIdentity,
            // Providers currently use four visual inputs. Put role-specific
            // shot references first so outfit/background/makeup choices are
            // never displaced by secondary creator angles.
            anchorImages: providerReferences.length
              ? providerReferences.map(reference => reference.dataUrl)
              : allImages,
            mode: identityMode,
            batchSize,
            creatorId: identityCreatorId,
          });
          const result = await awaitCastQuickShootResult(submitted, identityCreatorId);
          images = result.images || [];
        } else {
          // No reference photo — nothing to identity-lock against, but the
          // built prompt is still a valid text-to-image prompt.
          const result = hasSupabaseConfig()
            ? await castQuickShootPlain({
                positivePrompt,
                negativePrompt: STANDARD_NEGATIVE,
                batchSize,
                creatorId: canonicalCreatorId(creator),
              })
            : await generateImage({
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
        const referenceBlock = referencePromptBlock(shotReferences);
        if (referenceBlock) positivePrompt += `\n\n${referenceBlock}`;
        const referenceImages = shotReferences.map(reference => reference.dataUrl);
        const result = referenceImages.length
          ? await awaitCastQuickShootResult(await characterGenerate({
              engineId: engine,
              positivePrompt,
              negativePrompt: STANDARD_NEGATIVE,
              characterImage: referenceImages[0],
              anchorImages: referenceImages.slice(1),
              mode: identityMode,
              batchSize,
            }), null)
          : await generateImage({
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
          <div style={FIELD_LABEL}>Engine</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {SHOOT_ENGINES.map(eng => (
              <PillButton key={eng.id} active={engine === eng.id} onClick={() => setEngine(eng.id)}>
                <Icon name={eng.icon} size={13} strokeWidth={1.75} /> {eng.label}
              </PillButton>
            ))}
          </div>
        </div>

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
          maxReferences={allImages.length ? 3 : 4}
          defaultRole={identityMode === 'portrait' ? 'makeup' : 'outfit'}
          disabled={generating}
          title="Shot references"
          description={allImages.length
            ? 'Your creator fills the identity slot. Add up to three more images and assign each a job. Multi-reference shots use OpenAI.'
            : 'Add up to four images and assign each one a job. Multi-reference shots use OpenAI.'}
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

          <div>
            <div style={{ ...FIELD_LABEL, display: 'flex', alignItems: 'center' }}>
              Outfit
              {outfit !== 'default' && (
                <button onClick={() => setOutfit('default')} style={{ marginLeft: 10, font: '500 0.72rem/1 var(--font-ui)', color: 'var(--accent-deep)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>reset</button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, alignItems: 'flex-start' }}>
              {SHOOT_OUTFITS.map(o => (
                <PillButton key={o.id} active={outfit === o.id} onClick={() => setOutfit(o.id)}>{o.label}</PillButton>
              ))}
            </div>
            <div style={{ marginTop: 8, font: 'var(--text-xs)', color: 'var(--text-faint)', lineHeight: 1.45 }}>
              For an exact look, add an Outfit reference above — visual references override these presets.
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Button variant="primary" onClick={handleGenerate} loading={generating} disabled={generating} full={layout === 'split'} style={layout === 'split' ? {} : { alignSelf: 'flex-start' }}>
          <Icon name="zap" size={15} /> {generating ? 'Generating…' : 'Build + Generate'}
        </Button>
        <GenerationProgress active={generating} identityLocked={!!creator?.locked} engine={engine} batchSize={batchSize} />
        {creator && hasSupabaseConfig() && !canonicalCreatorId(creator) && (
          <p style={{ font: 'var(--text-xs)', color: 'var(--text-faint)', margin: 0 }}>
            This creator isn't cloud-linked yet, so this shoot won't be saved to their profile history.
          </p>
        )}
      </div>

      {genError && <p style={{ font: 'var(--text-sm)', color: 'var(--cherry)', margin: 0 }}>{genError}</p>}
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
