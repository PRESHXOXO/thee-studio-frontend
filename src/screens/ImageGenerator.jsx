import React from 'react';
import { generateCharacterSeed, generateCharacterVariationShot, parseCreatorCorrection } from '../api/studio.js';
import { compressImage } from '../lib/imageUtils.js';
import { saveActiveCreatorId } from '../lib/activeCreator.js';
import {
  blankCreatorDraft, touchDraft, composeDescription, composeBodyDescription,
  parseCorrectionText, CREATOR_STATUS,
} from '../lib/creatorIdentity.js';
import { CreatorBuilderProgress } from '../components/creatorBuilder/CreatorBuilderProgress.jsx';
import { BaseIdentityForm } from '../components/creatorBuilder/BaseIdentityForm.jsx';
import { CreatorFirstLook } from '../components/creatorBuilder/CreatorFirstLook.jsx';
import { IdentityReferencePack } from '../components/creatorBuilder/IdentityReferencePack.jsx';
import { CreatorLockSuccess } from '../components/creatorBuilder/CreatorLockSuccess.jsx';
import { BodyIdentityForm } from '../components/creatorBuilder/BodyIdentityForm.jsx';
import { CreatorBrandForm } from '../components/creatorBuilder/CreatorBrandForm.jsx';

const DRAFT_KEY = 'ts_creator_draft';
// Identity pack (images[1..4]) — backend shotIndex per angle. Full Body
// (shotIndex 3) is deliberately excluded from the identity pack; it's
// generated separately in Step 4 (Body Identity) instead, matching the
// "face first, body later" flow. Side Profile (4) and Front Smile (5) were
// added to app.py's SHOTS list specifically to fill out the 5-angle set.
const PACK_SHOTS = [
  { label: 'Left ¾',        shotIndex: 1 },
  { label: 'Right ¾',       shotIndex: 2 },
  { label: 'Side Profile',  shotIndex: 4 },
  { label: 'Front Smile',   shotIndex: 5 },
];
const FULL_BODY_SHOT_INDEX = 3;

function loadSavedDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function buildGenParams(draft, extraNote = '') {
  const { name, coreIdentity: core, hairIdentity: hair, bodyIdentity: body } = draft;
  const vision = [composeDescription(draft), extraNote].filter(Boolean).join(' ');
  return {
    name: name || 'Creator',
    gender: core.gender,
    skinTone: core.skinTone,
    hairStyle: hair.style,
    hairColor: hair.color,
    eyeDetail: 'Unspecified',
    body: body.overallBuild,
    features: core.distinctiveFeatures,
    jewelry: 'None',      // styling is Step 5 territory, not sent during identity generation
    clothing: 'Unspecified',
    niche: '',
    vision,
  };
}

