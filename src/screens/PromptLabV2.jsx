import React from 'react';
import { Card } from '../components/surfaces/Card.jsx';
import { Button } from '../components/core/Button.jsx';
import { Icon } from '../components/core/Icon.jsx';
import { GenerationProgress } from '../components/feedback/GenerationProgress.jsx';
import { ImageLightbox } from '../components/feedback/ImageLightbox.jsx';
import { ReferenceImageTray } from '../components/director/ReferenceImageTray.jsx';
import { DirectorStatusCard } from '../components/director/DirectorStatusCard.jsx';
import { GenerationBatchResults } from '../components/director/GenerationBatchResults.jsx';
import { promptLabBuild } from '../api/studio.js';
import { generateDirectorPhoto, directorIdentityState } from '../api/directorGeneration.js';
import { useDirectorPendingGeneration } from '../hooks/useDirectorPendingGeneration.js';
import { saveToLibrary } from '../lib/library.js';
import { persistCloudDocument } from '../lib/cloudStore.js';
import { creatorMemoryPrompt, getCreatorMemory } from '../lib/creatorMemory.js';
import { canonicalCreatorId } from '../lib/cloudCreators.js';
import { BATCH_OPTIONS } from '../lib/shootOptions.js';
import { normalizeGenerationBatch } from '../lib/generationBatch.js';
import { MAX_DIRECTOR_REFERENCES, MAX_SAVED_CAST_STYLING_REFERENCES } from '../lib/directorReferences.js';
import {
  getAdapter, aspectToImageSize,
  FORMATS, ASPECTS, LIGHTINGS, FINISHES, SURPRISE, STANDING_NEGATIVES,
} from '../lib/promptLabAdapters.js';

const LABEL = { font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 };
const TEXTAREA = { width: '100%', boxSizing: 'border-box', resize: 'vertical', minHeight: 110, padding: '12px 14px', background: 'var(--surface-inset)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', font: 'var(--text-sm)', color: 'var(--text-body)', lineHeight: 1.55, outline: 'none', fontFamily: 'inherit' };
const HISTORY_KEY = 'ts_promptlab';
const WARDROBE_INTENT = /\b(?:wear(?:ing)?|outfit|wardrobe|dress|gown|suit|jacket|coat|shirt|top|pants|jeans|skirt|hoodie|sweater|shoes|heels|sneakers|bikini|styling|clothing)\b/i;
const HAIR_INTENT = /\b(?:hair|hairstyle|braids?|locs?|wig|ponytail|bun|bob|curls?|waves?)\b/i;
const MAKEUP_INTENT = /\b(?:makeup|beauty look|glam|lipstick|eyeshadow|eyeliner|blush|contour)\b/i;

function loadHistory() { try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; } }
function pushHistory(entry) {
  const history = loadHistory();
  history.unshift({ id: Date.now(), savedAt: new Date().toISOString(), ...entry });
  if (history.length > 30) history.splice(30);
  try { const value = JSON.stringify(history); localStorage.setItem(HISTORY_KEY, value); void persistCloudDocument(HISTORY_KEY, value).catch(() => undefined); } catch {}
  return history;
}
function Pill({ label, active, onClick }) {
  return <button type="button" onClick={onClick} className="ts-pill" style={{ padding: '6px 13px', borderRadius: 'var(--radius-pill)', cursor: 'pointer', border: `1.5px solid ${active ? 'var(--accent-deep)' : 'var(--border)'}`, background: active ? 'var(--rose-deep)' : 'transparent', color: active ? 'var(--accent-deep)' : 'var(--text-muted)', font: '500 0.78rem/1 var(--font-ui)', fontFamily: 'inherit' }}>{label}</button>;
}
function PillRow({ label, options, value, onChange, withSurprise = true }) {
  const opts = withSurprise ? [SURPRISE, ...options] : options;
  return <div><div style={LABEL}>{label}</div><div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>{opts.map(option => <Pill key={option} label={option} active={value === option} onClick={() => onChange(option)} />)}</div></div>;
}
function PromptBlock({ prompt, onCopy, copied }) {
  return <div style={{ position: 'relative' }}><pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: 'var(--surface-inset)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px 18px', font: '400 0.8rem/1.65 var(--font-mono)', color: 'var(--text-body)' }}>{prompt}</pre><button type="button" onClick={onCopy} title="Copy prompt" style={{ position: 'absolute', top: 10, right: 10, display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 'var(--radius-md)', cursor: 'pointer', background: 'var(--surface-card)', border: '1px solid var(--border)', color: copied ? 'var(--status-ready)' : 'var(--text-muted)', font: '500 0.72rem/1 var(--font-ui)', fontFamily: 'inherit' }}><Icon name={copied ? 'check' : 'copy'} size={12} /> {copied ? 'Copied' : 'Copy'}</button></div>;
}

