import React from 'react';
import { sceneFlowChat } from '../api/studio.js';
import { generateSceneFlowVideo } from '../api/sceneFlowVideo.js';
import { generateDirectorPhoto, directorIdentityState } from '../api/directorGeneration.js';
import { useDirectorPendingGeneration } from '../hooks/useDirectorPendingGeneration.js';
import { ReferenceImageTray } from '../components/director/ReferenceImageTray.jsx';
import { DirectorStatusCard } from '../components/director/DirectorStatusCard.jsx';
import { GenerationBatchResults } from '../components/director/GenerationBatchResults.jsx';
import { GenerationProgress } from '../components/feedback/GenerationProgress.jsx';
import { Icon } from '../components/core/Icon.jsx';
import { saveToLibrary } from '../lib/library.js';
import { creatorMemoryPrompt, getCreatorMemory } from '../lib/creatorMemory.js';
import { canonicalCreatorId } from '../lib/cloudCreators.js';
import { normalizeGenerationBatch } from '../lib/generationBatch.js';
import { MAX_DIRECTOR_REFERENCES, MAX_SAVED_CAST_STYLING_REFERENCES } from '../lib/directorReferences.js';
import {
  addSceneShot,
  associateBatchSlotsWithShots,
  buildSceneFlowPrompts,
  deleteSceneShot,
  MAX_RENDERABLE_SCENE_SHOTS,
  moveSceneShot,
  normalizeSceneFlowAuthority,
  updateSceneShot,
  validateSceneFlowScene,
} from '../lib/sceneFlowState.js';
import { clearSceneFlowDraft, loadSceneFlowDraft, saveSceneFlowDraft } from '../lib/sceneFlowPersistence.js';

const HINTS = ['Help me brainstorm a scene', 'Make this feel more candid', 'Build a luxury campaign concept', 'What would you improve?'];
const ROOT = { display: 'flex', flexDirection: 'column', minHeight: 620, background: 'var(--surface-card)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)', overflow: 'hidden' };
const CONVERSATION = { flex: '1 0 320px', minHeight: 280, maxHeight: 'min(58dvh, 680px)', overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 14, scrollPaddingBlock: 18 };
const SMALL = { font: 'var(--text-xs)', color: 'var(--text-faint)', lineHeight: 1.45 };

function cleanReply(text = '') { return String(text || '').trim(); }
function sceneSummary(scene) { return scene ? [scene.title, scene.globals?.location, scene.globals?.mood, scene.globals?.visualStyle, `${scene.shots?.length || 0} shots`].filter(Boolean).join(' · ') : ''; }

function Message({ message }) {
  const user = message.role === 'user';
  return <div aria-label={user ? 'Your message' : 'Scene Flow reply'} style={{ display: 'flex', justifyContent: user ? 'flex-end' : 'flex-start', gap: 8, flexShrink: 0 }}>
    {!user && <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'grid', placeItems: 'center', font: '600 11px/1 var(--font-ui)', flexShrink: 0 }}>S</div>}
    <div style={{ maxWidth: '78%', padding: '11px 14px', borderRadius: user ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: user ? 'var(--accent)' : 'var(--surface-inset)', color: user ? '#fff' : 'var(--text-body)', border: user ? '1px solid var(--accent)' : '1px solid var(--border)', font: '400 14px/1.55 var(--font-ui)', whiteSpace: 'pre-wrap' }}>
      {cleanReply(message.text)}
      {message.images?.length > 0 && <div style={{ display: 'grid', gridTemplateColumns: message.images.length > 1 ? 'repeat(2,minmax(0,1fr))' : '1fr', gap: 8, marginTop: 10 }}>{message.images.map((url, index) => <a key={index} href={url} target="_blank" rel="noreferrer" style={{ display: 'block' }}><img src={url} alt={`Generated ${index + 1}`} style={{ width: '100%', display: 'block', borderRadius: 10, border: '1px solid var(--border)' }} /></a>)}</div>}
      {message.videoUrl && <video src={message.videoUrl} controls playsInline style={{ width: '100%', display: 'block', borderRadius: 10, marginTop: 10 }} />}
    </div>
  </div>;
}

