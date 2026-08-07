import React from 'react';
import { Button } from '../components/core/Button.jsx';
import { Card } from '../components/surfaces/Card.jsx';
import { Icon } from '../components/core/Icon.jsx';
import {
  fetchApiKeyStatus,
  isLocalStudioServiceEnabled,
  LOCAL_ACTION_UNAVAILABLE,
  saveApiKey,
  saveFalKey,
  saveGeminiKey,
  saveReplicateKey,
} from '../api/studio.js';
import { useProduction } from '../context/ProductionContext.jsx';

// `provider` maps an engine to the backend api_key_status flag so a key set
// server-side (in .env at boot) reads as connected even if it was never saved
// through this UI — the "everything shows Needs setup while OpenAI generates"
// bug.
const ENGINES = [
  { id: 'openai',              name: 'OpenAI — gpt-image-2',           desc: 'Cloud · photorealistic studio quality',              status: 'dynamic',     statusKey: 'ts_openai_configured',    provider: 'openai',    icon: 'cloud' },
  { id: 'nano_banana',         name: 'Nano Banana',                    desc: 'Google Gemini 2.5 Flash · free tier · 60 rpm',       status: 'dynamic',     statusKey: 'ts_gemini_configured',    provider: 'gemini',    icon: 'zap' },
  { id: 'photomaker',          name: 'PhotoMaker — Identity Lock',      desc: 'Replicate · face-locked from your reference photo',  status: 'dynamic',     statusKey: 'ts_replicate_configured', provider: 'replicate', icon: 'scan-face' },
  { id: 'instantid',           name: 'InstantID',                      desc: 'Replicate · SDXL face-locked character shots',       status: 'dynamic',     statusKey: 'ts_replicate_configured', provider: 'replicate', icon: 'fingerprint' },
  { id: 'flux_schnell',        name: 'FLUX Schnell',                   desc: 'Replicate · fast editorial proofs',                  status: 'dynamic',     statusKey: 'ts_replicate_configured', provider: 'replicate', icon: 'flame' },
  { id: 'fal_flux_ultra',      name: 'FAL FLUX Ultra',                 desc: 'FAL.ai · FLUX Pro 1.1 Ultra · highest quality · uncensored', status: 'dynamic', statusKey: 'ts_fal_configured',      provider: 'fal',       icon: 'star' },
  { id: 'fal_flux_dev',        name: 'FAL FLUX Dev',                   desc: 'FAL.ai · FLUX Dev · fast & high quality · uncensored', status: 'dynamic',   statusKey: 'ts_fal_configured',      provider: 'fal',       icon: 'zap' },
  { id: 'uncensored_xl',       name: 'Uncensored Portrait XL',         desc: 'Local ComfyUI · epiCRealism XL · no restrictions',   status: 'needs-setup', statusKey: null,                      provider: null,        icon: 'unlock' },
  { id: 'comfyui',             name: 'Local ComfyUI',                  desc: 'On your machine · full control',                     status: 'needs-setup', statusKey: null,                      provider: null,        icon: 'cpu' },
  { id: 'prompt',              name: 'Prompt Only',                    desc: 'No image engine · writes prompts',                   status: 'idle',        statusKey: null,                      provider: null,        icon: 'type' },
];

const STATUS_CONFIG = {
  'connected':   { label: 'Connected',    color: 'var(--status-ready)', bg: 'var(--status-ready-bg)' },
  'needs-setup': { label: 'Needs setup',  color: 'var(--status-warn)',  bg: 'var(--status-warn-bg)' },
  'idle':        { label: 'Idle',         color: 'var(--status-off)',   bg: 'var(--status-off-bg)' },
};

