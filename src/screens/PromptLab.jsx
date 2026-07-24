import React from 'react';
import { Card } from '../components/surfaces/Card.jsx';
import { Button } from '../components/core/Button.jsx';
import { Icon } from '../components/core/Icon.jsx';
import { GenerationProgress } from '../components/feedback/GenerationProgress.jsx';
import { ImageLightbox } from '../components/feedback/ImageLightbox.jsx';
import { promptLabBuild, characterGenerate, generateImage, fetchEngineChoices } from '../api/studio.js';
import { saveToLibrary } from '../lib/library.js';
import { compressImage } from '../lib/imageUtils.js';
import {
  TARGET_MODELS, getAdapter, resolveEngineName, aspectToImageSize,
  FORMATS, ASPECTS, LIGHTINGS, FINISHES, SURPRISE, STANDING_NEGATIVES,
} from '../lib/promptLabAdapters.js';

const LABEL = { font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 };
const TEXTAREA = {
  width: '100%', boxSizing: 'border-box', resize: 'vertical', minHeight: 90,
  padding: '12px 14px', background: 'var(--surface-inset)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)', font: 'var(--text-sm)', color: 'var(--text-body)',
  lineHeight: 1.55, outline: 'none', fontFamily: 'inherit',
};

const HISTORY_KEY = 'ts_promptlab';

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
}
function pushHistory(entry) {
  const h = loadHistory();
  h.unshift({ id: Date.now(), savedAt: new Date().toISOString(), ...entry });
  if (h.length > 30) h.splice(30);
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h)); } catch {}
  return h;
}

function Pill({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 13px', borderRadius: 'var(--radius-pill)', cursor: 'pointer',
        border: `1.5px solid ${active ? 'var(--accent-deep)' : 'var(--border)'}`,
        background: active ? 'var(--rose-deep)' : 'transparent',
        color: active ? 'var(--accent-deep)' : 'var(--text-muted)',
        font: '500 0.78rem/1 var(--font-ui)', fontFamily: 'inherit',
        transition: 'all var(--t-fast)',
      }}
    >
      {label}
    </button>
  );
}

function PillRow({ label, options, value, onChange, withSurprise = true }) {
  const opts = withSurprise ? [SURPRISE, ...options] : options;
  return (
    <div>
      <div style={LABEL}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        {opts.map(o => (
          <Pill key={o} label={o} active={value === o} onClick={() => onChange(o)} />
        ))}
      </div>
    </div>
  );
}

