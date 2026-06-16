import React from 'react';
import { Button } from '../components/core/Button.jsx';
import { Card } from '../components/surfaces/Card.jsx';
import { Icon } from '../components/core/Icon.jsx';
import { saveApiKey, saveGeminiKey, saveReplicateKey } from '../api/studio.js';

const ENGINES = [
  { id: 'openai',              name: 'OpenAI — gpt-image-2',           desc: 'Cloud · photorealistic studio quality',              status: 'dynamic',     statusKey: 'ts_openai_configured',    icon: 'cloud' },
  { id: 'nano_banana',         name: 'Nano Banana',                    desc: 'Google Gemini 2.5 Flash · free tier · 60 rpm',       status: 'dynamic',     statusKey: 'ts_gemini_configured',    icon: 'zap' },
  { id: 'photomaker',          name: 'PhotoMaker — Identity Lock',      desc: 'Replicate · face-locked from your reference photo',  status: 'dynamic',     statusKey: 'ts_replicate_configured', icon: 'scan-face' },
  { id: 'instantid',           name: 'InstantID',                      desc: 'Replicate · SDXL face-locked character shots',       status: 'dynamic',     statusKey: 'ts_replicate_configured', icon: 'fingerprint' },
  { id: 'flux_schnell',        name: 'FLUX Schnell',                   desc: 'Replicate · fast editorial proofs',                  status: 'dynamic',     statusKey: 'ts_replicate_configured', icon: 'flame' },
  { id: 'comfyui',             name: 'Local ComfyUI',                  desc: 'On your machine · full control',                     status: 'needs-setup', statusKey: null,                      icon: 'cpu' },
  { id: 'prompt',              name: 'Prompt Only',                    desc: 'No image engine · writes prompts',                   status: 'idle',        statusKey: null,                      icon: 'type' },
];

const STATUS_CONFIG = {
  'connected':   { label: 'Connected',    color: 'var(--status-ready)', bg: 'var(--status-ready-bg)' },
  'needs-setup': { label: 'Needs setup',  color: 'var(--status-warn)',  bg: 'var(--status-warn-bg)' },
  'idle':        { label: 'Idle',         color: 'var(--status-off)',   bg: 'var(--status-off-bg)' },
};

function resolveEngineStatus(engine) {
  if (engine.status !== 'dynamic') return engine.status;
  return engine.statusKey && localStorage.getItem(engine.statusKey) === '1' ? 'connected' : 'needs-setup';
}

function EngineRow({ engine, isActive, onSelect }) {
  const s = STATUS_CONFIG[engine.status];
  return (
    <div
      onClick={() => onSelect(engine.id)}
      style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
        borderRadius: 'var(--radius-md)', cursor: 'pointer',
        background: isActive ? 'var(--rose-glass)' : 'transparent',
        border: `1px solid ${isActive ? 'var(--border-strong)' : 'transparent'}`,
        transition: 'all var(--t-fast)',
      }}
    >
      <span style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', background: 'var(--cream-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-deep)', flexShrink: 0 }}>
        <Icon name={engine.icon} size={18} strokeWidth={1.75} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ font: '600 0.9375rem/1 var(--font-ui)', color: 'var(--text-strong)' }}>{engine.name}</div>
        <div style={{ font: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 3 }}>{engine.desc}</div>
      </div>
      <span style={{ font: '500 0.75rem/1 var(--font-ui)', color: s.color, background: s.bg, padding: '4px 10px', borderRadius: 'var(--radius-pill)', flexShrink: 0 }}>
        {s.label}
      </span>
    </div>
  );
}

