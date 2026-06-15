import React from 'react';
import { Card } from '../components/surfaces/Card.jsx';
import { Select } from '../components/forms/Select.jsx';
import { Button } from '../components/core/Button.jsx';
import { Icon } from '../components/core/Icon.jsx';
import { generateImage, fetchEngineChoices, sanitizeForOpenAI } from '../api/studio.js';
import { saveToLibrary } from '../lib/library.js';
import {
  CONTENT_TYPES, MOODS, LOCATIONS, SKIN_TONES, HAIR_STYLES, HAIR_COLORS,
  EYE_DETAILS, JEWELRY_OPTIONS, CLOTHING_VIBES, SPECIAL_FEATURES, GENDERS,
  STANDARD_NEGATIVE, buildStructuredVision, buildFluxVision,
} from '../lib/promptData.js';

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

function loadCharacters() {
  try { return JSON.parse(localStorage.getItem('ts_characters') || '[]'); } catch { return []; }
}

function PromptBuilder({ engine, onApply }) {
  const [open, setOpen]           = React.useState(false);
  const [characters, setChars]    = React.useState(loadCharacters);
  const [charId, setCharId]       = React.useState('none');
  const [contentType, setContent] = React.useState('Portrait');
  const [mood, setMood]           = React.useState('Clean');
  const [scene, setScene]         = React.useState('None');
  const [gender, setGender]       = React.useState('Unspecified');
  const [skinTone, setSkin]       = React.useState('Unspecified');
  const [hairStyle, setHairStyle] = React.useState('Unspecified');
  const [hairColor, setHairColor] = React.useState('Unspecified');
  const [eyeDetail, setEye]       = React.useState('Unspecified');
  const [jewelry, setJewelry]     = React.useState('None');
  const [clothing, setClothing]   = React.useState('Unspecified');
  const [features, setFeatures]   = React.useState('None');
  const [vision, setVision]       = React.useState('');

  React.useEffect(() => {
    if (open) setChars(loadCharacters());
  }, [open]);

  const selectedChar = characters.find(c => c.id === charId) || null;
  const isFlux = engine?.toLowerCase().includes('flux');

  const charOptions = [
    { value: 'none', label: 'No Character — build subject from scratch' },
    ...characters.map(c => ({ value: c.id, label: c.name })),
  ];

  const handleBuild = () => {
    const params = {
      vision, gender, skinTone, hairStyle, hairColor, eyeDetail,
      jewelry, clothing, features, mood, contentType, scene,
      character: selectedChar,
    };
    const positive = isFlux ? buildFluxVision(params) : buildStructuredVision(params);
    onApply({ positive, negative: STANDARD_NEGATIVE });
  };

  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '14px 20px', textAlign: 'left',
        }}
      >
        <div style={{
          width: 30, height: 30, borderRadius: 'var(--radius)',
          background: 'var(--rose-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--accent-deep)', flexShrink: 0,
        }}>
          <Icon name="wand-2" size={15} strokeWidth={1.75} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ font: '600 0.85rem/1 var(--font-ui)', color: 'var(--text-strong)' }}>Prompt Builder</div>
          <div style={{ font: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
            {open ? 'Configure your shoot — build a rich structured prompt in one click' : 'Click to open the structured prompt builder'}
          </div>
        </div>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={16} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
      </button>

      {open && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '20px 20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Character or Subject */}
          <div>
            <div style={LABEL}>Character</div>
            <Select value={charId} onChange={setCharId} options={charOptions} />
          </div>

          {/* Subject fields — only when no character */}
          {!selectedChar && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              <div>
                <div style={LABEL}>Gender</div>
                <Select value={gender} onChange={setGender} options={GENDERS} />
              </div>
              <div>
                <div style={LABEL}>Skin Tone</div>
                <Select value={skinTone} onChange={setSkin} options={SKIN_TONES} />
              </div>
              <div>
                <div style={LABEL}>Eye Detail</div>
                <Select value={eyeDetail} onChange={setEye} options={EYE_DETAILS} />
              </div>
              <div>
                <div style={LABEL}>Special Feature</div>
                <Select value={features} onChange={setFeatures} options={SPECIAL_FEATURES} />
              </div>
            </div>
          )}

          {/* Hair — only when no character */}
          {!selectedChar && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={LABEL}>Hair Style</div>
                <Select value={hairStyle} onChange={setHairStyle} options={HAIR_STYLES} />
              </div>
              <div>
                <div style={LABEL}>Hair Color</div>
                <Select value={hairColor} onChange={setHairColor} options={HAIR_COLORS} />
              </div>
            </div>
          )}

          {/* Shoot settings */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <div>
              <div style={LABEL}>Content Type</div>
              <Select value={contentType} onChange={setContent} options={CONTENT_TYPES} />
            </div>
            <div>
              <div style={LABEL}>Mood</div>
              <Select value={mood} onChange={setMood} options={MOODS} />
            </div>
            <div>
              <div style={LABEL}>Scene / Location</div>
              <Select value={scene} onChange={setScene} options={LOCATIONS} />
            </div>
          </div>

          {/* Outfit */}
          <div>
            <div style={LABEL}>Outfit</div>
            <Select value={clothing} onChange={setClothing} options={CLOTHING_VIBES} />
          </div>

          {/* Jewelry */}
          <div>
            <div style={LABEL}>Jewelry & Accessories</div>
            <Select value={jewelry} onChange={setJewelry} options={JEWELRY_OPTIONS} />
          </div>

          {/* Vision / art direction */}
          <div>
            <div style={LABEL}>Art Direction / Vision</div>
            <textarea
              style={{ ...TEXTAREA, minHeight: 60 }}
              value={vision}
              onChange={e => setVision(e.target.value)}
              placeholder="Any specific direction, angle, lighting, or campaign brief notes…"
            />
          </div>

          {/* Action row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Button variant="primary" onClick={handleBuild} style={{ flexShrink: 0 }}>
              <Icon name="wand-2" size={14} /> Build Prompt
            </Button>
            <span style={{ font: 'var(--text-xs)', color: 'var(--text-faint)' }}>
              {isFlux ? 'FLUX-style prompt' : 'Structured editorial prompt'} · fills both prompt fields
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}

export function ImageGenerator({ initialPrompts }) {
  const [engineOptions, setEngineOptions] = React.useState([]);
  const [engine, setEngine]               = React.useState('');
  const [perf, setPerf]                   = React.useState('Balanced');
  const [style, setStyle]                 = React.useState('Editorial Portrait');
  const [format, setFormat]               = React.useState('Vertical 9:16');
  const [quality, setQuality]             = React.useState('High');
  const [positivePrompt, setPositive]     = React.useState('');
  const [negativePrompt, setNegative]     = React.useState('');
  const [loading, setLoading]             = React.useState(false);
  const [error, setError]                 = React.useState('');
  const [status, setStatus]               = React.useState('');
  const [images, setImages]               = React.useState([]);

  React.useEffect(() => {
    fetchEngineChoices().then(choices => {
      const list = (choices?.length ? choices : FALLBACK_ENGINES);
      const opts = list.map(c => ({ value: c, label: c }));
      setEngineOptions(opts);
      const ready = list.find(c => !c.includes('Setup Needed') && !c.includes('Disabled'));
      setEngine(ready || list[0]);
    });
  }, []);

  React.useEffect(() => {
    if (!engineOptions.length || !engine) return;
    const valid = engineOptions.some(o => o.value === engine);
    if (!valid) {
      const ready = engineOptions.find(o => !o.value.includes('Setup Needed'));
      if (ready) setEngine(ready.value);
    }
  }, [engineOptions]);

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
      const finalPositive = isOpenAI ? sanitizeForOpenAI(positivePrompt) : positivePrompt;
      const result = await generateImage({
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
        <Button variant="primary" loading={loading} onClick={handleGenerate} disabled={!engine}>
          <Icon name="sparkles" size={15} /> Generate
        </Button>
      </div>

      {/* Prompt Builder */}
      <PromptBuilder engine={engine} onApply={({ positive, negative }) => { setPositive(positive); setNegative(negative); }} />

      {/* Controls + prompts */}
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <div style={LABEL}>Positive Prompt</div>
            <textarea
              style={TEXTAREA}
              value={positivePrompt}
              onChange={e => setPositive(e.target.value)}
              placeholder="Describe what you want to generate…"
            />
          </div>
          <div>
            <div style={LABEL}>Negative Prompt</div>
            <textarea
              style={TEXTAREA}
              value={negativePrompt}
              onChange={e => setNegative(e.target.value)}
              placeholder="Describe what to avoid…"
            />
          </div>
        </div>
      </Card>

      {error  && <p style={{ font: 'var(--text-sm)', color: 'var(--cherry)', margin: 0 }}>{error}</p>}
      {status && !error && <p style={{ font: 'var(--text-sm)', color: 'var(--text-muted)', margin: 0 }}>{status}</p>}

      {/* Output canvas */}
      {images.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
          {images.map((src, i) => (
            <div key={i} style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border)' }}>
              <img src={src} alt={`Generated ${i + 1}`} style={{ width: '100%', display: 'block' }} />
            </div>
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
