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
import { BATCH_OPTIONS } from '../lib/shootOptions.js';
import { normalizeGenerationBatch } from '../lib/generationBatch.js';
import { MAX_DIRECTOR_REFERENCES, MAX_SAVED_CAST_STYLING_REFERENCES } from '../lib/directorReferences.js';

const HINTS = ['Help me brainstorm a scene', 'Make this feel more candid', 'Build a luxury campaign concept', 'What would you improve?'];
const ROOT = { display: 'flex', flexDirection: 'column', minHeight: 620, maxHeight: 'calc(100dvh - 150px)', background: 'var(--surface-card)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)', overflow: 'hidden' };
const SMALL = { font: 'var(--text-xs)', color: 'var(--text-faint)', lineHeight: 1.45 };

function cleanReply(text = '') { return text.replace(/(?:SCENE_DRAFT|GENERATE_SCENE|SCENE_READY):[\s\S]*$/, '').trim(); }
function sceneSummary(scene) { return scene ? [scene.setting, scene.location, scene.wardrobe, scene.hair, scene.makeup, scene.pose, scene.vibe].filter(Boolean).join(' · ') : ''; }
function scenePrompt(scene) { return scene?.full_prompt || [scene?.setting, scene?.wardrobe, scene?.location, scene?.hair, scene?.makeup, scene?.pose, scene?.vibe].filter(Boolean).join('. '); }

function Message({ message }) {
  const user = message.role === 'user';
  return <div style={{ display: 'flex', justifyContent: user ? 'flex-end' : 'flex-start', gap: 8 }}>
    {!user && <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'grid', placeItems: 'center', font: '600 11px/1 var(--font-ui)', flexShrink: 0 }}>S</div>}
    <div style={{ maxWidth: '78%', padding: '11px 14px', borderRadius: user ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: user ? 'var(--accent)' : 'var(--surface-inset)', color: user ? '#fff' : 'var(--text-body)', border: user ? '1px solid var(--accent)' : '1px solid var(--border)', font: '400 14px/1.55 var(--font-ui)', whiteSpace: 'pre-wrap' }}>
      {cleanReply(message.text)}
      {message.images?.length > 0 && <div style={{ display: 'grid', gridTemplateColumns: message.images.length > 1 ? 'repeat(2,minmax(0,1fr))' : '1fr', gap: 8, marginTop: 10 }}>{message.images.map((url, index) => <a key={index} href={url} target="_blank" rel="noreferrer" style={{ display: 'block' }}><img src={url} alt={`Generated ${index + 1}`} style={{ width: '100%', display: 'block', borderRadius: 10, border: '1px solid var(--border)' }} /></a>)}</div>}
      {message.videoUrl && <video src={message.videoUrl} controls playsInline style={{ width: '100%', display: 'block', borderRadius: 10, marginTop: 10 }} />}
    </div>
  </div>;
}

function buildLivedInPrompt(scene, outputType, identityLocked, creatorName) {
  const base = scenePrompt(scene);
  return [
    identityLocked ? `SELECTED CAST — MANDATORY SUBJECT: ${creatorName || 'the identity reference'}. Preserve this exact identity. Never substitute, recast, gender-swap, or invent another person.` : '',
    base,
    'ENVIRONMENTAL INTEGRATION: Render subject and location as one coherent camera exposure. Match perspective, scale, white balance, exposure, grain, focus falloff, shadows, reflections, and environmental color spill.',
    'LIVED-IN MOMENT: Make the subject physically inhabit the location with motivated hands, believable weight, natural contact shadows, observational body language, and a real action instead of a generic centered pose.',
    'CAMERA: Use a plausible human camera position, intentional editorial crop, natural asymmetry, and enough environment to establish place. Avoid stock-photo staging and accidental dead space.',
    outputType === 'video' ? 'MOTION CONTINUITY: Use one motivated continuous action with stable identity, lighting, reflections, and spatial relationships.' : '',
  ].filter(Boolean).join('\n\n');
}

