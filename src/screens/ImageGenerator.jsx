import React from 'react';
import { Card } from '../components/surfaces/Card.jsx';
import { Select } from '../components/forms/Select.jsx';
import { Button } from '../components/core/Button.jsx';
import { Icon } from '../components/core/Icon.jsx';
import { generateImages } from '../api/studio.js';

const ENGINE_OPTIONS    = ['FLUX Schnell', 'OpenAI Image', 'Local ComfyUI'].map(v => ({ value: v, label: v }));
const PERF_OPTIONS      = ['Fast', 'Balanced', 'Best'].map(v => ({ value: v, label: v }));
const STYLE_OPTIONS     = ['Editorial', 'Beauty', 'UGC', 'Product'].map(v => ({ value: v, label: v }));
const FORMAT_OPTIONS    = ['9:16', '4:5', '1:1', '3:4'].map(v => ({ value: v, label: v }));
const QUALITY_OPTIONS   = ['Draft', 'High', 'Master'].map(v => ({ value: v, label: v }));

const FORMAT_DIMS = { '9:16': [576, 1024], '4:5': [640, 800], '1:1': [768, 768], '3:4': [768, 1024] };

const LABEL = { font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 };

export function ImageGenerator() {
  const [engine, setEngine]   = React.useState('FLUX Schnell');
  const [perf, setPerf]       = React.useState('Balanced');
  const [style, setStyle]     = React.useState('Editorial');
  const [format, setFormat]   = React.useState('9:16');
  const [quality, setQuality] = React.useState('High');
  const [loading, setLoading] = React.useState(false);
  const [error, setError]     = React.useState('');
  const [images, setImages]   = React.useState([]);

  const handleGenerate = async () => {
    setError('');
    setLoading(true);
    setImages([]);
    try {
      const [width, height] = FORMAT_DIMS[format] || [768, 1024];
      const result = await generateImages({
        character: '', scene: '', style, mood: perf, extra: quality,
        provider: engine.toLowerCase().includes('comfy') ? 'comfyui' : engine.toLowerCase().includes('openai') ? 'openai' : 'replicate',
        model: '', width, height, seed: -1, steps: 20, cfg: 7, batchSize: 1,
      });
      setImages(result.images || []);
    } catch {
      setError('Backend not connected. Start your Gradio app on port 7860 to generate.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 'var(--content-max)', margin: '0 auto' }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
        <div>
          <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--accent-deep)', marginBottom: 10 }}>Image Generator</div>
          <h1 style={{ font: 'var(--display-lg)', color: 'var(--text-strong)', letterSpacing: '-0.015em', margin: '0 0 10px' }}>Image Generator</h1>
          <p style={{ font: 'var(--text-lg)', color: 'var(--text-muted)', margin: 0, maxWidth: 480 }}>Create studio-grade imagery with precision and style.</p>
        </div>
        <Button variant="primary" loading={loading} onClick={handleGenerate}>
          <Icon name="sparkles" size={15} /> Generate
        </Button>
      </div>

      {/* 5-control bar */}
      <Card style={{ padding: '20px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
          <div>
            <div style={LABEL}>Engine</div>
            <Select value={engine} onChange={setEngine} options={ENGINE_OPTIONS} />
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
      </Card>

      {error && <p style={{ font: 'var(--text-sm)', color: 'var(--cherry)', margin: 0 }}>{error}</p>}

      {/* Canvas / Output */}
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
              aspectRatio: format === '9:16' ? '9/16' : format === '4:5' ? '4/5' : format === '3:4' ? '3/4' : '1/1',
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
