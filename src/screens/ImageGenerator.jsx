import React from 'react';
import { Card } from '../components/surfaces/Card.jsx';
import { Select } from '../components/forms/Select.jsx';
import { Button } from '../components/core/Button.jsx';
import { Icon } from '../components/core/Icon.jsx';
import { GenerationProgress } from '../components/feedback/GenerationProgress.jsx';
import { generateImage, characterGenerate, fetchEngineChoices, sanitizeForOpenAI } from '../api/studio.js';
import { saveToLibrary } from '../lib/library.js';

const FALLBACK_ENGINES = [
  'Fast Draft',
  'DreamShaper Classic',
  'Replicate FLUX Schnell',
  'Replicate FLUX Pro',
  'Replicate NSFW XL',
  'OpenAI Image',
  'Prompt Only',
  'Uncensored Portrait XL',
  'Thee Studio Cloud Preview — Setup Needed',
  'Photoreal Portrait — Setup Needed',
  'Editorial Beauty — Setup Needed',
];

const PERF_OPTIONS    = ['Safe CPU', 'Fast Draft', 'Balanced', 'High Detail'].map(v => ({ value: v, label: v }));
const STYLE_OPTIONS   = ['Editorial Portrait', 'Lifestyle Creator', 'Product Shot', 'Fashion Lookbook', 'Beauty Close-Up', 'Cinematic Scene'].map(v => ({ value: v, label: v }));
const FORMAT_OPTIONS  = [
  { value: 'Vertical 9:16',   label: 'Vertical 9:16' },
  { value: 'Instagram 4:5',   label: 'Instagram 4:5' },
  { value: 'Square 1:1',      label: 'Square 1:1' },
  { value: 'Landscape 16:9',  label: 'Landscape 16:9' },
];
const QUALITY_OPTIONS = ['Draft', 'Standard', 'High'].map(v => ({ value: v, label: v }));

const FORMAT_DIMS = {
  'Vertical 9:16':  [832,  1216],
  'Instagram 4:5':  [896,  1120],
  'Square 1:1':     [1024, 1024],
  'Landscape 16:9': [1216, 832],
};

const LABEL = { font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 };

const TEXTAREA = {
  width: '100%', boxSizing: 'border-box', resize: 'vertical',
  minHeight: 80, padding: '10px 12px',
  background: 'var(--input-bg, #fff)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)', font: 'var(--text-sm)', color: 'var(--text-body)',
  lineHeight: 1.5, outline: 'none', fontFamily: 'inherit',
};

function ImageResult({ src, index }) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border)', position: 'relative' }}
    >
      <img src={src} alt={`Generated ${index + 1}`} style={{ width: '100%', display: 'block' }} />
      {hovered && (
        <div style={{ position: 'absolute', bottom: 8, left: 8, right: 8, display: 'flex', gap: 6 }}>
          <a
            href={src}
            download={`thee-studio-${Date.now()}-${index}.jpg`}
            style={{ flex: 1, textDecoration: 'none' }}
          >
            <button style={{
              width: '100%', padding: '7px 0', borderRadius: 'var(--radius-md)',
              background: 'rgba(255,255,255,0.93)', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              font: '500 0.75rem/1 var(--font-ui)', color: 'var(--text-strong)',
              boxShadow: 'var(--shadow-sm)',
            }}>
              <Icon name="download" size={13} /> Download
            </button>
          </a>
        </div>
      )}
    </div>
  );
}

const VIBES     = ['Clean', 'Bold', 'Luxury', 'Raw', 'Romantic', 'Cinematic', 'Moody', 'Soft'];
const LIGHTINGS = ['Natural', 'Golden Hour', 'Blue Hour', 'Studio', 'Night', 'Overcast'];

function Pill({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 14px', borderRadius: 'var(--radius-pill)', cursor: 'pointer',
        border: `1.5px solid ${active ? 'var(--accent-deep)' : 'var(--border)'}`,
        background: active ? 'var(--rose-deep)' : 'transparent',
        color: active ? 'var(--accent-deep)' : 'var(--text-muted)',
        font: '500 0.78rem/1 var(--font-ui)',
        transition: 'all var(--t-fast)',
      }}
    >
      {label}
    </button>
  );
}