export function SceneFlowV2({ campaignId = null, initialVision = '', initialSettings = null, creator = null, recoveryEnabled = true }) {
  const restored = initialSettings?.workflow === 'talk' ? initialSettings : {};
  const [messages, setMessages] = React.useState([]);
  const [history, setHistory] = React.useState([]);
  const [input, setInput] = React.useState(restored.input || initialVision || '');
  const [references, setReferences] = React.useState([]);
  const [scene, setScene] = React.useState(restored.scene?.schemaVersion === 'scene_flow_v3' ? restored.scene : null);
  const [outputType, setOutputType] = React.useState(restored.outputType || 'photo');
  const [thinking, setThinking] = React.useState(false);
  const [generating, setGenerating] = React.useState(false);
  const [resumedKeyframe, setResumedKeyframe] = React.useState(null);
  const [draftHydrated, setDraftHydrated] = React.useState(false);
  const creatorRef = React.useRef(creator?.id ?? null);
  const messageEndRef = React.useRef(null);
  const persistedSlotsRef = React.useRef(new Set());
  const acceptedBatchRef = React.useRef('');

  React.useEffect(() => {
    const next = creator?.id ?? null;
    if (creatorRef.current === next) return;
    creatorRef.current = next;
    setMessages([]); setHistory([]); setInput(initialVision || ''); setReferences([]); setScene(null); setThinking(false); setGenerating(false); setResumedKeyframe(null);
  }, [creator?.id, initialVision]);
  React.useEffect(() => { messageEndRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' }); }, [messages, thinking]);

  const identity = directorIdentityState(creator, references);
  const roleSummary = [...new Set(references.map(reference => reference.role).filter(Boolean))];
  const sceneAuthority = normalizeSceneFlowAuthority({
    creatorId: identity.creatorId,
    creatorName: creator?.name || '',
    identityLocked: identity.locked,
    referenceRoles: roleSummary,
  });
  const batchSize = scene?.shots?.length || 1;
  const currentSummary = sceneSummary(scene);
  const pendingScope = `talk:${canonicalCreatorId(creator) || creator?.id || 'open'}:${outputType}`;
  const persistenceScope = `talk:${canonicalCreatorId(creator) || creator?.id || 'open'}`;

  React.useEffect(() => {
    let disposed = false;
    setDraftHydrated(false);
    loadSceneFlowDraft(persistenceScope).then(draft => {
      if (disposed || !draft) return;
      const loadedReferences = (draft.references || []).filter(reference => reference.dataUrl);
      const loadedIdentity = directorIdentityState(creator, loadedReferences);
      const loadedAuthority = normalizeSceneFlowAuthority({
        creatorId: loadedIdentity.creatorId,
        creatorName: creator?.name || '',
        identityLocked: loadedIdentity.locked,
        referenceRoles: [...new Set(loadedReferences.map(reference => reference.role).filter(Boolean))],
      });
      let loadedScene = null;
      try { loadedScene = draft.scene ? validateSceneFlowScene(draft.scene, loadedAuthority) : null; } catch {}
      setReferences(loadedReferences);
      setMessages(Array.isArray(draft.messages) ? draft.messages : []);
      setHistory(Array.isArray(draft.history) ? draft.history : []);
      setOutputType(draft.outputType === 'video' ? 'video' : 'photo');
      setScene(loadedScene);
    }).finally(() => { if (!disposed) setDraftHydrated(true); });
    return () => { disposed = true; };
  }, [persistenceScope]);

  React.useEffect(() => {
    if (!draftHydrated) return undefined;
    const timer = window.setTimeout(() => {
      saveSceneFlowDraft(persistenceScope, { scene, messages, history, references, outputType }).catch(() => undefined);
    }, 120);
    return () => window.clearTimeout(timer);
  }, [draftHydrated, persistenceScope, scene, messages, history, references, outputType]);

  const memoryForScene = sceneData => {
    const memory = creator ? getCreatorMemory(canonicalCreatorId(creator) || creator.id) : null;
    const memoryBlock = creatorMemoryPrompt(memory, {
      explicitScene: [sceneData?.sequenceConcept, sceneData?.globals?.location],
      explicitMood: sceneData?.globals?.mood,
      wardrobeIntent: sceneData?.globals?.outfit,
      hairIntent: sceneData?.globals?.hair,
      makeupIntent: sceneData?.globals?.makeup,
      referenceRoles: roleSummary,
    });
    const built = buildSceneFlowPrompts(sceneData, sceneAuthority);
    const prompt = [built.globalPrompt, memoryBlock].filter(Boolean).join('\n\n');
    return { memory, memoryBlock, prompt };
  };

  const persistPhotoAssets = (rawBatch, sceneData = scene) => {
    const batch = associateBatchSlotsWithShots(normalizeGenerationBatch(rawBatch, { requestedCount: sceneData?.shots?.length || batchSize }), sceneData);
    const { memory, prompt } = memoryForScene(sceneData);
    const character = canonicalCreatorId(creator) || creator?.id;
    batch.slots.filter(slot => slot.status === 'succeeded' && slot.imageUrl).forEach(slot => {
      const persistenceKey = `${batch.parentBatchId || 'local'}:${slot.slotIndex}:${slot.imageUrl}`;
      if (persistedSlotsRef.current.has(persistenceKey)) return;
      persistedSlotsRef.current.add(persistenceKey);
      saveToLibrary(slot.imageUrl, { source: 'scene_flow', prompt, campaign: campaignId || undefined, character, mediaType: 'photo', settings: { version: 3, workflow: 'talk', input: sceneData?.sequenceConcept || '', outputType, batchSize: sceneData?.shots?.length || 1, scene: sceneData, sceneShotId: slot.sceneShotId, referenceRoles: roleSummary }, memoryVersion: memory?.version })
        .catch(() => { persistedSlotsRef.current.delete(persistenceKey); });
    });
    return batch;
  };

  const acceptPhotoResult = (result, sceneData = scene) => {
    const batch = persistPhotoAssets(result, sceneData);
    const fingerprint = `${batch.parentBatchId || 'local'}:${batch.status}:${batch.succeededCount}:${batch.providerBlockedCount}:${batch.failedCount}`;
    if (acceptedBatchRef.current !== fingerprint) {
      acceptedBatchRef.current = fingerprint;
      setMessages(current => [...current, { role: 'assistant', text: batch.status === 'partial_success' ? `${batch.succeededCount} of ${batch.requestedCount} images completed. Review or retry the missing slot below.` : 'Your scene is ready. ✨' }]);
    }
    return batch;
  };

  const pendingGeneration = useDirectorPendingGeneration(pendingScope, {
    active: generating,
    enabled: recoveryEnabled,
    onSucceeded: result => {
      try {
        if (outputType === 'photo') acceptPhotoResult(result, scene);
        else {
          const sourceUrl = result.images?.[0];
          if (!sourceUrl) throw new Error('The resumed video keyframe completed without a usable image.');
          setResumedKeyframe(sourceUrl);
          setMessages(current => [...current, { role: 'assistant', text: 'Video keyframe completed. Press Generate video to continue the motion pass; Director will reuse this keyframe.' }]);
        }
      } catch (error) {
        setMessages(current => [...current, { role: 'assistant', text: `⚠️ Generation failed: ${error.message}` }]);
      }
    },
    onBatchUpdate: result => {
      if (outputType === 'photo' && result.images?.length) {
        try { persistPhotoAssets(result, scene); } catch {}
      }
    },
    onFailed: error => setMessages(current => [...current, { role: 'assistant', text: `⚠️ Generation failed: ${error.message}` }]),
  });

  async function send(text) {
    const message = (text ?? input).trim();
    const pendingRefs = references.filter(reference => reference.pending);
    if ((!message && !pendingRefs.length) || thinking || generating) return;
    setMessages(current => [...current, { role: 'user', text: message || `Attached ${pendingRefs.length} reference image${pendingRefs.length === 1 ? '' : 's'}.` }]);
    setInput(''); setThinking(true);
    try {
      const refsContext = pendingRefs.length ? `Newly attached visual roles: ${pendingRefs.map(reference => reference.role).join(', ')}.` : '';
      const backendMessage = [message || refsContext, message && refsContext].filter(Boolean).join('\n\n');
      const response = await sceneFlowChat({
        messagesJson: JSON.stringify(history), userMessage: backendMessage,
        referenceImages: pendingRefs, activeReferenceRoles: roleSummary,
        currentScene: scene ? {
          ...scene,
          creator: { id: sceneAuthority.creatorId, name: sceneAuthority.creatorName, identityLocked: sceneAuthority.identityLocked },
          referenceRoles: sceneAuthority.referenceRoles,
        } : null,
        creator: { id: identity.creatorId, name: creator?.name || '', identityLocked: identity.locked },
      });
      const reply = (response.reply || '').trim() || 'I have the direction. Use the shot board to review it.';
      const nextHistory = response.history?.length ? response.history : [...history, { role: 'user', content: backendMessage }, { role: 'assistant', content: reply }];
      const sceneData = response.scene ? validateSceneFlowScene(response.scene, sceneAuthority) : null;
      setHistory(nextHistory); setMessages(current => [...current, { role: 'assistant', text: reply }]); setThinking(false);
      if (pendingRefs.length) { const ids = new Set(pendingRefs.map(reference => reference.id)); setReferences(current => current.map(reference => ids.has(reference.id) ? { ...reference, pending: false } : reference)); }
      if (sceneData) setScene(sceneData);
    } catch (err) { setThinking(false); setMessages(current => [...current, { role: 'assistant', text: `⚠️ ${err.message}` }]); }
  }

  async function runGeneration(sceneData = scene) {
    if (!sceneData || generating || pendingGeneration.renderStatus === 'still_processing' || identity.warning) return;
    let validatedScene;
    try { validatedScene = validateSceneFlowScene(sceneData, sceneAuthority); }
    catch (error) {
      setMessages(current => [...current, { role: 'assistant', text: `⚠️ ${error.message}` }]);
      return;
    }
    if (outputType === 'photo' && validatedScene.shots.length > MAX_RENDERABLE_SCENE_SHOTS) {
      setMessages(current => [...current, { role: 'assistant', text: `This plan has ${validatedScene.shots.length} shots. THEE STUDIO renders up to ${MAX_RENDERABLE_SCENE_SHOTS} in one parent batch; reduce the board before generating.` }]);
      return;
    }
    setGenerating(true);
    pendingGeneration.setBatch(null);
    persistedSlotsRef.current = new Set();
    acceptedBatchRef.current = '';
    pendingGeneration.setRenderStatus('generating');
    const { prompt, memoryBlock } = memoryForScene(validatedScene);
    const built = buildSceneFlowPrompts(validatedScene, sceneAuthority);
    const shotPrompts = built.shotPrompts.map(shot => ({ ...shot, prompt: [shot.prompt, memoryBlock].filter(Boolean).join('\n\n') }));
    setMessages(current => [...current, { role: 'assistant', text: `Generating ${outputType === 'video' ? 'the video keyframe + motion pass' : `${batchSize} ${batchSize === 1 ? 'photo' : 'photos'}`} now…` }]);
    try {
      if (outputType === 'video') {
        const keyframe = resumedKeyframe
          ? { images: [resumedKeyframe] }
          : await generateDirectorPhoto({ creator, prompt: shotPrompts[0]?.prompt || prompt, references, batchSize: 1, imageSize: validatedScene.globals.aspectRatio || 'Vertical 9:16', requestKey: `${crypto.randomUUID()}-keyframe`, pendingScope, onStatus: pendingGeneration.handleStatus });
        const sourceUrl = keyframe.images?.[0];
        if (!sourceUrl) throw new Error('The video keyframe finished without a usable identity-locked image.');
        const video = await generateSceneFlowVideo({ sourceUrl, prompt, durationSeconds: sceneData.durationSeconds || 5, verticalOutput: sceneData.verticalOutput !== false, requestKey: `${crypto.randomUUID()}-video` });
        if (!video?.result_url) throw new Error('The video provider finished without returning a video.');
        setResumedKeyframe(null);
        setMessages(current => [...current, { role: 'assistant', text: 'Your scene is ready. ✨', videoUrl: video.result_url }]);
      } else {
        const result = await generateDirectorPhoto({ creator, prompt, references, batchSize: validatedScene.shots.length, shotPrompts, imageSize: validatedScene.globals.aspectRatio || 'Vertical 9:16', pendingScope, onStatus: pendingGeneration.handleStatus });
        const batch = acceptPhotoResult(result, validatedScene);
        pendingGeneration.handleStatus({ status: batch.status, batch });
      }
    } catch (err) {
      if (err?.status !== 'still_processing' && err?.code !== 'DIRECTOR_STILL_PROCESSING') {
        pendingGeneration.setRenderStatus(err?.status === 'cancelled' ? 'cancelled' : 'failed');
        setMessages(current => [...current, { role: 'assistant', text: `⚠️ Generation failed: ${err.message}` }]);
      }
    }
    finally { setGenerating(false); }
  }

  function reset() { clearSceneFlowDraft(persistenceScope); setMessages([]); setHistory([]); setInput(initialVision || ''); setReferences([]); setScene(null); setThinking(false); setGenerating(false); setResumedKeyframe(null); }
  function handleReferencesChange(nextReferences) {
    const nextIdentity = directorIdentityState(creator, nextReferences);
    const nextAuthority = normalizeSceneFlowAuthority({
      creatorId: nextIdentity.creatorId,
      creatorName: creator?.name || '',
      identityLocked: nextIdentity.locked,
      referenceRoles: [...new Set(nextReferences.map(reference => reference.role).filter(Boolean))],
    });
    setReferences(nextReferences);
    setScene(current => current ? {
      ...current,
      creator: { id: nextAuthority.creatorId, name: nextAuthority.creatorName, identityLocked: nextAuthority.identityLocked },
      referenceRoles: nextAuthority.referenceRoles,
    } : current);
  }
  function editShot(shot, changes) { setScene(current => updateSceneShot(current, shot.id, changes)); }
  function editGlobal(field, value) { setScene(current => current ? { ...current, globals: { ...current.globals, [field]: value } } : current); }
  function addShot(afterShotId) { setScene(current => addSceneShot(current, afterShotId)); }
  function deleteShot(shotId) { setScene(current => deleteSceneShot(current, shotId)); }
  function moveShot(shotId, direction) { setScene(current => moveSceneShot(current, shotId, direction)); }
  const canSend = Boolean(input.trim()) || references.some(reference => reference.pending);

  return <div style={ROOT}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: '1px solid var(--border)', background: 'var(--surface-inset)' }}><div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'grid', placeItems: 'center', font: '700 14px/1 var(--font-ui)' }}>S</div><div style={{ flex: 1 }}><div style={{ font: '600 15px/1 var(--font-ui)', color: 'var(--text-strong)' }}>Scene Flow</div><div style={SMALL}>Brainstorm freely. Rendering starts only from the explicit Generate button.</div></div>{messages.length > 0 && <button type="button" onClick={reset} disabled={thinking || generating} style={{ padding: '7px 11px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', font: '500 12px/1 var(--font-ui)' }}>New chat</button>}</div>

    <div aria-label="Scene Flow conversation" style={CONVERSATION}>
      {!messages.length ? <div style={{ margin: 'auto', textAlign: 'center', maxWidth: 500, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}><div style={{ width: 58, height: 58, borderRadius: '50%', background: 'var(--grad-coral)', color: '#fff', display: 'grid', placeItems: 'center', font: '700 22px/1 var(--font-ui)' }}>S</div><h3 style={{ margin: 0, font: '600 20px/1.2 var(--font-display)', color: 'var(--text-strong)' }}>What are we creating?</h3><p style={{ margin: 0, font: 'var(--text-sm)', color: 'var(--text-muted)', lineHeight: 1.5 }}>{creator ? `${creator.name} stays on set while we work through the idea.` : 'Pick a Cast member above or build an open-subject scene.'}</p><div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, justifyContent: 'center' }}>{HINTS.map(hint => <button type="button" key={hint} onClick={() => setInput(hint)} style={{ padding: '7px 11px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border)', background: 'var(--cream-deep)', color: 'var(--text-muted)', cursor: 'pointer', font: 'var(--text-xs)' }}>{hint}</button>)}</div></div> : messages.map((message, index) => <Message key={index} message={message} />)}
      {thinking && <div style={{ font: 'var(--text-sm)', color: 'var(--text-muted)' }}>Scene Flow is thinking…</div>}
      <div ref={messageEndRef} data-testid="scene-flow-message-end" />
      {scene && <div aria-label="Scene Flow shot board" style={{ display: 'grid', gap: 10 }}>
        <div><strong style={{ color: 'var(--text-strong)' }}>{scene.title}</strong><div style={SMALL}>{scene.sequenceConcept}</div></div>
        <details><summary style={{ cursor: 'pointer', font: '600 12px/1.4 var(--font-ui)', color: 'var(--text-body)' }}>Global continuity</summary><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 8, marginTop: 9 }}>{['location', 'outfit', 'hair', 'makeup', 'background', 'mood', 'visualStyle', 'cameraLanguage', 'lighting', 'timeOfDay', 'continuity'].map(field => {
          const controlled = ['outfit', 'hair', 'makeup', 'background'].includes(field) && roleSummary.includes(field);
          return <label key={field} style={{ display: 'grid', gap: 4, font: '600 10px/1 var(--font-ui)', textTransform: 'uppercase', color: 'var(--text-faint)' }}>{field.replace(/([A-Z])/g, ' $1')}<input aria-label={`Global ${field}`} value={scene.globals[field]} onChange={event => editGlobal(field, event.target.value)} disabled={thinking || generating || controlled} title={controlled ? `Controlled by the assigned ${field} reference` : ''} style={{ padding: 7, border: '1px solid var(--border)', borderRadius: 8, font: 'var(--text-xs)', textTransform: 'none' }} /></label>;
        })}</div></details>
        {scene.shots.map(shot => <article key={shot.id} data-shot-id={shot.id} style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 12, background: 'var(--surface-inset)', display: 'grid', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><strong style={{ flex: 1, font: '600 12px/1 var(--font-ui)' }}>Shot {shot.index}</strong><button type="button" aria-label={`Move shot ${shot.index} up`} onClick={() => moveShot(shot.id, 'up')} disabled={shot.index === 1 || thinking || generating}>↑</button><button type="button" aria-label={`Move shot ${shot.index} down`} onClick={() => moveShot(shot.id, 'down')} disabled={shot.index === scene.shots.length || thinking || generating}>↓</button><button type="button" aria-label={`Delete shot ${shot.index}`} onClick={() => deleteShot(shot.id)} disabled={scene.shots.length === 1 || thinking || generating}>×</button></div>
          <input aria-label={`Shot ${shot.index} action`} value={shot.action} onChange={event => editShot(shot, { action: event.target.value })} disabled={thinking || generating} placeholder="Action or moment" style={{ padding: 8, border: '1px solid var(--border)', borderRadius: 8, font: 'var(--text-xs)' }} />
          <div style={SMALL}>{[shot.framing, shot.angle, shot.pose, shot.expression].filter(Boolean).join(' · ') || 'Add framing, pose, or expression through chat.'}</div>
          {Object.keys(shot.overrides || {}).length > 0 && <div style={SMALL}>Overrides: {Object.entries(shot.overrides).map(([field, value]) => `${field}: ${value}`).join(' · ')}</div>}
          <button type="button" onClick={() => addShot(shot.id)} disabled={thinking || generating || scene.shots.length >= 12} style={{ justifySelf: 'start' }}>+ Add after</button>
        </article>)}
      </div>}
      <GenerationProgress active={generating || pendingGeneration.renderStatus === 'still_processing'} identityLocked={identity.locked} batchSize={pendingGeneration.batch?.requestedCount || (outputType === 'photo' ? batchSize : 1)} completedCount={pendingGeneration.batch?.slots?.filter(slot => ['succeeded', 'provider_blocked', 'failed', 'cancelled'].includes(slot.status)).length ?? 0} engine={outputType === 'video' ? 'Managed Video' : 'OpenAI'} mode={outputType === 'video' ? 'video' : 'scene'} />
      {pendingGeneration.batch && <GenerationBatchResults batch={associateBatchSlotsWithShots(pendingGeneration.batch, scene)} compact onRetry={slotIndex => pendingGeneration.retrySlot(slotIndex).catch(error => setMessages(current => [...current, { role: 'assistant', text: `⚠️ Retry failed: ${error.message}` }]))} retryingSlots={pendingGeneration.retryingSlots} />}
    </div>

    <div style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-inset)', padding: 14, display: 'flex', flexDirection: 'column', gap: 11 }}>
      {scene && <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}><DirectorStatusCard creator={creator} workflow="Talk It Through" identityLocked={identity.locked} count={pendingGeneration.batch?.requestedCount || (outputType === 'photo' ? batchSize : 1)} format={outputType === 'photo' ? 'PNG' : 'Video'} sceneSummary={currentSummary} referenceRoles={roleSummary} ready={!identity.warning && (outputType === 'video' || batchSize <= MAX_RENDERABLE_SCENE_SHOTS)} warning={identity.warning || (batchSize > MAX_RENDERABLE_SCENE_SHOTS ? `Reduce this ${batchSize}-shot plan to ${MAX_RENDERABLE_SCENE_SHOTS} shots before rendering one parent batch.` : '')} compact generationStatus={pendingGeneration.renderStatus} statusMessage={pendingGeneration.statusMessage} /><div style={{ display: 'flex', justifyContent: 'flex-end' }}><button type="button" onClick={() => runGeneration(scene)} disabled={thinking || generating || pendingGeneration.renderStatus === 'still_processing' || Boolean(identity.warning) || (outputType === 'photo' && batchSize > MAX_RENDERABLE_SCENE_SHOTS)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', border: 0, borderRadius: 'var(--radius-pill)', background: 'var(--accent)', color: '#fff', cursor: 'pointer', opacity: thinking || generating || pendingGeneration.renderStatus === 'still_processing' || identity.warning || (outputType === 'photo' && batchSize > MAX_RENDERABLE_SCENE_SHOTS) ? 0.55 : 1, font: '600 12px/1 var(--font-ui)' }}><Icon name={outputType === 'video' ? 'video' : 'image'} size={13} />{generating ? 'Generating…' : pendingGeneration.renderStatus === 'still_processing' ? 'Render processing' : `Generate ${outputType === 'video' ? 'video' : batchSize === 1 ? 'photo' : `${batchSize} shots`}`}</button></div></div>}
      <ReferenceImageTray references={references} onChange={handleReferencesChange} maxReferences={creator ? MAX_SAVED_CAST_STYLING_REFERENCES : MAX_DIRECTOR_REFERENCES} defaultRole={creator ? 'outfit' : 'identity'} identityLocked={Boolean(creator)} disabled={thinking || generating} compact title="Scene references" description={creator ? `${creator.name} owns Identity. Add Outfit, Background, Makeup, Hair, and Pose together when needed.` : 'Assign one image as Identity, then add up to five styling or scene references.'} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}><div role="radiogroup" aria-label="Scene output format" style={{ display: 'flex', gap: 5 }}>{['photo', 'video'].map(type => <button type="button" key={type} role="radio" aria-checked={outputType === type} onClick={() => setOutputType(type)} disabled={thinking || generating || pendingGeneration.renderStatus === 'still_processing'} style={{ padding: '7px 10px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border)', background: outputType === type ? 'var(--accent)' : 'var(--surface-card)', color: outputType === type ? '#fff' : 'var(--text-muted)', cursor: 'pointer', font: '600 11px/1 var(--font-ui)' }}>{type === 'photo' ? 'Photo sequence' : 'Video'}</button>)}</div>{scene && <span style={SMALL}>{scene.shots.length} planned shot{scene.shots.length === 1 ? '' : 's'} · one parent batch up to 5</span>}</div>
      <div style={{ display: 'flex', gap: 8 }}><textarea value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(); } }} placeholder="Describe the sequence or revise one shot. Rendering starts only from Generate." rows={1} disabled={thinking || generating} style={{ flex: 1, minHeight: 42, maxHeight: 110, resize: 'vertical', padding: '10px 12px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', background: 'var(--surface-card)', color: 'var(--text-body)', font: 'var(--text-sm)', fontFamily: 'inherit' }} /><button type="button" onClick={() => send()} disabled={thinking || generating || !canSend} title="Send" style={{ width: 42, height: 42, borderRadius: 'var(--radius-lg)', border: 0, background: 'var(--accent)', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer', opacity: thinking || generating || !canSend ? 0.45 : 1 }}><Icon name="arrow-up" size={16} /></button></div>
    </div>
  </div>;
}
