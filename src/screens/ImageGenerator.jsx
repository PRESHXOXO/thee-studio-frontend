import React from 'react';
import { Card } from '../components/surfaces/Card.jsx';
import { Select } from '../components/forms/Select.jsx';
import { Button } from '../components/core/Button.jsx';
import { Icon } from '../components/core/Icon.jsx';
import { generateImage, fetchEngineChoices } from '../api/studio.js';

// These match the backend constants exactly
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
  const [images, setImages]               = React.useState([]);

  // Load engine list from Gradio on mount
  React.useEffect(() => {
    fetchEngineChoices().then(choices => {
      if (choices?.length) {
        const opts = choices.map(c => ({ value: c, label: c }));
        setEngineOptions(opts);
        // Default to first non-"Setup Needed" engine
        const ready = choices.find(c => !c.includes('Setup Needed') && !c.includes('Disabled'));
        setEngine(ready || choices[0]);
      }
    });
  }, []);

  // Pre-fill prompts when coming from Director
  React.useEffect(() => {
    if (initialPrompts?.positivePrompt) setPositive(initialPrompts.positivePrompt);
    if (initialPrompts?.negativePrompt) setNegative(initialPrompts.negativePrompt);
  }, [initialPrompts]);

  const handleGenerate = async () => {
    setError('');
    setLoading(true);
    setImages([]);
    try {
      const [width, height] = FORMAT_DIMS[format] || [832, 1216];
      const result = await generateImage({
        engine,
        performanceMode: perf,
        imageStyle: style,
        imageSize: format,
        quality,
        width,
        height,
        positivePrompt,
        negativePrompt,
      });
      setImages(result.images || []);
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

      {error && <p style={{ font: 'var(--text-sm)', color: 'var(--cherry)', margin: 0 }}>{error}</p>}

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