export function ImageGenerator({ initialPrompts, onNav }) {
  const [engineOptions, setEngineOptions] = React.useState([]);
  const [engine, setEngine]               = React.useState('OpenAI Image');
  const [perf, setPerf]                   = React.useState('Balanced');
  const [style, setStyle]                 = React.useState('Lifestyle Creator');
  const [format, setFormat]               = React.useState('Vertical 9:16');
  const [quality, setQuality]             = React.useState('High');
  const [positivePrompt, setPositive]     = React.useState('');
  const [negativePrompt, setNegative]     = React.useState('');
  const [loading, setLoading]             = React.useState(false);
  const [error, setError]                 = React.useState('');
  const [status, setStatus]               = React.useState('');
  const [images, setImages]               = React.useState([]);
  const [selectedChar, setSelectedChar]   = React.useState(null);
  const [vibe, setVibe]                   = React.useState('');
  const [lighting, setLighting]           = React.useState('');

  React.useEffect(() => {
    fetchEngineChoices().then(choices => {
      const list = (choices?.length ? choices : FALLBACK_ENGINES);
      const opts = list.map(c => ({ value: c, label: c }));
      setEngineOptions(opts);

      // Always default to OpenAI. Fall back only if OpenAI isn't in the list at all.
      const openai = list.find(c => c.toLowerCase().includes('openai'));
      if (openai) {
        setEngine(openai);
      } else {
        const isReady = c => !c.includes('Setup Needed') && !c.includes('Disabled');
        setEngine(list.find(isReady) || list[0]);
      }
    });
  }, []);

  // No override effect — engine is set once on load and respects user changes after that.

  React.useEffect(() => {
    if (initialPrompts?.positivePrompt) setPositive(initialPrompts.positivePrompt);
    if (initialPrompts?.negativePrompt) setNegative(initialPrompts.negativePrompt);
  }, [initialPrompts]);

  const handleGenerate = async () => {
    setError('');
    setStatus('');
    setLoading(true);
    setImages([]);
    try {
      const validEngines = engineOptions.map(o => o.value);
      const safeEngine = validEngines.includes(engine)
        ? engine
        : validEngines.find(v => !v.includes('Setup Needed')) || validEngines[0];

      if (!safeEngine) {
        throw new Error('No engine selected. Wait for the engine list to load, then try again.');
      }

      const [width, height] = FORMAT_DIMS[format] || [832, 1216];
      const isOpenAI = safeEngine.toLowerCase().includes('openai');
      const modifiers = [vibe, lighting].filter(Boolean).join(', ');
      const builtPrompt = modifiers ? `${positivePrompt}${positivePrompt ? '. ' : ''}${modifiers} lighting and vibe.` : positivePrompt;
      const finalPositive = isOpenAI ? sanitizeForOpenAI(builtPrompt) : builtPrompt;

      // When a character with a reference photo is selected on an OpenAI engine,
      // route through images.edit() for identity lock instead of pure text generation
      const charRefImage = selectedChar?.refImages?.[0];
      const useCharRef = isOpenAI && charRefImage;

      const result = useCharRef
        ? await characterGenerate({
            engineId: safeEngine,
            positivePrompt: finalPositive,
            negativePrompt,
            imageSize: format,
            batchSize: 1,
            characterImage: charRefImage,
          })
        : await generateImage({
            engine: safeEngine,
            performanceMode: perf,
            imageStyle: style,
            imageSize: format,
            quality,
            width,
            height,
            positivePrompt: finalPositive,
            negativePrompt,
          });
      const imgs = result.images || [];
      setImages(imgs);
      if (result.status) setStatus(result.status);
      imgs.forEach(url => {
        saveToLibrary(url, {
          source: 'generator',
          engine: safeEngine,
          prompt: finalPositive.slice(0, 120),
        }).catch(() => {});
      });
    } catch (e) {
      setError(e?.message || 'Generation failed. Make sure your Gradio app is running on port 7860.');
    } finally {
      setLoading(false);
    }
  };

  const aspectStyle = format === 'Vertical 9:16' ? '9/16'
    : format === 'Instagram 4:5' ? '4/5'
    : format === 'Square 1:1' ? '1/1'
    : '16/9';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 'var(--content-max)', margin: '0 auto' }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
        <div>
          <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--accent-deep)', marginBottom: 10 }}>Image Generator</div>
          <h1 style={{ font: 'var(--display-lg)', color: 'var(--text-strong)', letterSpacing: '-0.015em', margin: '0 0 10px' }}>Image Generator</h1>
          <p style={{ font: 'var(--text-lg)', color: 'var(--text-muted)', margin: 0, maxWidth: 480 }}>Create studio-grade imagery with precision and style.</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}>
          <Button variant="primary" loading={loading} onClick={handleGenerate} disabled={!engine}>
            <Icon name="sparkles" size={15} /> Generate
          </Button>
          <GenerationProgress
            active={loading}
            identityLocked={!!(selectedChar?.refImages?.length && engine?.toLowerCase().includes('openai'))}
            engine={engine}
            batchSize={1}
            style={{ width: 280 }}
          />
        </div>
      </div>

      {/* Prompt Builder */}
      <Card style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ font: '600 0.9rem/1 var(--font-ui)', color: 'var(--text-strong)' }}>Prompt</div>
            <div style={{ font: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 3 }}>Describe your shot, or let Thee Studio build it for you</div>
          </div>
          <Button variant="secondary" onClick={() => onNav?.('director')}>
            <Icon name="clapperboard" size={14} /> Build with Thee Studio
          </Button>
        </div>

        <textarea
          style={{ ...TEXTAREA, minHeight: 110 }}
          value={positivePrompt}
          onChange={e => setPositive(e.target.value)}
          placeholder="Describe your shot — subject, scene, style, energy…"
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <div style={{ ...LABEL, marginBottom: 8 }}>Vibe</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {VIBES.map(v => (
                <Pill key={v} label={v} active={vibe === v} onClick={() => setVibe(vibe === v ? '' : v)} />
              ))}
            </div>
          </div>
          <div>
            <div style={{ ...LABEL, marginBottom: 8 }}>Lighting</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {LIGHTINGS.map(l => (
                <Pill key={l} label={l} active={lighting === l} onClick={() => setLighting(lighting === l ? '' : l)} />
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Engine + output settings */}
      <Card style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
          <div>
            <div style={LABEL}>Engine</div>
            <Select
              value={engine}
              onChange={setEngine}
              options={engineOptions}
              placeholder={engineOptions.length ? 'Select engine…' : 'Loading…'}
            />
          </div>
          <div>
            <div style={LABEL}>Performance</div>
            <Select value={perf} onChange={setPerf} options={PERF_OPTIONS} />
          </div>
          <div>
            <div style={LABEL}>Image Style</div>
            <Select value={style} onChange={setStyle} options={STYLE_OPTIONS} />
          </div>
          <div>
            <div style={LABEL}>Format</div>
            <Select value={format} onChange={setFormat} options={FORMAT_OPTIONS} />
          </div>
          <div>
            <div style={LABEL}>Quality</div>
            <Select value={quality} onChange={setQuality} options={QUALITY_OPTIONS} />
          </div>
        </div>

        <div>
          <div style={LABEL}>Negative Prompt</div>
          <textarea
            style={{ ...TEXTAREA, minHeight: 60 }}
            value={negativePrompt}
            onChange={e => setNegative(e.target.value)}
            placeholder="Describe what to avoid…"
          />
        </div>
      </Card>

      {error  && <p style={{ font: 'var(--text-sm)', color: 'var(--cherry)', margin: 0 }}>{error}</p>}
      {status && !error && <p style={{ font: 'var(--text-sm)', color: 'var(--text-muted)', margin: 0 }}>{status}</p>}

      {/* Output canvas */}
      {images.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
          {images.map((src, i) => (
            <ImageResult key={i} src={src} index={i} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{
              aspectRatio: aspectStyle,
              borderRadius: 'var(--radius-lg)',
              background: loading ? 'var(--grad-portrait)' : 'var(--rose-glass)',
              border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: loading ? 0.6 : 0.5,
              transition: 'opacity var(--t-base)',
            }}>
              {!loading && <Icon name="image" size={28} strokeWidth={1} style={{ color: 'var(--border-strong)' }} />}
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