export function SceneFlowV2({ campaignId = null, initialVision = '', initialSettings = null, creator = null }) {
  const restored = initialSettings?.workflow === 'talk' ? initialSettings : {};
  const [messages, setMessages] = React.useState([]);
  const [history, setHistory] = React.useState([]);
  const [input, setInput] = React.useState(restored.input || initialVision || '');
  const [references, setReferences] = React.useState([]);
  const [scene, setScene] = React.useState(restored.scene || null);
  const [outputType, setOutputType] = React.useState(restored.outputType || 'photo');
  const [batchSize, setBatchSize] = React.useState(restored.batchSize || 1);
  const [thinking, setThinking] = React.useState(false);
  const [generating, setGenerating] = React.useState(false);
  const [resumedKeyframe, setResumedKeyframe] = React.useState(null);
  const creatorRef = React.useRef(creator?.id ?? null);
  const bottomRef = React.useRef(null);
  const persistedSlotsRef = React.useRef(new Set());
  const acceptedBatchRef = React.useRef('');

  React.useEffect(() => {
    const next = creator?.id ?? null;
    if (creatorRef.current === next) return;
    creatorRef.current = next;
    setMessages([]); setHistory([]); setInput(initialVision || ''); setReferences([]); setScene(null); setThinking(false); setGenerating(false); setResumedKeyframe(null);
  }, [creator?.id, initialVision]);
  React.useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, thinking, generating]);

  const identity = directorIdentityState(creator, references);
  const roleSummary = [...new Set(references.map(reference => reference.role).filter(Boolean))];
  const currentSummary = sceneSummary(scene);
  const pendingScope = `talk:${canonicalCreatorId(creator) || creator?.id || 'open'}:${outputType}`;

  const memoryForScene = sceneData => {
    const memory = creator ? getCreatorMemory(canonicalCreatorId(creator) || creator.id) : null;
    const memoryBlock = creatorMemoryPrompt(memory, {
      explicitScene: [sceneData?.setting, sceneData?.location],
      explicitMood: sceneData?.vibe,
      wardrobeIntent: sceneData?.wardrobe,
      hairIntent: sceneData?.hair,
      makeupIntent: sceneData?.makeup,
      referenceRoles: roleSummary,
    });
    const prompt = [buildLivedInPrompt(sceneData, outputType, identity.locked, creator?.name), memoryBlock].filter(Boolean).join('\n\n');
    return { memory, prompt };
  };

  const persistPhotoAssets = (rawBatch, sceneData = scene) => {
    const batch = normalizeGenerationBatch(rawBatch, { requestedCount: batchSize });
    const { memory, prompt } = memoryForScene(sceneData);
    const character = canonicalCreatorId(creator) || creator?.id;
    batch.slots.filter(slot => slot.status === 'succeeded' && slot.imageUrl).forEach(slot => {
      const persistenceKey = `${batch.parentBatchId || 'local'}:${slot.slotIndex}:${slot.imageUrl}`;
      if (persistedSlotsRef.current.has(persistenceKey)) return;
      persistedSlotsRef.current.add(persistenceKey);
      saveToLibrary(slot.imageUrl, { source: 'scene_flow', prompt, campaign: campaignId || undefined, character, mediaType: 'photo', settings: { version: 2, workflow: 'talk', input: scenePrompt(sceneData), outputType, batchSize, scene: sceneData, referenceRoles: roleSummary }, memoryVersion: memory?.version })
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
      const castContext = creator
        ? `SELECTED CAST CONTEXT — DO NOT EXPOSE THIS CONTROL LINE: ${creator.name} is the mandatory subject for this scene. Their identity is locked by Thee Studio's renderer. Never replace ${creator.name} with a generic person, another gender, or a demographic default. Do not invent physical traits; refer to the selected Cast member by name or as the subject.`
        : '';
      const refsContext = pendingRefs.length ? `Newly attached visual roles: ${pendingRefs.map(reference => reference.role).join(', ')}.` : '';
      const backendMessage = [castContext, message || refsContext, message && refsContext].filter(Boolean).join('\n\n');
      const response = await sceneFlowChat({ messagesJson: JSON.stringify(history), userMessage: backendMessage, referenceImages: pendingRefs, activeReferenceRoles: roleSummary });
      const reply = (response.reply || '').trim() || 'I have the direction. Tell me what you want to change or ask me to generate it.';
      const nextHistory = response.history?.length ? response.history : [...history, { role: 'user', content: backendMessage }, { role: 'assistant', content: reply }];
      const sceneData = response.scene && Object.keys(response.scene).length ? response.scene : null;
      const nextScene = sceneData ? { ...(scene || {}), ...sceneData, reference_roles: roleSummary, content_type: outputType } : scene;
      setHistory(nextHistory); setMessages(current => [...current, { role: 'assistant', text: reply }]); setThinking(false);
      if (pendingRefs.length) { const ids = new Set(pendingRefs.map(reference => reference.id)); setReferences(current => current.map(reference => ids.has(reference.id) ? { ...reference, pending: false } : reference)); }
      if (sceneData) setScene(nextScene);
      // Only an explicit GENERATE_SCENE marker may auto-render. A draft alone
      // is never billable and never starts generation.
      if (response.generate === true && nextScene) await runGeneration(nextScene);
    } catch (err) { setThinking(false); setMessages(current => [...current, { role: 'assistant', text: `⚠️ ${err.message}` }]); }
  }

  async function runGeneration(sceneData = scene) {
    if (!sceneData || generating || pendingGeneration.renderStatus === 'still_processing' || identity.warning) return;
    setGenerating(true);
    pendingGeneration.setBatch(null);
    persistedSlotsRef.current = new Set();
    acceptedBatchRef.current = '';
    pendingGeneration.setRenderStatus('generating');
    const { prompt } = memoryForScene(sceneData);
    setMessages(current => [...current, { role: 'assistant', text: `Generating ${outputType === 'video' ? 'the video keyframe + motion pass' : `${batchSize} ${batchSize === 1 ? 'photo' : 'photos'}`} now…` }]);
    try {
      if (outputType === 'video') {
        const keyframe = resumedKeyframe
          ? { images: [resumedKeyframe] }
          : await generateDirectorPhoto({ creator, prompt, references, batchSize: 1, imageSize: sceneData.imageSize || sceneData.aspect || 'Vertical 9:16', requestKey: `${crypto.randomUUID()}-keyframe`, pendingScope, onStatus: pendingGeneration.handleStatus });
        const sourceUrl = keyframe.images?.[0];
        if (!sourceUrl) throw new Error('The video keyframe finished without a usable identity-locked image.');
        const video = await generateSceneFlowVideo({ sourceUrl, prompt, durationSeconds: sceneData.durationSeconds || 5, verticalOutput: sceneData.verticalOutput !== false, requestKey: `${crypto.randomUUID()}-video` });
        if (!video?.result_url) throw new Error('The video provider finished without returning a video.');
        setResumedKeyframe(null);
        setMessages(current => [...current, { role: 'assistant', text: 'Your scene is ready. ✨', videoUrl: video.result_url }]);
      } else {
        const result = await generateDirectorPhoto({ creator, prompt, references, batchSize, imageSize: sceneData.imageSize || sceneData.aspect || sceneData.aspect_ratio || 'Vertical 9:16', pendingScope, onStatus: pendingGeneration.handleStatus });
        const batch = acceptPhotoResult(result, sceneData);
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

  function reset() { setMessages([]); setHistory([]); setInput(initialVision || ''); setReferences([]); setScene(null); setThinking(false); setGenerating(false); setResumedKeyframe(null); }
  const canSend = Boolean(input.trim()) || references.some(reference => reference.pending);

  return <div style={ROOT}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: '1px solid var(--border)', background: 'var(--surface-inset)' }}><div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'grid', placeItems: 'center', font: '700 14px/1 var(--font-ui)' }}>S</div><div style={{ flex: 1 }}><div style={{ font: '600 15px/1 var(--font-ui)', color: 'var(--text-strong)' }}>Scene Flow</div><div style={SMALL}>Brainstorm freely. Generation only starts when you ask or press Generate.</div></div>{messages.length > 0 && <button type="button" onClick={reset} disabled={thinking || generating} style={{ padding: '7px 11px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', font: '500 12px/1 var(--font-ui)' }}>New chat</button>}</div>

    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {!messages.length ? <div style={{ margin: 'auto', textAlign: 'center', maxWidth: 500, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}><div style={{ width: 58, height: 58, borderRadius: '50%', background: 'var(--grad-coral)', color: '#fff', display: 'grid', placeItems: 'center', font: '700 22px/1 var(--font-ui)' }}>S</div><h3 style={{ margin: 0, font: '600 20px/1.2 var(--font-display)', color: 'var(--text-strong)' }}>What are we creating?</h3><p style={{ margin: 0, font: 'var(--text-sm)', color: 'var(--text-muted)', lineHeight: 1.5 }}>{creator ? `${creator.name} stays on set while we work through the idea.` : 'Pick a Cast member above or build an open-subject scene.'}</p><div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, justifyContent: 'center' }}>{HINTS.map(hint => <button type="button" key={hint} onClick={() => setInput(hint)} style={{ padding: '7px 11px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border)', background: 'var(--cream-deep)', color: 'var(--text-muted)', cursor: 'pointer', font: 'var(--text-xs)' }}>{hint}</button>)}</div></div> : messages.map((message, index) => <Message key={index} message={message} />)}
      {thinking && <div style={{ font: 'var(--text-sm)', color: 'var(--text-muted)' }}>Scene Flow is thinking…</div>}
      <GenerationProgress active={generating || pendingGeneration.renderStatus === 'still_processing'} identityLocked={identity.locked} batchSize={pendingGeneration.batch?.requestedCount || (outputType === 'photo' ? batchSize : 1)} engine={outputType === 'video' ? 'Managed Video' : 'OpenAI'} mode={outputType === 'video' ? 'video' : 'scene'} />
      {pendingGeneration.batch && <GenerationBatchResults batch={pendingGeneration.batch} compact onRetry={slotIndex => pendingGeneration.retrySlot(slotIndex).catch(error => setMessages(current => [...current, { role: 'assistant', text: `⚠️ Retry failed: ${error.message}` }]))} retryingSlots={pendingGeneration.retryingSlots} />}
      <div ref={bottomRef} />
    </div>

    <div style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-inset)', padding: 14, display: 'flex', flexDirection: 'column', gap: 11 }}>
      {scene && <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}><DirectorStatusCard creator={creator} workflow="Talk It Through" identityLocked={identity.locked} count={pendingGeneration.batch?.requestedCount || (outputType === 'photo' ? batchSize : 1)} format={outputType === 'photo' ? 'PNG' : 'Video'} sceneSummary={currentSummary} referenceRoles={roleSummary} ready={!identity.warning} warning={identity.warning} compact generationStatus={pendingGeneration.renderStatus} statusMessage={pendingGeneration.statusMessage} /><div style={{ display: 'flex', justifyContent: 'flex-end' }}><button type="button" onClick={() => runGeneration(scene)} disabled={thinking || generating || pendingGeneration.renderStatus === 'still_processing' || Boolean(identity.warning)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', border: 0, borderRadius: 'var(--radius-pill)', background: 'var(--accent)', color: '#fff', cursor: thinking || generating || pendingGeneration.renderStatus === 'still_processing' || identity.warning ? 'not-allowed' : 'pointer', opacity: thinking || generating || pendingGeneration.renderStatus === 'still_processing' || identity.warning ? 0.55 : 1, font: '600 12px/1 var(--font-ui)' }}><Icon name={outputType === 'video' ? 'video' : 'image'} size={13} />{generating ? 'Generating…' : pendingGeneration.renderStatus === 'still_processing' ? 'Render processing' : `Generate ${outputType === 'video' ? 'video' : batchSize === 1 ? 'photo' : `${batchSize} photos`}`}</button></div></div>}
      <ReferenceImageTray references={references} onChange={setReferences} maxReferences={creator ? MAX_SAVED_CAST_STYLING_REFERENCES : MAX_DIRECTOR_REFERENCES} defaultRole={creator ? 'outfit' : 'identity'} identityLocked={Boolean(creator)} disabled={thinking || generating} compact title="Scene references" description={creator ? `${creator.name} owns Identity. Add Outfit, Background, Makeup, Hair, and Pose together when needed.` : 'Assign one image as Identity, then add up to five styling or scene references.'} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}><div role="radiogroup" aria-label="Scene output format" style={{ display: 'flex', gap: 5 }}>{['photo', 'video'].map(type => <button type="button" key={type} role="radio" aria-checked={outputType === type} onClick={() => setOutputType(type)} disabled={thinking || generating || pendingGeneration.renderStatus === 'still_processing'} style={{ padding: '7px 10px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border)', background: outputType === type ? 'var(--accent)' : 'var(--surface-card)', color: outputType === type ? '#fff' : 'var(--text-muted)', cursor: 'pointer', font: '600 11px/1 var(--font-ui)' }}>{type === 'photo' ? 'Photo' : 'Video'}</button>)}</div>{outputType === 'photo' && <div style={{ display: 'flex', gap: 5 }}>{BATCH_OPTIONS.map(count => <button type="button" key={count} onClick={() => setBatchSize(count)} disabled={thinking || generating || pendingGeneration.renderStatus === 'still_processing'} style={{ padding: '7px 9px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border)', background: batchSize === count ? 'var(--rose-deep)' : 'var(--surface-card)', color: batchSize === count ? 'var(--accent-deep)' : 'var(--text-muted)', cursor: 'pointer', font: '600 11px/1 var(--font-ui)' }}>{count} image{count > 1 ? 's' : ''}</button>)}</div>}</div>
      <div style={{ display: 'flex', gap: 8 }}><textarea value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(); } }} placeholder="Describe the vibe, revise one detail, or say ‘generate it’…" rows={1} disabled={thinking || generating} style={{ flex: 1, minHeight: 42, maxHeight: 110, resize: 'vertical', padding: '10px 12px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', background: 'var(--surface-card)', color: 'var(--text-body)', font: 'var(--text-sm)', fontFamily: 'inherit' }} /><button type="button" onClick={() => send()} disabled={thinking || generating || !canSend} title="Send" style={{ width: 42, height: 42, borderRadius: 'var(--radius-lg)', border: 0, background: 'var(--accent)', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer', opacity: thinking || generating || !canSend ? 0.45 : 1 }}><Icon name="arrow-up" size={16} /></button></div>
    </div>
  </div>;
}