// New Creator — five-step guided build: Describe -> Preview -> Refine ->
// Lock -> Style. Replaces the old single-page form; the underlying
// generation calls (generateCharacterSeed / generateCharacterVariationShot)
// are unchanged so nothing that worked before stops working.
export function ImageGenerator({ onNav, initialName = '', initialNiche = '', initialVision = '', initialDescription = '' }) {
  const hasArchetypeHandoff = !!(initialName || initialNiche || initialVision || initialDescription);

  const [draft, setDraft] = React.useState(() => {
    if (!hasArchetypeHandoff) {
      const saved = loadSavedDraft();
      if (saved) return saved;
    }
    const fresh = blankCreatorDraft();
    if (initialName) fresh.name = initialName;
    if (initialNiche) fresh.brandProfile.worlds = [initialNiche];
    if (initialVision) fresh.brandProfile.energies = [initialVision];
    // Prefill the Base step's free-text description so an archetype pick lands
    // visibly on step 1, not only on the (later, hidden) Brand step.
    if (initialDescription) fresh.coreIdentity.naturalLanguageDescription = initialDescription;
    return fresh;
  });

  const [step, setStep] = React.useState('base');
  const [furthestStep, setFurthestStep] = React.useState('base');
  const [lockJustApproved, setLockJustApproved] = React.useState(false);

  const [generatingBase, setGeneratingBase] = React.useState(false);
  const [lookError, setLookError] = React.useState('');
  const [applyingCorrection, setApplyingCorrection] = React.useState(false);
  const [correctionText, setCorrectionText] = React.useState('');

  const [packGenerating, setPackGenerating] = React.useState(false);
  const [regeneratingIndex, setRegeneratingIndex] = React.useState(null);
  const [packError, setPackError] = React.useState('');

  const [refiningBody, setRefiningBody] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState('');

  // Autosave the draft so the user can exit and return later without
  // losing selections — cleared once the creator is actually saved.
  React.useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch {}
  }, [draft]);

  const goTo = (id) => {
    setStep(id);
    const order = ['base', 'look', 'lock', 'body', 'brand'];
    if (order.indexOf(id) > order.indexOf(furthestStep)) setFurthestStep(id);
  };

  const patchDraft = (next) => setDraft(touchDraft(next));

  const images = draft.identityReferences.images;

  // --- Step 1 -> Step 2: generate first-look headshot ---
  const handleGenerateFirstLook = async () => {
    setGeneratingBase(true);
    setLookError('');
    try {
      const result = await generateCharacterSeed(buildGenParams(draft));
      patchDraft({
        ...draft,
        identityReferences: {
          ...draft.identityReferences,
          faceAnchor: result.faceAnchor || '',
          images: [{ label: 'Headshot', url: result.image, status: 'pending' }],
          primaryReference: null,
        },
      });
      goTo('look');
    } catch (e) {
      setLookError(e.message || 'Generation failed');
    } finally {
      setGeneratingBase(false);
    }
  };

  const handleRegenerateLook = async () => {
    setGeneratingBase(true);
    setLookError('');
    try {
      const result = await generateCharacterSeed(buildGenParams(draft));
      patchDraft({
        ...draft,
        identityReferences: { ...draft.identityReferences, faceAnchor: result.faceAnchor || '', images: [{ label: 'Headshot', url: result.image, status: 'pending' }] },
      });
    } catch (e) {
      setLookError(e.message || 'Generation failed');
    } finally {
      setGeneratingBase(false);
    }
  };

  const handleApplyCorrection = async () => {
    if (!correctionText.trim()) return;
    setApplyingCorrection(true);
    setLookError('');
    // Real backend parsing (GPT-4o-mini) first; falls back to the local
    // keyword heuristic only if the endpoint errors (offline, no key, etc.)
    // — the raw text always still rides along to generation either way, so
    // a parsing failure never loses what the user typed.
    let patch;
    try {
      patch = await parseCreatorCorrection(correctionText, draft.coreIdentity.gender);
    } catch {
      patch = parseCorrectionText(correctionText, draft.coreIdentity.gender);
    }
    let nextDraft = draft;
    if (patch.hairColor) nextDraft = { ...nextDraft, hairIdentity: { ...nextDraft.hairIdentity, color: patch.hairColor } };
    if (patch.facialFullness) nextDraft = { ...nextDraft, coreIdentity: { ...nextDraft.coreIdentity, facialFullness: patch.facialFullness } };
    if (patch.faceShape) nextDraft = { ...nextDraft, coreIdentity: { ...nextDraft.coreIdentity, faceShape: patch.faceShape } };
    if (patch.eyeShape) nextDraft = { ...nextDraft, coreIdentity: { ...nextDraft.coreIdentity, eyeShape: patch.eyeShape } };
    if (patch.browShape) nextDraft = { ...nextDraft, coreIdentity: { ...nextDraft.coreIdentity, browShape: patch.browShape } };
    if (patch.noseShape) nextDraft = { ...nextDraft, coreIdentity: { ...nextDraft.coreIdentity, noseShape: patch.noseShape } };
    if (patch.lipShape) nextDraft = { ...nextDraft, coreIdentity: { ...nextDraft.coreIdentity, lipShape: patch.lipShape } };
    if (nextDraft !== draft) patchDraft(nextDraft);
    try {
      const result = await generateCharacterSeed(buildGenParams(nextDraft, correctionText));
      patchDraft({
        ...nextDraft,
        identityReferences: { ...nextDraft.identityReferences, faceAnchor: result.faceAnchor || '', images: [{ label: 'Headshot', url: result.image, status: 'pending' }] },
      });
      setCorrectionText('');
    } catch (e) {
      setLookError(e.message || 'Generation failed');
    } finally {
      setApplyingCorrection(false);
    }
  };

  const handleApproveLook = async () => {
    patchDraft({ ...draft, status: CREATOR_STATUS.FACE_APPROVED });
    goTo('lock');
    // Kick off the four-shot casting pack immediately, one at a time —
    // same pipeline as before, just triggered from the new Step 3 screen.
    setPackGenerating(true);
    setPackError('');
    const baseParams = {
      ...buildGenParams(draft),
      seedImage: images[0].url,
      faceAnchor: draft.identityReferences.faceAnchor,
    };
    let current = images.slice(0, 1);
    for (let i = 0; i < PACK_SHOTS.length; i++) {
      try {
        const result = await generateCharacterVariationShot({ ...baseParams, shotIndex: PACK_SHOTS[i].shotIndex });
        current = [...current, { label: PACK_SHOTS[i].label, url: result.image || null, status: 'pending' }];
        const snapshot = current;
        setDraft(prev => touchDraft({ ...prev, identityReferences: { ...prev.identityReferences, images: snapshot } }));
      } catch (e) {
        setPackError(e.message || 'Generation failed');
        break;
      }
    }
    setPackGenerating(false);
  };

  // --- Step 3: per-card regenerate / approve / primary ---
  const handleRegenerateCard = async (index) => {
    setRegeneratingIndex(index);
    setPackError('');
    try {
      const baseParams = {
        ...buildGenParams(draft),
        seedImage: images[0].url,
        faceAnchor: draft.identityReferences.faceAnchor,
      };
      let url;
      if (index === 0) {
        const result = await generateCharacterSeed(buildGenParams(draft));
        url = result.image;
      } else {
        const result = await generateCharacterVariationShot({ ...baseParams, shotIndex: PACK_SHOTS[index - 1].shotIndex });
        url = result.image;
      }
      setDraft(prev => {
        const nextImages = [...prev.identityReferences.images];
        nextImages[index] = { ...nextImages[index], url, status: 'pending' };
        return touchDraft({ ...prev, identityReferences: { ...prev.identityReferences, images: nextImages } });
      });
    } catch (e) {
      setPackError(e.message || 'Regeneration failed');
    } finally {
      setRegeneratingIndex(null);
    }
  };

  const handleApproveCard = (index) => {
    setDraft(prev => {
      const nextImages = [...prev.identityReferences.images];
      nextImages[index] = { ...nextImages[index], status: 'approved' };
      return touchDraft({ ...prev, identityReferences: { ...prev.identityReferences, images: nextImages } });
    });
  };

  const handleApproveAllCards = () => {
    setDraft(prev => ({
      ...touchDraft(prev),
      identityReferences: { ...prev.identityReferences, images: prev.identityReferences.images.map(i => ({ ...i, status: 'approved' })) },
    }));
  };

  const handleSetPrimary = (index) => {
    patchDraft({ ...draft, identityReferences: { ...draft.identityReferences, primaryReference: index } });
  };

  const allApproved = images.length === 5 && images.every(i => i.status === 'approved');

  const handleContinueFromLock = () => {
    patchDraft({ ...draft, status: CREATOR_STATUS.IDENTITY_LOCKED });
    setLockJustApproved(true);
  };

  // --- Step 4: body ---
  const handleRefineFullBody = async () => {
    setRefiningBody(true);
    setPackError('');
    try {
      const bodyNote = composeBodyDescription(draft);
      const baseParams = {
        ...buildGenParams(draft, bodyNote),
        seedImage: images[0].url,
        faceAnchor: draft.identityReferences.faceAnchor,
      };
      const result = await generateCharacterVariationShot({ ...baseParams, shotIndex: FULL_BODY_SHOT_INDEX });
      setDraft(prev => touchDraft({
        ...prev,
        identityReferences: { ...prev.identityReferences, fullBodyReference: result.image },
      }));
    } catch (e) {
      setPackError(e.message || 'Refinement failed');
    } finally {
      setRefiningBody(false);
    }
  };

  // --- Step 5: final save ---
  const handleSaveCreator = async () => {
    setSaving(true);
    setSaveError('');
    const validImgs = images.filter(i => i.url && !i.url.startsWith('ERROR:'));
    if (!validImgs.length) { setSaving(false); return; }
    const compressed = await Promise.all(validImgs.map(i => compressImage(i.url)));
    const primaryIdx = draft.identityReferences.primaryReference ?? 0;
    const primaryCompressed = compressed[primaryIdx] || compressed[0];
    let fullBodyCompressed = null;
    if (draft.identityReferences.fullBodyReference) {
      fullBodyCompressed = await compressImage(draft.identityReferences.fullBodyReference);
    }

    // Legacy flat shape preserved exactly (refImages/image/locked/fields) so
    // every existing consumer (ShootBuilder, Characters, Quick Shoot) keeps
    // working unchanged, plus the new structured identity model alongside it.
    const newChar = {
      id: draft.id,
      name: draft.name || 'Creator',
      faceAnchor: draft.identityReferences.faceAnchor,
      refImages: [primaryCompressed, ...compressed.filter((_, i) => i !== primaryIdx), ...(fullBodyCompressed ? [fullBodyCompressed] : [])],
      image: primaryCompressed,
      locked: true,
      fields: {
        tone: draft.coreIdentity.skinTone !== 'Unspecified' ? draft.coreIdentity.skinTone : '',
        hair: draft.hairIdentity.style !== 'Unspecified' ? draft.hairIdentity.style : '',
        face: draft.coreIdentity.eyeShape !== 'Unspecified' ? draft.coreIdentity.eyeShape : '',
        body: draft.bodyIdentity.overallBuild !== 'Unspecified' ? draft.bodyIdentity.overallBuild : '',
        wardrobe: draft.brandProfile.signatureClothing !== 'Unspecified' ? draft.brandProfile.signatureClothing : '',
        personality: draft.brandProfile.energies.join(', '),
        niche: draft.brandProfile.worlds.join(', '),
      },
      ...draft,
      status: CREATOR_STATUS.IDENTITY_LOCKED,
    };

    try {
      const existing = JSON.parse(localStorage.getItem('ts_characters') || '[]');
      existing.push(newChar);
      localStorage.setItem('ts_characters', JSON.stringify(existing));
    } catch (e) {
      setSaving(false);
      setSaveError(
        e?.name === 'QuotaExceededError'
          ? 'Save failed: browser storage is full. Free up space (e.g. clear old Library images) and try again.'
          : `Save failed: ${e?.message || 'could not write to browser storage'}.`
      );
      return;
    }
    saveActiveCreatorId(newChar.id);
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
    setSaving(false);
    onNav?.('characters');
  };

  const statusLabel = { [CREATOR_STATUS.DRAFT]: 'Draft', [CREATOR_STATUS.FACE_APPROVED]: 'Face Approved', [CREATOR_STATUS.IDENTITY_LOCKED]: 'Identity Locked' }[draft.status];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 720, margin: '0 auto' }}>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
          <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--accent-deep)' }}>New Creator</div>
          <span style={{ font: '600 0.7rem/1 var(--font-ui)', color: 'var(--text-faint)', border: '1px solid var(--border)', borderRadius: 'var(--radius-pill)', padding: '3px 10px' }}>
            {statusLabel}
          </span>
        </div>
        <h1 style={{ font: 'var(--display-lg)', color: 'var(--text-strong)', letterSpacing: '-0.015em', margin: '0 0 14px' }}>Build with Thee Studio</h1>
        <CreatorBuilderProgress currentStep={step} furthestStep={furthestStep} onJump={(id) => { setLockJustApproved(false); goTo(id); }} />
      </div>

      {step === 'base' && (
        <BaseIdentityForm draft={draft} onChange={patchDraft} onSubmit={handleGenerateFirstLook} submitting={generatingBase} />
      )}

      {step === 'look' && (
        <CreatorFirstLook
          name={draft.name}
          imageUrl={images[0]?.url}
          loading={generatingBase}
          error={lookError}
          core={draft.coreIdentity}
          hair={draft.hairIdentity}
          onCoreChange={(next) => patchDraft({ ...draft, coreIdentity: next })}
          onHairChange={(next) => patchDraft({ ...draft, hairIdentity: next })}
          correctionText={correctionText}
          onCorrectionChange={setCorrectionText}
          onApplyCorrection={handleApplyCorrection}
          applyingCorrection={applyingCorrection}
          onRegenerate={handleRegenerateLook}
          onApprove={handleApproveLook}
        />
      )}

      {step === 'lock' && !lockJustApproved && (
        <>
          {packError && <p style={{ font: 'var(--text-sm)', color: 'var(--cherry)', margin: 0 }}>{packError}</p>}
          <IdentityReferencePack
            name={draft.name}
            images={images}
            generating={packGenerating}
            regeneratingIndex={regeneratingIndex}
            primaryIndex={draft.identityReferences.primaryReference}
            allApproved={allApproved}
            onApprove={handleApproveCard}
            onRegenerate={handleRegenerateCard}
            onSetPrimary={handleSetPrimary}
            onApproveAll={handleApproveAllCards}
            onContinue={handleContinueFromLock}
          />
        </>
      )}

      {step === 'lock' && lockJustApproved && (
        <CreatorLockSuccess
          name={draft.name}
          primaryUrl={images[draft.identityReferences.primaryReference ?? 0]?.url}
          onContinue={() => { setLockJustApproved(false); goTo('body'); }}
          onSkipToBrand={() => { setLockJustApproved(false); goTo('brand'); }}
        />
      )}

      {step === 'body' && (
        <>
          {packError && <p style={{ font: 'var(--text-sm)', color: 'var(--cherry)', margin: 0 }}>{packError}</p>}
          <BodyIdentityForm
            draft={draft}
            onChange={patchDraft}
            fullBodyUrl={draft.identityReferences.fullBodyReference}
            onRefineFullBody={handleRefineFullBody}
            refining={refiningBody}
            onContinue={() => goTo('brand')}
          />
        </>
      )}

      {step === 'brand' && (
        <>
          {saveError && <p style={{ font: 'var(--text-sm)', color: 'var(--cherry)', margin: 0 }}>{saveError}</p>}
          <CreatorBrandForm draft={draft} onChange={patchDraft} onSave={handleSaveCreator} saving={saving} />
        </>
      )}

    </div>
  );
}
