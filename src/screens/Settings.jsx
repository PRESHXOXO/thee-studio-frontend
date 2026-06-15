import React from 'react';
import { Button } from '../components/core/Button.jsx';
import { Card } from '../components/surfaces/Card.jsx';
import { Icon } from '../components/core/Icon.jsx';
import { saveApiKey } from '../api/studio.js';

const ENGINES = [
  {
    id: 'openai',
    name: 'OpenAI Image',
    desc: 'Cloud · best for clean studio beauty',
    status: 'dynamic', // resolved at render time from localStorage
    icon: 'cloud',
  },
  {
    id: 'replicate',
    name: 'Replicate FLUX Schnell',
    desc: 'Cloud · fast editorial proofs',
    status: 'connected',
    icon: 'zap',
  },
  {
    id: 'comfyui',
    name: 'Local ComfyUI',
    desc: 'On your machine · full control',
    status: 'needs-setup',
    icon: 'cpu',
  },
  {
    id: 'prompt',
    name: 'Prompt Only',
    desc: 'No image engine · writes prompts',
    status: 'idle',
    icon: 'type',
  },
];

const STATUS_CONFIG = {
  'connected':   { label: 'Connected',    color: 'var(--status-ready)',  bg: 'var(--status-ready-bg)' },
  'needs-setup': { label: 'Needs setup',  color: 'var(--status-warn)',   bg: 'var(--status-warn-bg)' },
  'idle':        { label: 'Idle',         color: 'var(--status-off)',    bg: 'var(--status-off-bg)' },
};

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

function ApiKeySection() {
  const [key, setKey] = React.useState('');
  const [status, setStatus] = React.useState(null); // null | 'saving' | 'ok' | 'error'
  const [errorMsg, setErrorMsg] = React.useState('');

  async function handleSave() {
    if (!key.trim()) return;
    setStatus('saving');
    setErrorMsg('');
    try {
      await saveApiKey(key.trim());
      localStorage.setItem('ts_api_configured', '1');
      setStatus('ok');
      setKey('');
    } catch (e) {
      setStatus('error');
      setErrorMsg(e.message);
    }
  }

  return (
    <Card style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>API Keys</div>
        <div style={{ font: '600 1rem/1 var(--font-ui)', color: 'var(--text-strong)' }}>OpenAI API Key</div>
        <div style={{ font: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 4 }}>Required for image generation and AI character building.</div>
      </div>

      {status === 'ok' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, font: 'var(--text-sm)', color: 'var(--status-ready)', background: 'var(--status-ready-bg)', padding: '10px 14px', borderRadius: 'var(--radius-md)' }}>
          <Icon name="check-circle" size={15} /> Key saved — you're good to go.
        </div>
      )}

      {status === 'error' && (
        <div style={{ font: 'var(--text-sm)', color: 'var(--status-warn)', background: 'var(--status-warn-bg)', padding: '10px 14px', borderRadius: 'var(--radius-md)' }}>
          {errorMsg}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <input
          type="password"
          value={key}
          onChange={e => { setKey(e.target.value); setStatus(null); }}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          placeholder="sk-..."
          style={{
            flex: 1, padding: '10px 14px', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-default)', background: 'var(--surface-input, var(--cream-light))',
            font: 'var(--text-sm)', color: 'var(--text-strong)', outline: 'none',
            fontFamily: 'monospace', letterSpacing: '0.05em',
          }}
        />
        <Button variant="primary" onClick={handleSave} disabled={!key.trim() || status === 'saving'}>
          {status === 'saving' ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </Card>
  );
}

function resolveEngineStatus(engine) {
  if (engine.status !== 'dynamic') return engine.status;
  return localStorage.getItem('ts_api_configured') === '1' ? 'connected' : 'needs-setup';
}

export function Settings() {
  const [activeEngine, setActiveEngine] = React.useState('openai');
  const engineDef = ENGINES.find(e => e.id === activeEngine);
  const engine = engineDef ? { ...engineDef, status: resolveEngineStatus(engineDef) } : engineDef;
  const s = STATUS_CONFIG[engine?.status || 'idle'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 'var(--content-max)', margin: '0 auto' }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
        <div>
          <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--accent-deep)', marginBottom: 10 }}>Settings</div>
          <h1 style={{ font: 'var(--display-lg)', color: 'var(--text-strong)', letterSpacing: '-0.015em', margin: '0 0 10px' }}>Engine Library</h1>
          <p style={{ font: 'var(--text-lg)', color: 'var(--text-muted)', margin: 0, maxWidth: 480 }}>Connect and tune the engines that power your studio.</p>
        </div>
        <Button variant="primary" onClick={() => {}} title="Coming soon" style={{ opacity: 0.5, cursor: 'not-allowed' }}>
          <Icon name="plus" size={15} /> Add Engine
        </Button>
      </div>

      <ApiKeySection />

      {/* 2-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20, alignItems: 'start' }}>

        {/* Engine list */}
        <Card style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '16px' }}>
          <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '4px 4px 12px', margin: 0 }}>Active Engines</div>
          {ENGINES.map(e => (
            <EngineRow key={e.id} engine={{ ...e, status: resolveEngineStatus(e) }} isActive={activeEngine === e.id} onSelect={setActiveEngine} />
          ))}
        </Card>

        {/* Engine detail */}
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
            {engine?.status === 'connected' && 'This engine is connected and ready to use for generation.'}
            {engine?.status === 'needs-setup' && 'Start your local ComfyUI server, then configure the server URL below.'}
            {engine?.status === 'idle' && 'This engine is available but not active. Enable it to use in generation.'}
          </p>

          <div style={{ display: 'flex', gap: 8 }}>
            {engine?.status === 'needs-setup' && <Button variant="primary" onClick={() => {}} title="Coming soon" style={{ opacity: 0.5, cursor: 'not-allowed' }}>Configure</Button>}
            {engine?.status === 'connected' && <Button variant="secondary" onClick={() => {}} title="Coming soon" style={{ opacity: 0.5, cursor: 'not-allowed' }}>Disconnect</Button>}
            {engine?.status === 'idle' && <Button variant="secondary" onClick={() => {}} title="Coming soon" style={{ opacity: 0.5, cursor: 'not-allowed' }}>Enable</Button>}
          </div>
        </Card>

      </div>

    </div>
  );
}
