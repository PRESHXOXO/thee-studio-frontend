import React from 'react';
import { compressImage } from '../lib/imageUtils.js';
import { saveActiveCreatorId } from '../lib/activeCreator.js';
import { persistCloudDocument } from '../lib/cloudStore.js';
import { reconcileCloudCreator } from '../lib/cloudCreators.js';
import {
  blankCreatorDraft, touchDraft, composeDescription, composeBodyDescription, CREATOR_STATUS,
} from '../lib/creatorIdentity.js';
import { useProduction } from '../context/ProductionContext.jsx';
import { CreatorBuilderProgress } from '../components/creatorBuilder/CreatorBuilderProgress.jsx';
import { BaseIdentityForm } from '../components/creatorBuilder/BaseIdentityForm.jsx';
import { CreatorFirstLook } from '../components/creatorBuilder/CreatorFirstLook.jsx';
import { IdentityReferencePack } from '../components/creatorBuilder/IdentityReferencePack.jsx';
import { CreatorLockSuccess } from '../components/creatorBuilder/CreatorLockSuccess.jsx';
import { BodyIdentityForm } from '../components/creatorBuilder/BodyIdentityForm.jsx';
import { CreatorBrandForm } from '../components/creatorBuilder/CreatorBrandForm.jsx';

const DRAFT_KEY = 'ts_creator_draft';

function withoutSignedUrls(draft) {
  return {
    ...draft,
    identityReferences: {
      ...draft.identityReferences,
      images: (draft.identityReferences?.images || []).map(({ url: _url, ...reference }) => reference),
      fullBodyReference: draft.identityReferences?.fullBodyReference
        ? (({ url: _url, ...reference }) => reference)(draft.identityReferences.fullBodyReference)
        : null,
    },
  };
}

function loadSavedDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    // Legacy Gradio drafts contain generated data URLs without stable storage
    // records. Keep form fields, but never treat those images as cloud assets.
    const images = (saved.identityReferences?.images || []).filter(image => image.id && image.storagePath);
    const fullBody = saved.identityReferences?.fullBodyReference;
    return {
      ...blankCreatorDraft(),
      ...saved,
      identityReferences: {
        ...blankCreatorDraft().identityReferences,
        ...saved.identityReferences,
        images,
        fullBodyReference: fullBody?.id && fullBody?.storagePath ? fullBody : null,
      },
    };
  } catch { return null; }
}

function referenceView(row, label) {
  return {
    id: row.id,
    label,
    referenceType: row.reference_type,
    storagePath: row.storage_path,
    originalFilename: row.original_filename,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    width: row.width,
    height: row.height,
    url: row.signed_url,
    status: 'approved',
  };
}

function profileData(draft) {
  const headshot = draft.identityReferences.images.find(image => image.referenceType === 'headshot');
  const additional = draft.identityReferences.images.filter(image => image.referenceType === 'additional');
  return {
    schemaVersion: 1,
    coreIdentity: draft.coreIdentity,
    hairIdentity: draft.hairIdentity,
    bodyIdentity: draft.bodyIdentity,
    brandProfile: draft.brandProfile,
    identityVersion: draft.identityVersion,
    canonicalHeadshotPath: headshot?.storagePath || null,
    canonicalFullBodyPath: draft.identityReferences.fullBodyReference?.storagePath || null,
    additionalReferencePaths: additional.map(reference => reference.storagePath),
  };
}

function identityData(draft) {
  const identityNotes = [
    composeDescription(draft),
    composeBodyDescription(draft),
    draft.hairIdentity.style !== 'Unspecified' ? `${draft.hairIdentity.color} ${draft.hairIdentity.style}` : '',
    draft.brandProfile.energies.join(', '),
  ].filter(Boolean).join('. ');
  return {
    identityNotes,
    lockedTraits: [
      draft.coreIdentity.skinTone,
      draft.coreIdentity.faceShape,
      draft.coreIdentity.eyeShape,
      draft.hairIdentity.style,
      draft.bodyIdentity.overallBuild,
    ].filter(value => value && value !== 'Unspecified'),
    doNotChangeNotes: 'Preserve the saved identity description and canonical creator reference metadata.',
    realismOrientation: 'luxury_high_realism',
  };
}

function profileInput(draft, profileStatus = 'draft') {
  return {
    name: draft.name.trim() || 'Creator',
    description: composeDescription(draft) || null,
    profileStatus,
    profileData: profileData(draft),
    identity: identityData(draft),
  };
}

