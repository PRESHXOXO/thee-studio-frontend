import React from 'react';
import { Card } from '../components/surfaces/Card.jsx';
import { Field } from '../components/forms/Field.jsx';
import { Select } from '../components/forms/Select.jsx';
import { Button } from '../components/core/Button.jsx';
import { PromptOutput } from '../components/feedback/PromptOutput.jsx';
import { Icon } from '../components/core/Icon.jsx';
import { buildDirectorOutputs } from '../api/studio.js';

const CONTENT_TYPES = ['Editorial', 'UGC', 'Product', 'Lifestyle', 'Campaign'].map(v => ({ value: v, label: v }));
const MOODS = ['Warm & confident', 'Soft & dreamy', 'Bold & glossy', 'Natural & candid'].map(v => ({ value: v, label: v }));
const CAMPAIGN_TYPES = ['Brand campaign', 'Social content', 'Lookbook', 'Product launch'].map(v => ({ value: v, label: v }));
const LOCATIONS = ['Rooftop', 'Studio', 'Cafe', 'Suite', 'Street', 'Yacht', 'Penthouse'].map(v => ({ value: v, label: v }));

const LABEL = { font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--text-muted)', margin: 0 };

export function TheeDirector({ onNav }) {
  const [contentType, setContentType] = React.useState('');
  const [mood, setMood] = React.useState('');
  const [campaignType, setCampaignType] = React.useState('');
  const [location, setLocation] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [positive, setPositive] = React.useState('');
  const [negative, setNegative] = React.useState('');

  const handleGenerate = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await buildDirectorOutputs('', location, contentType, mood, campaignType);
      setPositive(result.positivePrompt || result.sceneDesc || '');
      setNegative(result.negativePrompt || '');
    } catch {
      setPositive('');
      setNegative('');
      setError('Backend not connected. Start your Gradio app on port 7860 to generate prompts.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 'var(--content-max)', margin: '0 auto' }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
        <div>
          <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--accent-deep)', marginBottom: 10 }}>Thee Director</div>
          <h1 style={{ font: 'var(--display-lg)', color: 'var(--text-strong)', letterSpacing: '-0.015em', margin: '0 0 10px' }}>Direct with intention. Create with impact.</h1>
          <p style={{ font: 'var(--text-lg)', color: 'var(--text-muted)', margin: 0, maxWidth: 520 }}>Shape content that connects. Dial in every detail. Let Thee Studio™ handle the rest.</p>
        </div>
        <Button variant="dark" onClick={() => onNav && onNav('history')}>
          <Icon name="history" size={15} /> Session history
        </Button>
      </div>

      {/* 3-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '0.95fr 1.05fr 1fr', gap: 16, alignItems: 'start' }}>

        {/* Column 1: Direction Controls */}
        <Card style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <h3 style={LABEL}>Direction Controls</h3>

          <Field label="Content Type">
            <Select value={contentType} onChange={setContentType} options={CONTENT_TYPES} placeholder="Select type…" />
          </Field>
          <Field label="Mood / Tone">
            <Select value={mood} onChange={setMood} options={MOODS} placeholder="Select mood…" />
          </Field>
          <Field label="Campaign Type">
            <Select value={campaignType} onChange={setCampaignType} options={CAMPAIGN_TYPES} placeholder="Select type…" />
          </Field>
          <Field label="Location">
            <Select value={location} onChange={setLocation} options={LOCATIONS} placeholder="Select location…" />
          </Field>
        </Card>

        {/* Column 2: Identity Lock */}
        <Card variant="rose" style={{ display: 'flex', flexDirection: 'column', gap: 20, minHeight: 320 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'var(--champagne)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--plum)' }}>
              <Icon name="lock" size={17} strokeWidth={2} />
            </span>
            <h3 style={{ font: '600 1rem/1 var(--font-ui)', color: 'var(--text-strong)', margin: 0 }}>Identity Lock</h3>
          </div>

          <p style={{ font: 'var(--text-base)', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
            Keep your creator's look, vibe, and essence consistent across outputs.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {['Warm undertone', 'Soft glam styling', 'Expressive eyes', 'Elegant posture'].map(trait => (
              <div key={trait} style={{ display: 'flex', alignItems: 'center', gap: 8, font: 'var(--text-sm)', color: 'var(--text-body)' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-deep)', flexShrink: 0 }} />
                {trait}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 'auto', padding: '10px 14px', background: 'rgba(255,255,255,0.6)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', font: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            Select a character to activate identity lock
          </div>
        </Card>

        {/* Column 3: Prompt Builder */}
        <Card style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={LABEL}>Build Prompt</h3>

          <PromptOutput
            label="Positive Prompt"
            value={positive}
            placeholder="Editorial portrait, golden-hour rooftop, soft glam, warm coral silk, cinematic warm light, 85mm."
          />
          <PromptOutput
            label="Negative Prompt"
            value={negative}
            placeholder="blurry, oversaturated, distorted features, harsh shadows."
          />

          {error && <p style={{ font: 'var(--text-sm)', color: 'var(--cherry)', margin: 0 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <Button variant="primary" loading={loading} onClick={handleGenerate} style={{ flex: 1 }}>
              <Icon name="wand-2" size={15} /> Generate Proof
            </Button>
            <Button variant="secondary" onClick={() => onNav && onNav('library')}>
              Open Library
            </Button>
          </div>
        </Card>

      </div>
    </div>
  );
}