function resolveEngineStatus(engine, keyStatus = {}) {
  if (engine.status !== 'dynamic') return engine.status;
  const serverHasKey = engine.provider && keyStatus[engine.provider];
  const uiSavedKey = engine.statusKey && localStorage.getItem(engine.statusKey) === '1';
  return serverHasKey || uiSavedKey ? 'connected' : 'needs-setup';
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

// No backend endpoint returns the actual saved key (or validates a specific
// engine's credentials) — only a same-origin /config reachability check
// exists. "Test Connection" is scoped honestly to that: it confirms the
// backend that accepted your key is actually reachable right now, not that
// the key itself is still valid server-side.
async function pingBackend() {
  if (!isLocalStudioServiceEnabled()) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch('/config', { signal: controller.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function KeyField({ label, description, placeholder, localStorageKey, serverConfigured = false, onSave, onSaved }) {
  const [key, setKey] = React.useState('');
  const [st, setSt] = React.useState(null);
  const [err, setErr] = React.useState('');
  const [editing, setEditing] = React.useState(false);
  const [configured, setConfigured] = React.useState(() => !!localStorageKey && localStorage.getItem(localStorageKey) === '1');
  const [testState, setTestState] = React.useState(null); // null | 'testing' | 'ok' | 'fail'

  // Server-side config arrives async (Settings fetches api_key_status) — once
  // it reports this provider as present, show the masked "Connected" state
  // even if the key was never entered through this UI.
  React.useEffect(() => {
    if (serverConfigured) setConfigured(true);
  }, [serverConfigured]);

  async function handleSave() {
    if (!key.trim()) return;
    setSt('saving'); setErr('');
    try {
      await onSave(key.trim());
      if (localStorageKey) localStorage.setItem(localStorageKey, '1');
      setSt('ok'); setKey('');
      setConfigured(true);
      setEditing(false);
      setTestState(null);
      onSaved?.();
    } catch (e) { setSt('error'); setErr(e.message); }
  }

  async function handleTest() {
    if (!isLocalStudioServiceEnabled()) {
      setTestState('unavailable');
      return;
    }
    setTestState('testing');
    const ok = await pingBackend();
    setTestState(ok ? 'ok' : 'fail');
  }

  if (configured && !editing) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ font: '600 0.9375rem/1 var(--font-ui)', color: 'var(--text-strong)' }}>{label}</div>
            <div style={{ font: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 3 }}>{description}</div>
          </div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, font: '600 0.75rem/1 var(--font-ui)', color: 'var(--status-ready)', background: 'var(--status-ready-bg)', padding: '4px 10px', borderRadius: 'var(--radius-pill)', flexShrink: 0 }}>
            <Icon name="check-circle" size={12} strokeWidth={2.25} /> Connected
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            flex: 1, padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)',
            background: 'var(--cream-deep)', font: '500 0.9rem/1 var(--font-mono)', letterSpacing: '0.15em', color: 'var(--text-faint)',
          }}>
            {placeholder.slice(0, 3)}••••••••••••••••
          </div>
          <Button variant="secondary" onClick={handleTest} disabled={testState === 'testing'}>
            {testState === 'testing' ? 'Testing…' : 'Test Connection'}
          </Button>
          <Button variant="ghost" onClick={() => { setEditing(true); setTestState(null); }}>Replace</Button>
        </div>
        {testState === 'ok' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, font: 'var(--text-sm)', color: 'var(--status-ready)', background: 'var(--status-ready-bg)', padding: '9px 12px', borderRadius: 'var(--radius-md)' }}>
            <Icon name="check-circle" size={14} /> Backend reachable — key accepted at last save.
          </div>
        )}
        {testState === 'fail' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, font: 'var(--text-sm)', color: 'var(--status-warn)', background: 'var(--status-warn-bg)', padding: '9px 12px', borderRadius: 'var(--radius-md)' }}>
            <Icon name="alert-triangle" size={14} /> Backend unreachable right now — check the server is running.
          </div>
        )}
        {testState === 'unavailable' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, font: 'var(--text-sm)', color: 'var(--status-warn)', background: 'var(--status-warn-bg)', padding: '9px 12px', borderRadius: 'var(--radius-md)' }}>
            <Icon name="clock" size={14} /> {LOCAL_ACTION_UNAVAILABLE}
          </div>
        )}
      </div>
    );
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
          autoFocus={editing}
          style={{ flex: 1, padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', background: 'var(--surface-input, var(--cream-light))', font: 'var(--text-sm)', color: 'var(--text-strong)', outline: 'none', fontFamily: 'monospace', letterSpacing: '0.05em' }}
        />
        <Button variant="accent" onClick={handleSave} disabled={!key.trim() || st === 'saving'}>
          {st === 'saving' ? 'Saving…' : 'Save'}
        </Button>
        {configured && (
          <Button variant="ghost" onClick={() => { setEditing(false); setKey(''); setSt(null); }}>Cancel</Button>
        )}
      </div>
    </div>
  );
}