function mergeCloudProfile(current, loaded) {
  const data = loaded.creator.profile_data || {};
  const headshot = loaded.references.find(reference => reference.reference_type === 'headshot' && reference.is_canonical);
  const additions = loaded.references.filter(reference => reference.reference_type === 'additional');
  const fullBody = loaded.references.find(reference => reference.reference_type === 'full_body' && reference.is_canonical);
  return touchDraft({
    ...current,
    name: loaded.creator.name || current.name,
    cloudCreatorId: loaded.creator.id,
    status: loaded.creator.profile_status === 'complete' ? CREATOR_STATUS.IDENTITY_LOCKED : current.status,
    coreIdentity: { ...current.coreIdentity, ...(data.coreIdentity || {}) },
    hairIdentity: { ...current.hairIdentity, ...(data.hairIdentity || {}) },
    bodyIdentity: { ...current.bodyIdentity, ...(data.bodyIdentity || {}) },
    brandProfile: { ...current.brandProfile, ...(data.brandProfile || {}) },
    identityVersion: data.identityVersion || current.identityVersion,
    identityReferences: {
      ...current.identityReferences,
      images: [
        headshot ? referenceView(headshot, 'Headshot') : null,
        ...additions.map((reference, index) => referenceView(reference, `Reference ${index + 1}`)),
      ].filter(Boolean),
      primaryReference: headshot ? 0 : null,
      fullBodyReference: fullBody ? referenceView(fullBody, 'Full Body') : null,
    },
  });
}