function KeyField({ label, description, placeholder, localStorageKey, onSave, onSaved }) {
  const [key, setKey] = React.useState('');
  const [st, setSt] = React.useState(null);
  const [err, setErr] = React.useState('');

  async function handleSave() {
    if (!key.trim()) return;
    setSt('saving'); setErr('');
    try {
      await onSave(key.trim());
      if (localStorageKey) localStorage.setItem(localStorageKey, '1');
      setSt('ok'); setKey('');
      onSaved?.();
    } catch (e) { setSt('error'); setErr(e.message); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <div style={{ font: '600 0.9375rem/1 var(--font-ui)', color: 'var(--text-strong)' }}>{label}</div>
        <div style={{ font: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 3 }}>{description}</div>
      </div>
      {st === 'ok' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, font: 'var(--text-sm)', color: 'var(--status-ready)', background: 'var(--status-ready-bg)', padding: '9px 12px', borderRadius: 'var(--radius-md)' }}>
          <Icon name="check-circle" size={14} /> Saved — ready to use.
        </div>
      )}
      {st === 'error' && (
        <div style={{ font: 'var(--text-sm)', color: 'var(--status-warn)', background: 'var(--status-warn-bg)', padding: '9px 12px', borderRadius: 'var(--radius-md)' }}>{err}</div>
      )}
      <div style={{ display: 'flex', gap: 10 }}>
        <input
          type="password" value={key}
          onChange={e => { setKey(e.target.value); setSt(null); }}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          placeholder={placeholder}
          style={{ flex: 1, padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', background: 'var(--surface-input, var(--cream-light))', font: 'var(--text-sm)', color: 'var(--text-strong)', outline: 'none', fontFamily: 'monospace', letterSpacing: '0.05em' }}
        />
        <Button variant="primary" onClick={handleSave} disabled={!key.trim() || st === 'saving'}>
          {st === 'saving' ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </div>
  );
}

export function Settings() {
  const [activeEngine, setActiveEngine] = React.useState('openai');
  const [savedTick, setSavedTick] = React.useState(0);
  const engineDef = ENGINES.find(e => e.id === activeEngine);
  const engine = engineDef ? { ...engineDef, status: resolveEngineStatus(engineDef) } : engineDef;
  const s = STATUS_CONFIG[engine?.status || 'idle'];

  const onKeySaved = React.useCallback(() => setSavedTick(t => t + 1), []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 'var(--content-max)', margin: '0 auto' }}>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
        <div>
          <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--accent-deep)', marginBottom: 10 }}>Settings</div>
          <h1 style={{ font: 'var(--display-lg)', color: 'var(--text-strong)', letterSpacing: '-0.015em', margin: '0 0 10px' }}>Engine Library</h1>
          <p style={{ font: 'var(--text-lg)', color: 'var(--text-muted)', margin: 0, maxWidth: 480 }}>Connect and tune the engines that power your studio.</p>
        </div>
      </div>

      {/* API Keys */}
      <Card style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--text-muted)' }}>API Keys</div>

        <KeyField
          label="OpenAI API Key"
          description="Required for gpt-image-2 image generation and AI character building."
          placeholder="sk-..."
          localStorageKey="ts_openai_configured"
          onSave={saveApiKey}
          onSaved={onKeySaved}
        />

        <div style={{ borderTop: '1px solid var(--border)', margin: '0 -4px' }} />

        <KeyField
          label="Gemini API Key"
          description="Required for Nano Banana 2 and Nano Banana Pro image generation. Free tier available at aistudio.google.com."
          placeholder="AIza..."
          localStorageKey="ts_gemini_configured"
          onSave={saveGeminiKey}
          onSaved={onKeySaved}
        />

        <div style={{ borderTop: '1px solid var(--border)', margin: '0 -4px' }} />

        <KeyField
          label="Replicate API Token"
          description="Required for InstantID identity lock and FLUX Schnell. Get your token at replicate.com."
          placeholder="r8_..."
          localStorageKey="ts_replicate_configured"
          onSave={saveReplicateKey}
          onSaved={onKeySaved}
        />

      </Card>

      {/* 2-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20, alignItems: 'start' }}>

        <Card style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '16px' }}>
          <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '4px 4px 12px', margin: 0 }}>Active Engines</div>
          {ENGINES.map(e => (
            <EngineRow key={e.id} engine={{ ...e, status: resolveEngineStatus(e) }} isActive={activeEngine === e.id} onSelect={setActiveEngine} />
          ))}
        </Card>

        <Card variant="rose" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 44, height: 44, borderRadius: 'var(--radius-lg)', background: 'var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-deep)', boxShadow: 'var(--shadow-xs)' }}>
              <Icon name={engine?.icon || 'cpu'} size={20} strokeWidth={1.75} />
            </span>
            <div>
              <div style={{ font: '600 1rem/1 var(--font-ui)', color: 'var(--text-strong)' }}>{engine?.name}</div>
              <div style={{ font: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 3 }}>{engine?.desc}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ font: '500 0.8125rem/1 var(--font-ui)', color: s.color, background: s.bg, padding: '5px 12px', borderRadius: 'var(--radius-pill)' }}>{s.label}</span>
          </div>

          <p style={{ font: 'var(--text-sm)', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
            {engine?.status === 'connected' && 'This engine is connected and ready to use.'}
            {engine?.status === 'needs-setup' && 'Add the required API key above to activate this engine.'}
            {engine?.status === 'idle' && 'This engine is available but not yet active.'}
          </p>
        </Card>

      </div>

    </div>
  );
}