export function PromptLabV2({ campaignId = null, initialVision = '', initialSettings = null, creator = null, recoveryEnabled = true }) {
  const restored = initialSettings?.workflow === 'describe' ? initialSettings : {};
  const [rawInput, setRawInput] = React.useState(restored.rawInput || initialVision || '');
  const [references, setReferences] = React.useState([]);
  const [format, setFormat] = React.useState(restored.format || SURPRISE);
  const [aspect, setAspect] = React.useState(restored.aspect || SURPRISE);
  const [lighting, setLighting] = React.useState(restored.lighting || SURPRISE);
  const [mood, setMood] = React.useState(restored.mood || SURPRISE);
  const [finish, setFinish] = React.useState(restored.finish || SURPRISE);
  const [batchSize, setBatchSize] = React.useState(restored.batchSize || 1);
  const [building, setBuilding] = React.useState(false);
  const [result, setResult] = React.useState(restored.result || null);
  const [activePrompt, setActivePrompt] = React.useState(restored.activePrompt || restored.result?.prompt || '');
  const [error, setError] = React.useState('');
  const [refusal, setRefusal] = React.useState('');
  const [copied, setCopied] = React.useState(false);
  const [generating, setGenerating] = React.useState(false);
  const [genImages, setGenImages] = React.useState([]);
  const [genError, setGenError] = React.useState('');
  const [lightboxSrc, setLightboxSrc] = React.useState(null);
  const [history, setHistory] = React.useState(loadHistory);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const creatorIdRef = React.useRef(creator?.id ?? null);
  const persistedSlotsRef = React.useRef(new Set());
  const acceptedBatchRef = React.useRef('');
  const adapter = getAdapter('openai');
  const pendingScope = `describe:${canonicalCreatorId(creator) || creator?.id || 'open'}`;

  const generationPromptFor = memory => {
    const memoryBlock = creatorMemoryPrompt(memory, {
      explicitScene: rawInput,
      explicitMood: mood === SURPRISE ? '' : mood,
      wardrobeIntent: WARDROBE_INTENT.test(rawInput) ? rawInput : '',
      hairIntent: HAIR_INTENT.test(rawInput) ? rawInput : '',
      makeupIntent: MAKEUP_INTENT.test(rawInput) ? rawInput : '',
      referenceRoles: refRoles,
    });
    const lockedSubject = creator ? `SELECTED CAST — MANDATORY SUBJECT: ${creator.name}. Preserve this exact Cast identity. Do not substitute, recast, or invent another person.` : '';
    return [lockedSubject, activePrompt, memoryBlock].filter(Boolean).join('\n\n');
  };

  const acceptGeneratedBatch = (rawBatch, generationPrompt, memory) => {
    const batch = normalizeGenerationBatch(rawBatch, { requestedCount: batchSize });
    const images = batch.images || [];
    const fingerprint = `${batch.parentBatchId || 'local'}:${batch.status}:${batch.slots.map(slot => `${slot.slotIndex}:${slot.status}`).join('|')}`;
    if (acceptedBatchRef.current === fingerprint) return batch;
    acceptedBatchRef.current = fingerprint;
    setGenImages(images);
    const character = canonicalCreatorId(creator) || creator?.id;
    batch.slots.filter(slot => slot.status === 'succeeded' && slot.imageUrl).forEach(slot => {
      const persistenceKey = `${batch.parentBatchId || fingerprint}:${slot.slotIndex}`;
      if (persistedSlotsRef.current.has(persistenceKey)) return;
      persistedSlotsRef.current.add(persistenceKey);
      saveToLibrary(slot.imageUrl, { source: 'prompt_lab', parentBatchId: batch.parentBatchId, slotIndex: slot.slotIndex, prompt: generationPrompt, campaign: campaignId || undefined, character, settings: snapshotSettings(), memoryVersion: memory?.version })
        .catch(() => { persistedSlotsRef.current.delete(persistenceKey); });
    });
    return batch;
  };

  const pendingGeneration = useDirectorPendingGeneration(pendingScope, {
    active: generating,
    enabled: recoveryEnabled,
    onSucceeded: generated => {
      try {
        const memory = creator ? getCreatorMemory(canonicalCreatorId(creator) || creator.id) : null;
        acceptGeneratedBatch(generated, generationPromptFor(memory), memory);
      } catch (resumeError) {
        setGenError(resumeError.message || 'Generation failed.');
      }
    },
    onBatchUpdate: generated => {
      if (!generated.images?.length) return;
      try {
        const memory = creator ? getCreatorMemory(canonicalCreatorId(creator) || creator.id) : null;
        acceptGeneratedBatch(generated, generationPromptFor(memory), memory);
      } catch {}
    },
    onFailed: resumeError => setGenError(resumeError.message || 'Generation failed.'),
  });

  React.useEffect(() => {
    const nextId = creator?.id ?? null;
    if (creatorIdRef.current === nextId) return;
    creatorIdRef.current = nextId;
    setReferences([]);
    setResult(null); setActivePrompt(''); setGenImages([]); setError(''); setGenError('');
  }, [creator?.id]);

  const identity = directorIdentityState(creator, references);
  const refRoles = references.map(reference => reference.role);
  const buildRequest = () => ({
    rawInput,
    target: 'openai',
    hasReference: Boolean(identity.locked || references.length),
    creatorLocked: Boolean(creator),
    creatorName: creator?.name || '',
    referenceRoles: refRoles,
    format: format === SURPRISE ? '' : format,
    aspect: aspect === SURPRISE ? '' : aspect,
    lighting: lighting === SURPRISE ? '' : lighting,
    mood: mood === SURPRISE ? '' : mood,
    finish: finish === SURPRISE ? '' : finish,
  });
  const snapshotSettings = () => ({ version: 2, workflow: 'describe', rawInput, format, aspect, lighting, mood, finish, batchSize, activePrompt, result, referenceRoles: refRoles });

  async function handleBuild() {
    if (!rawInput.trim() || building) return;
    setBuilding(true); setError(''); setRefusal(''); setGenImages([]); setGenError('');
    try {
      const request = buildRequest();
      const response = await promptLabBuild(request);
      if (response.refusal) { setRefusal(response.refusal); setResult(null); setActivePrompt(''); }
      else { setResult(response); setActivePrompt(response.prompt || ''); setHistory(pushHistory({ rawInput, request, result: response })); }
    } catch (err) { setError(err.message || 'The prompt could not be built. Try again.'); }
    finally { setBuilding(false); }
  }

  async function handleGenerate() {
    if (!activePrompt || generating || pendingGeneration.renderStatus === 'still_processing' || identity.warning) return;
    setGenerating(true); setGenImages([]); setGenError('');
    pendingGeneration.setBatch(null);
    persistedSlotsRef.current = new Set();
    acceptedBatchRef.current = '';
    pendingGeneration.setRenderStatus('generating');
    try {
      const memory = creator ? getCreatorMemory(canonicalCreatorId(creator) || creator.id) : null;
      const generationPrompt = generationPromptFor(memory);
      const generated = await generateDirectorPhoto({
        creator,
        prompt: generationPrompt,
        negativePrompt: STANDING_NEGATIVES,
        references,
        imageSize: aspectToImageSize(aspect === SURPRISE ? '9:16' : aspect),
        batchSize,
        pendingScope,
        onStatus: pendingGeneration.handleStatus,
      });
      const batch = acceptGeneratedBatch(generated, generationPrompt, memory);
      pendingGeneration.handleStatus({ status: batch.status, batch });
    } catch (err) {
      if (err?.status !== 'still_processing' && err?.code !== 'DIRECTOR_STILL_PROCESSING') {
        pendingGeneration.setRenderStatus(err?.status === 'cancelled' ? 'cancelled' : 'failed');
        setGenError(err.message || 'Generation failed.');
      }
    }
    finally { setGenerating(false); }
  }

  function handleRemix(entry) {
    const request = entry.request || {};
    setRawInput(entry.rawInput || ''); setFormat(request.format || SURPRISE); setAspect(request.aspect || SURPRISE); setLighting(request.lighting || SURPRISE); setMood(request.mood || SURPRISE); setFinish(request.finish || SURPRISE); setResult(entry.result || null); setActivePrompt(entry.result?.prompt || ''); setGenImages([]); setError(''); setRefusal(''); setHistoryOpen(false);
  }

  const moods = result?.moods?.length ? result.moods : [];
  const direction = activePrompt || rawInput;
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 'var(--content-max)', margin: '0 auto' }}>
    <div><div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--accent-deep)', marginBottom: 8 }}>Describe It</div><h2 style={{ font: 'var(--display-lg)', color: 'var(--text-strong)', letterSpacing: '-0.015em', margin: '0 0 8px' }}>You bring the vibe. Director builds the shot.</h2><p style={{ font: 'var(--text-lg)', color: 'var(--text-muted)', margin: 0, maxWidth: 650 }}>Describe the image naturally. Your selected Cast member stays the subject; extra references only control the jobs you assign them.</p></div>

    <Card style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <textarea style={TEXTAREA} value={rawInput} onChange={event => setRawInput(event.target.value)} placeholder={creator ? `${creator.name} at a rooftop dinner in Paris, golden hour, expensive but not trying` : 'a rooftop dinner in Paris, golden hour, expensive but not trying'} />
      <ReferenceImageTray references={references} onChange={setReferences} maxReferences={creator ? MAX_SAVED_CAST_STYLING_REFERENCES : MAX_DIRECTOR_REFERENCES} defaultRole={creator ? 'outfit' : 'identity'} identityLocked={Boolean(creator)} disabled={building || generating} title={creator ? 'Styling & scene references' : 'Visual references'} description={creator ? `${creator.name} already owns the Identity slot. Add up to five Outfit, Background, Hair, Makeup, or Pose references.` : 'Assign one image as Identity, then add up to five styling or scene references.'} />
      {error && <div role="alert" style={{ font: 'var(--text-sm)', color: 'var(--cherry)' }}>{error}</div>}
      {refusal && <div style={{ padding: 12, borderRadius: 'var(--radius-md)', background: 'var(--status-warn-bg)', font: 'var(--text-sm)', color: 'var(--text-body)' }}>{refusal}</div>}
      <Button variant="accent" loading={building} disabled={building || !rawInput.trim()} onClick={handleBuild} style={{ alignSelf: 'flex-start' }}><Icon name="wand-2" size={15} />{building ? 'Engineering…' : result ? 'Rebuild direction' : 'Build direction'}</Button>
    </Card>

    {result && <Card style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ font: '600 0.88rem/1 var(--font-ui)', color: 'var(--text-strong)' }}>Refine</div>
      <PillRow label="Format" options={FORMATS} value={format} onChange={setFormat} /><PillRow label="Aspect Ratio" options={ASPECTS} value={aspect} onChange={setAspect} /><PillRow label="Lighting" options={LIGHTINGS} value={lighting} onChange={setLighting} />{moods.length > 0 && <PillRow label="Mood" options={moods} value={mood} onChange={setMood} />}<PillRow label="Finish" options={FINISHES} value={finish} onChange={setFinish} />
      <div><div style={LABEL}>Images</div><div style={{ display: 'flex', gap: 7 }}>{BATCH_OPTIONS.map(count => <Pill key={count} label={`${count} image${count > 1 ? 's' : ''}`} active={batchSize === count} onClick={() => setBatchSize(count)} />)}</div></div>
    </Card>}

    {result && activePrompt && <Card style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><strong style={{ font: '600 0.88rem/1 var(--font-ui)', color: 'var(--text-strong)' }}>Engineered direction</strong><span style={{ font: 'var(--text-xs)', color: 'var(--text-faint)' }}>{activePrompt.trim().split(/\s+/).length} words</span></div>
      <PromptBlock prompt={activePrompt} copied={copied} onCopy={() => { navigator.clipboard.writeText(activePrompt).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500); }} />
      <p style={{ font: 'var(--text-sm)', color: 'var(--text-muted)', margin: 0 }}>{adapter.note(identity.locked)}</p>
      {result.variants?.length > 0 && <div><div style={LABEL}>Variants</div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 8 }}>{result.variants.map((variant, index) => <button key={index} type="button" onClick={() => setActivePrompt(activePrompt === variant.prompt ? result.prompt : variant.prompt)} style={{ textAlign: 'left', padding: 12, borderRadius: 'var(--radius-md)', border: `1px solid ${activePrompt === variant.prompt ? 'var(--accent-deep)' : 'var(--border)'}`, background: activePrompt === variant.prompt ? 'var(--rose-deep)' : 'var(--surface-inset)', color: 'var(--text-body)', cursor: 'pointer', fontFamily: 'inherit' }}><strong style={{ display: 'block', font: '600 0.78rem/1 var(--font-ui)', marginBottom: 6 }}>{variant.label}</strong><span style={{ font: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.4 }}>{variant.prompt.slice(0, 180)}{variant.prompt.length > 180 ? '…' : ''}</span></button>)}</div></div>}
      <DirectorStatusCard creator={creator} workflow="Describe It" identityLocked={identity.locked} count={pendingGeneration.batch?.requestedCount || batchSize} format="PNG" sceneSummary={direction} referenceRoles={refRoles} ready={!identity.warning} warning={identity.warning} generationStatus={pendingGeneration.renderStatus} statusMessage={pendingGeneration.statusMessage} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}><Button variant="primary" loading={generating} disabled={generating || pendingGeneration.renderStatus === 'still_processing' || Boolean(identity.warning)} onClick={handleGenerate}><Icon name="sparkles" size={15} />{generating ? 'Generating…' : pendingGeneration.renderStatus === 'still_processing' ? 'Render processing' : `Generate ${batchSize === 1 ? 'photo' : `${batchSize} photos`}`}</Button><GenerationProgress active={generating || pendingGeneration.renderStatus === 'still_processing'} identityLocked={identity.locked} batchSize={pendingGeneration.batch?.requestedCount || batchSize} style={{ flex: 1 }} /></div>
      {genError && <div role="alert" style={{ font: 'var(--text-sm)', color: 'var(--cherry)' }}>{genError}</div>}
      {pendingGeneration.batch && <><GenerationBatchResults batch={pendingGeneration.batch} onOpen={setLightboxSrc} onRetry={slotIndex => pendingGeneration.retrySlot(slotIndex).catch(retryError => setGenError(retryError.message || 'Retry failed.'))} retryingSlots={pendingGeneration.retryingSlots} /><div style={{ font: 'var(--text-xs)', color: 'var(--text-faint)' }}>Successful PNG originals are saved to your Library automatically.</div></>}
    </Card>}

    {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    {history.length > 0 && <div><button type="button" onClick={() => setHistoryOpen(value => !value)} style={{ display: 'flex', alignItems: 'center', gap: 7, border: 0, background: 'none', color: 'var(--text-muted)', font: 'var(--label)', cursor: 'pointer', fontFamily: 'inherit' }}><Icon name={historyOpen ? 'chevron-down' : 'chevron-right'} size={13} />Lab History · {history.length}</button>{historyOpen && <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>{history.map(entry => <div key={entry.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: 12, border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--surface-raised)' }}><div style={{ minWidth: 0, font: 'var(--text-sm)', color: 'var(--text-body)' }}>{entry.rawInput}</div><Button variant="secondary" onClick={() => handleRemix(entry)}><Icon name="refresh-cw" size={12} />Remix</Button></div>)}</div>}</div>}
  </div>;
}