export function ImageGenerator({
  onNav, initialCreatorId = null, initialName = '', initialNiche = '', initialVision = '', initialDescription = '',
}) {
  const { repository } = useProduction();
  const hasArchetypeHandoff = !!(initialName || initialNiche || initialVision || initialDescription);
  const [draft, setDraft] = React.useState(() => {
    if (!initialCreatorId && !hasArchetypeHandoff) {
      const saved = loadSavedDraft();
      if (saved) return saved;
    }
    const fresh = blankCreatorDraft();
    if (initialName) fresh.name = initialName;
    if (initialNiche) fresh.brandProfile.worlds = [initialNiche];
    if (initialVision) fresh.brandProfile.energies = [initialVision];
    if (initialDescription) fresh.coreIdentity.naturalLanguageDescription = initialDescription;
    if (initialCreatorId) fresh.cloudCreatorId = initialCreatorId;
    return fresh;
  });

  const [step, setStep] = React.useState('base');
  const [furthestStep, setFurthestStep] = React.useState('base');
  const [lockJustApproved, setLockJustApproved] = React.useState(false);
  const [restoring, setRestoring] = React.useState(Boolean(initialCreatorId || draft.cloudCreatorId));
  const [savingBase, setSavingBase] = React.useState(false);
  const [headshotUploading, setHeadshotUploading] = React.useState(false);
  const [additionalUploading, setAdditionalUploading] = React.useState(false);
  const [bodyUploading, setBodyUploading] = React.useState(false);
  const [lookError, setLookError] = React.useState('');
  const [packError, setPackError] = React.useState('');
  const [bodyError, setBodyError] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState('');
  const actionLock = React.useRef(false);

  React.useEffect(() => {
    const creatorId = initialCreatorId || draft.cloudCreatorId;
    if (!creatorId) { setRestoring(false); return; }
    let active = true;
    repository.loadCreatorProfile(creatorId).then(loaded => {
      if (!active || !loaded) return;
      const next = mergeCloudProfile(draft, loaded);
      setDraft(next);
      const hasHeadshot = next.identityReferences.images.some(image => image.referenceType === 'headshot');
      const hasBody = Boolean(next.identityReferences.fullBodyReference);
      setFurthestStep(hasBody ? 'brand' : hasHeadshot ? 'body' : 'look');
    }).catch(() => {
      if (active) setSaveError('Could not restore this creator profile.');
    }).finally(() => { if (active) setRestoring(false); });
    return () => { active = false; };
    // Restore once for the route/draft identity; later edits stay local until saved.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCreatorId, repository]);

  React.useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(withoutSignedUrls(draft))); } catch {}
  }, [draft]);

  const goTo = id => {
    setStep(id);
    const order = ['base', 'look', 'lock', 'body', 'brand'];
    if (order.indexOf(id) > order.indexOf(furthestStep)) setFurthestStep(id);
  };
  const patchDraft = next => setDraft(touchDraft(next));

  const persistProfile = async (sourceDraft, profileStatus = 'draft') => {
    const creator = await repository.saveCreatorProfile(sourceDraft.cloudCreatorId, profileInput(sourceDraft, profileStatus));
    const next = sourceDraft.cloudCreatorId ? sourceDraft : { ...sourceDraft, cloudCreatorId: creator.id, id: creator.id };
    setDraft(touchDraft(next));
    return next;
  };

  const handleSaveBase = async () => {
    if (actionLock.current) return;
    actionLock.current = true;
    setSavingBase(true);
    setSaveError('');
    try {
      await persistProfile(draft, 'draft');
      goTo('look');
    } catch {
      setSaveError('Creator draft could not be saved. Try again.');
    } finally {
      actionLock.current = false;
      setSavingBase(false);
    }
  };

  const ensureCreator = async () => draft.cloudCreatorId ? draft : persistProfile(draft, 'draft');

  const handleUploadHeadshot = async file => {
    if (actionLock.current) return;
    actionLock.current = true;
    setHeadshotUploading(true);
    setLookError('');
    try {
      const current = await ensureCreator();
      const uploaded = await repository.uploadReferenceAsset(current.cloudCreatorId, 'headshot', file);
      const reference = referenceView(uploaded, 'Headshot');
      const next = touchDraft({
        ...current,
        status: CREATOR_STATUS.FACE_APPROVED,
        identityReferences: {
          ...current.identityReferences,
          images: [reference, ...current.identityReferences.images.filter(image => image.referenceType === 'additional')],
          primaryReference: 0,
        },
      });
      await persistProfile(next, 'draft');
    } catch (error) {
      setLookError(error.message || 'Headshot upload failed.');
    } finally {
      actionLock.current = false;
      setHeadshotUploading(false);
    }
  };

  const removeReference = async reference => {
    if (!reference?.id || actionLock.current) return;
    actionLock.current = true;
    try {
      await repository.removeReferenceAsset(reference.id);
      const next = touchDraft({
        ...draft,
        identityReferences: {
          ...draft.identityReferences,
          images: draft.identityReferences.images.filter(image => image.id !== reference.id),
          fullBodyReference: draft.identityReferences.fullBodyReference?.id === reference.id
            ? null
            : draft.identityReferences.fullBodyReference,
          primaryReference: reference.referenceType === 'headshot' ? null : draft.identityReferences.primaryReference,
        },
      });
      await persistProfile(next, 'draft');
    } finally {
      actionLock.current = false;
    }
  };

  const handleAdditionalUploads = async files => {
    if (actionLock.current) return;
    actionLock.current = true;
    setAdditionalUploading(true);
    setPackError('');
    try {
      const current = await ensureCreator();
      const additions = [];
      for (const file of files) {
        const uploaded = await repository.uploadReferenceAsset(current.cloudCreatorId, 'additional', file);
        additions.push(referenceView(uploaded, `Reference ${current.identityReferences.images.filter(image => image.referenceType === 'additional').length + additions.length + 1}`));
      }
      const next = touchDraft({
        ...current,
        identityReferences: { ...current.identityReferences, images: [...current.identityReferences.images, ...additions] },
      });
      await persistProfile(next, 'draft');
    } catch (error) {
      setPackError(error.message || 'Reference upload failed.');
    } finally {
      actionLock.current = false;
      setAdditionalUploading(false);
    }
  };

  const handleUploadFullBody = async file => {
    if (actionLock.current) return;
    actionLock.current = true;
    setBodyUploading(true);
    setBodyError('');
    try {
      const current = await ensureCreator();
      const uploaded = await repository.uploadReferenceAsset(current.cloudCreatorId, 'full_body', file);
      const next = touchDraft({
        ...current,
        identityReferences: { ...current.identityReferences, fullBodyReference: referenceView(uploaded, 'Full Body') },
      });
      await persistProfile(next, 'draft');
    } catch (error) {
      setBodyError(error.message || 'Full-body upload failed.');
    } finally {
      actionLock.current = false;
      setBodyUploading(false);
    }
  };

  const headshot = draft.identityReferences.images.find(image => image.referenceType === 'headshot');
  const displayImages = [headshot, ...draft.identityReferences.images.filter(image => image.referenceType === 'additional')].filter(Boolean);

  const handleSaveCreator = async () => {
    if (actionLock.current || saving) return;
    if (!headshot || !draft.identityReferences.fullBodyReference) {
      setSaveError('Add both a headshot and full-body reference before saving.');
      return;
    }
    actionLock.current = true;
    setSaving(true);
    setSaveError('');
    try {
      const completed = touchDraft({ ...draft, status: CREATOR_STATUS.IDENTITY_LOCKED });
      const savedDraft = await persistProfile(completed, 'complete');
      const previewSources = [headshot, ...draft.identityReferences.images.filter(image => image.referenceType === 'additional'), draft.identityReferences.fullBodyReference];
      const previews = (await Promise.all(previewSources.map(reference => compressImage(reference.url).catch(() => null)))).filter(Boolean);
      const newChar = {
        id: savedDraft.cloudCreatorId,
        cloudProfile: true,
        name: savedDraft.name || 'Creator',
        refImages: previews,
        image: previews[0] || null,
        referenceAssets: previewSources.map(({ url: _url, ...reference }) => reference),
        locked: false,
        fields: {
          tone: savedDraft.coreIdentity.skinTone !== 'Unspecified' ? savedDraft.coreIdentity.skinTone : '',
          hair: savedDraft.hairIdentity.style !== 'Unspecified' ? savedDraft.hairIdentity.style : '',
          face: savedDraft.coreIdentity.eyeShape !== 'Unspecified' ? savedDraft.coreIdentity.eyeShape : '',
          body: savedDraft.bodyIdentity.overallBuild !== 'Unspecified' ? savedDraft.bodyIdentity.overallBuild : '',
          wardrobe: savedDraft.brandProfile.signatureClothing !== 'Unspecified' ? savedDraft.brandProfile.signatureClothing : '',
          personality: savedDraft.brandProfile.energies.join(', '),
          niche: savedDraft.brandProfile.worlds.join(', '),
        },
        ...withoutSignedUrls(savedDraft),
      };
      const existing = JSON.parse(localStorage.getItem('ts_characters') || '[]');
      const updated = reconcileCloudCreator(existing, newChar);
      const value = JSON.stringify(updated);
      localStorage.setItem('ts_characters', value);
      await persistCloudDocument('ts_characters', value);
      saveActiveCreatorId(newChar.id);
      localStorage.removeItem(DRAFT_KEY);
      onNav?.('characters');
    } catch (error) {
      setSaveError(error.message || 'Creator could not be saved.');
    } finally {
      actionLock.current = false;
      setSaving(false);
    }
  };

  const statusLabel = {
    [CREATOR_STATUS.DRAFT]: 'Draft',
    [CREATOR_STATUS.FACE_APPROVED]: 'References Added',
    [CREATOR_STATUS.IDENTITY_LOCKED]: 'Complete',
  }[draft.status];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 720, margin: '0 auto' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
          <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--accent-deep)' }}>New Creator</div>
          <span style={{ font: '600 0.7rem/1 var(--font-ui)', color: 'var(--text-faint)', border: '1px solid var(--border)', borderRadius: 'var(--radius-pill)', padding: '3px 10px' }}>
            {restoring ? 'Restoring…' : statusLabel}
          </span>
        </div>
        <h1 style={{ font: 'var(--display-lg)', color: 'var(--text-strong)', letterSpacing: '-0.015em', margin: '0 0 14px' }}>Build with Thee Studio</h1>
        <CreatorBuilderProgress currentStep={step} furthestStep={furthestStep} onJump={id => { setLockJustApproved(false); goTo(id); }} />
      </div>

      {saveError && step !== 'brand' && <p role="alert" style={{ font: 'var(--text-sm)', color: 'var(--cherry)', margin: 0 }}>{saveError}</p>}

      {step === 'base' && (
        <BaseIdentityForm draft={draft} onChange={patchDraft} onSubmit={handleSaveBase} submitting={savingBase || restoring} />
      )}

      {step === 'look' && (
        <CreatorFirstLook
          name={draft.name}
          imageUrl={headshot?.url}
          loading={headshotUploading}
          error={lookError}
          onUpload={handleUploadHeadshot}
          onRemove={() => removeReference(headshot).catch(error => setLookError(error.message))}
          onContinue={() => { patchDraft({ ...draft, status: CREATOR_STATUS.FACE_APPROVED }); goTo('lock'); }}
        />
      )}

      {step === 'lock' && !lockJustApproved && (
        <IdentityReferencePack
          name={draft.name}
          images={displayImages}
          uploading={additionalUploading}
          error={packError}
          onUploadAdditional={handleAdditionalUploads}
          onRemove={reference => removeReference(reference).catch(error => setPackError(error.message))}
          onContinue={() => setLockJustApproved(true)}
        />
      )}

      {step === 'lock' && lockJustApproved && (
        <CreatorLockSuccess
          name={draft.name}
          primaryUrl={headshot?.url}
          onContinue={() => { setLockJustApproved(false); goTo('body'); }}
        />
      )}

      {step === 'body' && (
        <BodyIdentityForm
          draft={draft}
          onChange={patchDraft}
          fullBodyUrl={draft.identityReferences.fullBodyReference?.url}
          onUploadFullBody={handleUploadFullBody}
          onRemoveFullBody={() => removeReference(draft.identityReferences.fullBodyReference).catch(error => setBodyError(error.message))}
          uploading={bodyUploading}
          error={bodyError}
          onContinue={() => goTo('brand')}
        />
      )}

      {step === 'brand' && (
        <>
          {saveError && <p role="alert" style={{ font: 'var(--text-sm)', color: 'var(--cherry)', margin: 0 }}>{saveError}</p>}
          <CreatorBrandForm draft={draft} onChange={patchDraft} onSave={handleSaveCreator} saving={saving} />
        </>
      )}
    </div>
  );
}