// The engineered prompt, rendered as a specification: monospace + copy.
function PromptBlock({ prompt, onCopy, copied }) {
  return (
    <div style={{ position: 'relative' }}>
      <pre style={{
        margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        background: 'var(--surface-inset)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)', padding: '16px 18px',
        font: '400 0.8rem/1.65 var(--font-mono)', color: 'var(--text-body)',
      }}>
        {prompt}
      </pre>
      <button
        onClick={onCopy}
        title="Copy prompt"
        style={{
          position: 'absolute', top: 10, right: 10,
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '6px 10px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
          background: 'var(--surface-card)', border: '1px solid var(--border)',
          color: copied ? 'var(--status-ready)' : 'var(--text-muted)',
          font: '500 0.72rem/1 var(--font-ui)', fontFamily: 'inherit',
        }}
      >
        <Icon name={copied ? 'check' : 'copy'} size={12} /> {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

export function PromptLab({ onNav }) {
  // Step 1 — describe it
  const [rawInput, setRawInput] = React.useState('');
  const [refImage, setRefImage] = React.useState(null); // compressed data URL
  const [target, setTarget]     = React.useState('openai');
  const fileRef = React.useRef(null);

  // Step 2 — refine choices
  const [format, setFormat]     = React.useState(SURPRISE);
  const [aspect, setAspect]     = React.useState(SURPRISE);
  const [lighting, setLighting] = React.useState(SURPRISE);
  const [mood, setMood]         = React.useState(SURPRISE);
  const [finish, setFinish]     = React.useState(SURPRISE);

  // Engine result
  const [building, setBuilding] = React.useState(false);
  const [result, setResult]     = React.useState(null); // engine JSON
  const [refusal, setRefusal]   = React.useState('');
  const [error, setError]       = React.useState('');
  const [activePrompt, setActivePrompt] = React.useState(''); // main or a chosen variant
  const [whyOpen, setWhyOpen]   = React.useState(false);
  const [copied, setCopied]     = React.useState(false);

  // Step 4 — generate
  const [engineChoices, setEngineChoices] = React.useState([]);
  const [generating, setGenerating] = React.useState(false);
  const [genImages, setGenImages]   = React.useState([]);
  const [genError, setGenError]     = React.useState('');
  const [lightboxSrc, setLightboxSrc] = React.useState(null);

  const [history, setHistory] = React.useState(loadHistory);
  const [historyOpen, setHistoryOpen] = React.useState(false);

  const adapter = getAdapter(target);

  React.useEffect(() => {
    fetchEngineChoices().then(choices => { if (choices?.length) setEngineChoices(choices); });
  }, []);

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async ev => setRefImage(await compressImage(ev.target.result));
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const buildRequest = () => ({
    rawInput,
    target,
    hasReference: !!refImage,
    format:   format   === SURPRISE ? '' : format,
    aspect:   aspect   === SURPRISE ? '' : aspect,
    lighting: lighting === SURPRISE ? '' : lighting,
    mood:     mood     === SURPRISE ? '' : mood,
    finish:   finish   === SURPRISE ? '' : finish,
  });

  const handleBuild = async () => {
    if (!rawInput.trim() || building) return;
    setBuilding(true);
    setError('');
    setRefusal('');
    setGenImages([]);
    setGenError('');
    setCopied(false);
    try {
      const request = buildRequest();
      const res = await promptLabBuild(request);
      if (res.refusal) {
        setRefusal(res.refusal);
        setResult(null);
        setActivePrompt('');
      } else {
        setResult(res);
        setActivePrompt(res.prompt || '');
        setHistory(pushHistory({ rawInput, request, result: res, target }));
      }
    } catch (e) {
      setError(e.message || 'The prompt engine failed. Is the backend running?');
    } finally {
      setBuilding(false);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleGenerate = async () => {
    if (!activePrompt || generating || !adapter.generation.available) return;
    setGenerating(true);
    setGenImages([]);
    setGenError('');
    try {
      let images = [];
      if (refImage) {
        const res = await characterGenerate({
          engineId: adapter.generation.engineId,
          positivePrompt: activePrompt,
          negativePrompt: STANDING_NEGATIVES,
          characterImage: refImage,
          imageSize: aspectToImageSize(aspect === SURPRISE ? '9:16' : aspect),
          batchSize: 1,
        });
        images = res.images || [];
      } else {
        const engineName = resolveEngineName(target, engineChoices);
        if (!engineName) {
          throw new Error(`No ready ${adapter.label} engine found. Add the API key in Settings, or upload a reference image to use the direct path.`);
        }
        const res = await generateImage({
          engine: engineName,
          positivePrompt: activePrompt,
          negativePrompt: STANDING_NEGATIVES,
          imageSize: aspectToImageSize(aspect === SURPRISE ? '9:16' : aspect),
          quality: 'High',
        });
        images = res.images || [];
      }
      setGenImages(images);
      images.forEach(url => {
        saveToLibrary(url, {
          source: 'prompt_lab',
          engine: adapter.label,
          prompt: activePrompt.slice(0, 160),
        }).catch(() => {});
      });
    } catch (e) {
      setGenError(e.message || 'Generation failed.');
    } finally {
      setGenerating(false);
    }
  };

  const handleRemix = (entry) => {
    const req = entry.request || {};
    setRawInput(entry.rawInput || '');
    setTarget(entry.target || 'openai');
    setFormat(req.format || SURPRISE);
    setAspect(req.aspect || SURPRISE);
    setLighting(req.lighting || SURPRISE);
    setMood(req.mood || SURPRISE);
    setFinish(req.finish || SURPRISE);
    setResult(entry.result || null);
    setActivePrompt(entry.result?.prompt || '');
    setRefusal('');
    setError('');
    setGenImages([]);
    setHistoryOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const moods = result?.moods?.length ? result.moods : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 'var(--content-max)', margin: '0 auto' }}>

      {/* Header */}
      <div>
        <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--accent-deep)', marginBottom: 10 }}>Prompt Lab</div>
        <h1 style={{ font: 'var(--display-lg)', color: 'var(--text-strong)', letterSpacing: '-0.015em', margin: '0 0 10px' }}>
          You bring the vibe. The lab brings the lens.
        </h1>
        <p style={{ font: 'var(--text-lg)', color: 'var(--text-muted)', margin: 0, maxWidth: 560 }}>
          Describe the image in plain, messy words — the engine returns a cinema-grade prompt built for the model you're targeting, then generates it right here.
        </p>
      </div>

      {/* Step 1 — Describe it */}
      <Card style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <textarea
          style={{ ...TEXTAREA, minHeight: 110 }}
          value={rawInput}
          onChange={e => setRawInput(e.target.value)}
          placeholder="me at a rooftop dinner in Paris, golden hour, expensive but not trying"
        />

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          {/* Reference upload */}
          <div>
            <div style={LABEL}>Reference or character to keep consistent <span style={{ textTransform: 'none', letterSpacing: 0 }}>(optional)</span></div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />
            {refImage ? (
              <div style={{ position: 'relative', width: 64, height: 84 }}>
                <img src={refImage} alt="Reference" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} />
                <button
                  onClick={() => setRefImage(null)}
                  style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: 'var(--cherry)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                >✕</button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                style={{
                  width: 64, height: 84, borderRadius: 8, cursor: 'pointer',
                  border: '1.5px dashed var(--border)', background: 'var(--surface-inset)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)',
                }}
              >
                <Icon name="image-plus" size={18} strokeWidth={1.5} />
              </button>
            )}
          </div>

          {/* Target model */}
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={LABEL}>Target Model</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {TARGET_MODELS.map(m => (
                <button
                  key={m.id}
                  onClick={() => setTarget(m.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '8px 14px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                    border: `1.5px solid ${target === m.id ? 'var(--accent-deep)' : 'var(--border)'}`,
                    background: target === m.id ? 'var(--rose-deep)' : 'transparent',
                    color: target === m.id ? 'var(--accent-deep)' : 'var(--text-muted)',
                    font: '500 0.8rem/1 var(--font-ui)', fontFamily: 'inherit',
                    transition: 'all var(--t-fast)',
                  }}
                >
                  <Icon name={m.icon} size={13} strokeWidth={1.75} />
                  {m.label}
                  <span style={{ font: '400 0.68rem/1 var(--font-ui)', opacity: 0.65 }}>{m.sublabel}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && <p style={{ font: 'var(--text-sm)', color: 'var(--cherry)', margin: 0 }}>{error}</p>}
        {refusal && (
          <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'var(--status-warn-bg)', border: '1px solid rgba(255,178,56,0.35)', font: 'var(--text-sm)', color: 'var(--text-body)', lineHeight: 1.5 }}>
            {refusal}
          </div>
        )}

        <Button variant="accent" loading={building} disabled={building || !rawInput.trim()} onClick={handleBuild} style={{ alignSelf: 'flex-start' }}>
          <Icon name="wand-2" size={15} style={building ? { animation: 'spin 1.2s linear infinite' } : {}} />
          {building ? 'Engineering…' : result ? 'Rebuild prompt' : 'Build my prompt'}
        </Button>
      </Card>

      {/* Step 2 — Refine choices (appears after first build; rebuild applies them) */}
      {result && (
        <Card style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ font: '600 0.88rem/1 var(--font-ui)', color: 'var(--text-strong)' }}>Refine</div>
          <PillRow label="Format" options={FORMATS} value={format} onChange={setFormat} />
          <PillRow label="Aspect Ratio" options={ASPECTS} value={aspect} onChange={setAspect} />
          <PillRow label="Lighting" options={LIGHTINGS} value={lighting} onChange={setLighting} />
          {moods.length > 0 && <PillRow label="Mood — generated for this idea" options={moods} value={mood} onChange={setMood} />}
          <PillRow label="Finish" options={FINISHES} value={finish} onChange={setFinish} />
          <div style={{ font: 'var(--text-xs)', color: 'var(--text-faint)' }}>
            Adjust anything, then hit Rebuild prompt above. "Surprise me" lets the engine choose.
          </div>
        </Card>
      )}

      {/* Step 3 — Engineered prompt */}
      {result && activePrompt && (
        <Card style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ font: '600 0.88rem/1 var(--font-ui)', color: 'var(--text-strong)' }}>
              Engineered Prompt
              <span style={{ marginLeft: 10, font: '500 0.72rem/1 var(--font-ui)', color: 'var(--accent-deep)', background: 'var(--rose-deep)', padding: '3px 9px', borderRadius: 'var(--radius-pill)' }}>
                {adapter.label}
              </span>
            </div>
            <span style={{ font: 'var(--text-xs)', color: 'var(--text-faint)' }}>
              {activePrompt.trim().split(/\s+/).length} words
            </span>
          </div>

          <PromptBlock prompt={activePrompt} copied={copied} onCopy={() => handleCopy(activePrompt)} />

          <p style={{ font: 'var(--text-sm)', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
            {adapter.note(!!refImage)}
          </p>

          {/* Why this works */}
          {result.why_this_works?.length > 0 && (
            <div>
              <button
                onClick={() => setWhyOpen(o => !o)}
                style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: '600 0.8rem/1 var(--font-ui)', color: 'var(--accent-deep)', fontFamily: 'inherit' }}
              >
                <Icon name={whyOpen ? 'chevron-down' : 'chevron-right'} size={14} /> Why this works
              </button>
              {whyOpen && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                  {result.why_this_works.map((w, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                      <span style={{ font: '600 0.75rem/1.5 var(--font-mono)', color: 'var(--accent-deep)', flexShrink: 0 }}>{w.choice}</span>
                      <span style={{ font: 'var(--text-sm)', color: 'var(--text-muted)', lineHeight: 1.5 }}>{w.effect}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Variants */}
          {result.variants?.length > 0 && (
            <div>
              <div style={LABEL}>Variants</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                {result.variants.map((v, i) => {
                  const active = activePrompt === v.prompt;
                  return (
                    <button
                      key={i}
                      onClick={() => { setActivePrompt(active ? result.prompt : v.prompt); setGenImages([]); }}
                      style={{
                        textAlign: 'left', padding: '12px 14px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                        border: `1.5px solid ${active ? 'var(--accent-deep)' : 'var(--border)'}`,
                        background: active ? 'var(--rose-deep)' : 'var(--surface-inset)',
                        fontFamily: 'inherit', transition: 'all var(--t-fast)',
                      }}
                    >
                      <div style={{ font: '600 0.8rem/1 var(--font-ui)', color: active ? 'var(--accent-deep)' : 'var(--text-strong)', marginBottom: 6 }}>{v.label}</div>
                      <div style={{ font: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.45, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                        {v.prompt}
                      </div>
                    </button>
                  );
                })}
              </div>
              {activePrompt !== result.prompt && (
                <div style={{ font: 'var(--text-xs)', color: 'var(--accent-deep)', marginTop: 8 }}>
                  Variant selected — click it again to go back to the main prompt.
                </div>
              )}
            </div>
          )}

          {/* Step 4 — Generate */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {adapter.generation.available ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <Button variant="primary" loading={generating} disabled={generating} onClick={handleGenerate}>
                    <Icon name="sparkles" size={15} style={generating ? { animation: 'spin 1s linear infinite' } : {}} />
                    {generating ? 'Generating…' : `Generate with ${adapter.label}`}
                  </Button>
                  <GenerationProgress active={generating} identityLocked={!!refImage} engine={adapter.label} batchSize={1} style={{ flex: 1 }} />
                </div>
                {genError && <p style={{ font: 'var(--text-sm)', color: 'var(--cherry)', margin: 0 }}>{genError}</p>}
                {genImages.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
                    {genImages.map((url, i) => (
                      <div key={i} onClick={() => setLightboxSrc(url)} style={{ aspectRatio: '3/4', borderRadius: 'var(--radius-lg)', overflow: 'hidden', cursor: 'zoom-in', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}>
                        <img src={url} alt={`Generated ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      </div>
                    ))}
                  </div>
                )}
                {genImages.length > 0 && (
                  <div style={{ font: 'var(--text-xs)', color: 'var(--text-faint)' }}>
                    Saved to your Library automatically.
                  </div>
                )}
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <Button variant="secondary" onClick={() => handleCopy(activePrompt)}>
                  <Icon name="copy" size={14} /> {adapter.generation.copyLabel}
                </Button>
                <span style={{ font: 'var(--text-xs)', color: 'var(--text-faint)', maxWidth: 420, lineHeight: 1.5 }}>
                  {adapter.label} generation runs outside Thee Studio — paste this prompt there. In-app generation covers Nano Banana and GPT Image.
                </span>
              </div>
            )}
          </div>
        </Card>
      )}

      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}

      {/* History / Remix */}
      {history.length > 0 && (
        <div>
          <button
            onClick={() => setHistoryOpen(o => !o)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--text-muted)', padding: 0, fontFamily: 'inherit' }}
          >
            <Icon name={historyOpen ? 'chevron-down' : 'chevron-right'} size={13} />
            Lab History · {history.length}
          </button>
          {historyOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              {history.map(entry => (
                <div key={entry.id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'var(--surface-raised)', border: '1px solid var(--border)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ font: 'var(--text-xs)', color: 'var(--text-faint)', marginBottom: 4 }}>
                      {new Date(entry.savedAt).toLocaleString()} · {getAdapter(entry.target).label}
                    </div>
                    <div style={{ font: 'var(--text-sm)', color: 'var(--text-body)', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {entry.rawInput}
                    </div>
                  </div>
                  <Button variant="secondary" onClick={() => handleRemix(entry)} style={{ flexShrink: 0, fontSize: '0.75rem' }}>
                    <Icon name="refresh-cw" size={12} /> Remix
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