export function Settings({ access = null }) {
  const { usage } = useProduction();
  const localServicesEnabled = isLocalStudioServiceEnabled();
  const internalAccess = access?.account_type === 'internal' || access?.billing_exempt === true;
  const [activeEngine, setActiveEngine] = React.useState('openai');
  const [savedTick, setSavedTick] = React.useState(0);
  const [keyStatus, setKeyStatus] = React.useState({}); // { openai, gemini, replicate, fal }
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const engineDef = ENGINES.find(e => e.id === activeEngine);
  const engine = engineDef ? { ...engineDef, status: resolveEngineStatus(engineDef, keyStatus) } : engineDef;
  const s = STATUS_CONFIG[engine?.status || 'idle'];

  const onKeySaved = React.useCallback(() => setSavedTick(t => t + 1), []);

  // Pull real server-side key config on mount and after any save, so a key
  // that lives in .env (not saved through this UI) still reads as connected.
  React.useEffect(() => {
    if (!localServicesEnabled) return undefined;
    let live = true;
    fetchApiKeyStatus().then(st => { if (live) setKeyStatus(st || {}); }).catch(() => undefined);
    return () => { live = false; };
  }, [localServicesEnabled, savedTick]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 'var(--content-max)', margin: '0 auto' }}>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
        <div>
          <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--accent-deep)', marginBottom: 10 }}>Settings</div>
          <h1 style={{ font: 'var(--display-lg)', color: 'var(--text-strong)', letterSpacing: '-0.015em', margin: '0 0 10px' }}>Generation Settings</h1>
          <p style={{ font: 'var(--text-lg)', color: 'var(--text-muted)', margin: 0, maxWidth: 520 }}>Manage included generation credits and advanced provider options.</p>
        </div>
      </div>

      <Card variant="rose" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
        <div>
          <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--accent-deep)', marginBottom: 8 }}>Managed generation</div>
          <div style={{ font: '600 1.25rem/1.2 var(--font-display)', color: 'var(--text-strong)' }}>
            {internalAccess ? 'Internal access · usage tracked' : `${usage.remaining} credits remaining`}
          </div>
          <p style={{ font: 'var(--text-sm)', color: 'var(--text-muted)', lineHeight: 1.55, margin: '7px 0 0', maxWidth: 560 }}>
            Thee Studio securely runs the recommended generation provider for you. No API key is required for the included workflow.
          </p>
        </div>
        {!internalAccess && <div style={{ minWidth: 180 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', font: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 7 }}>
            <span>{usage.used} used</span><span>{usage.included} included</span>
          </div>
          <div style={{ height: 8, borderRadius: 'var(--radius-pill)', background: 'var(--white)', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, (usage.used / Math.max(usage.included, 1)) * 100)}%`, height: '100%', background: 'var(--grad-coral)', borderRadius: 'inherit' }} />
          </div>
        </div>}
      </Card>

      <div>
        <Button variant="secondary" disabled={!localServicesEnabled} onClick={() => setAdvancedOpen(value => !value)}>
          <Icon name="settings" size={15} />
          {advancedOpen ? 'Hide advanced provider setup' : 'Advanced provider setup'}
        </Button>
        <p style={{ font: 'var(--text-xs)', color: 'var(--text-muted)', margin: '8px 0 0' }}>
          {localServicesEnabled
            ? 'Optional: connect your own provider account for specialized engines.'
            : 'Advanced local provider setup is unavailable in cloud. Coming soon.'}
        </p>
      </div>

      {/* API keys are an advanced option; managed generation is the default. */}
      {advancedOpen && <Card style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--text-muted)' }}>API Keys</div>

        <KeyField
          label="OpenAI API Key"
          description="Required for gpt-image-2 image generation, AI character building, and the Prompt Lab prompt engine."
          placeholder="sk-..."
          localStorageKey="ts_openai_configured"
          serverConfigured={!!keyStatus.openai}
          onSave={saveApiKey}
          onSaved={onKeySaved}
        />

        <div style={{ borderTop: '1px solid var(--border)', margin: '0 -4px' }} />

        <KeyField
          label="Gemini API Key"
          description="Required for Nano Banana 2 and Nano Banana Pro image generation. Free tier available at aistudio.google.com."
          placeholder="AIza..."
          localStorageKey="ts_gemini_configured"
          serverConfigured={!!keyStatus.gemini}
          onSave={saveGeminiKey}
          onSaved={onKeySaved}
        />

        <div style={{ borderTop: '1px solid var(--border)', margin: '0 -4px' }} />

        <KeyField
          label="Replicate API Token"
          description="Required for InstantID identity lock and FLUX Schnell. Get your token at replicate.com."
          placeholder="r8_..."
          localStorageKey="ts_replicate_configured"
          serverConfigured={!!keyStatus.replicate}
          onSave={saveReplicateKey}
          onSaved={onKeySaved}
        />

        <div style={{ borderTop: '1px solid var(--border)', margin: '0 -4px' }} />

        <KeyField
          label="FAL.ai API Key"
          description="Required for FAL FLUX Ultra and FAL FLUX Dev — highest quality uncensored generation. Get your key at fal.ai."
          placeholder="your-fal-key..."
          localStorageKey="ts_fal_configured"
          serverConfigured={!!keyStatus.fal}
          onSave={saveFalKey}
          onSaved={onKeySaved}
        />

      </Card>}

      {/* 2-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20, alignItems: 'start' }}>

        <Card style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '16px' }}>
          <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '4px 4px 12px', margin: 0 }}>Active Engines</div>
          {ENGINES.map(e => (
            <EngineRow key={e.id} engine={{ ...e, status: resolveEngineStatus(e, keyStatus) }} isActive={activeEngine === e.id} onSelect={setActiveEngine} />
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
            {engine?.status === 'needs-setup' && 'Open advanced provider setup to connect this engine.'}
            {engine?.status === 'idle' && 'This engine is available but not yet active.'}
          </p>
        </Card>

      </div>

    </div>
  );
}
