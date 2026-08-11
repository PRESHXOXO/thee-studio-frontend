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

// Local/dev can expose the full provider lab. The hosted product intentionally
// exposes only engines backed by the managed cloud pipeline so customers never
// see dead BYOK/local controls or misleading "Needs setup" states.
const ENGINES = [
  { id: 'openai',              name: 'OpenAI — gpt-image-2',           desc: 'Managed cloud · photorealistic studio quality',        status: 'dynamic',     statusKey: 'ts_openai_configured',    provider: 'openai',    icon: 'cloud' },
  { id: 'nano_banana',         name: 'Nano Banana',                    desc: 'Google Gemini 2.5 Flash · local/dev provider option', status: 'dynamic',     statusKey: 'ts_gemini_configured',    provider: 'gemini',    icon: 'zap' },
  { id: 'photomaker',          name: 'PhotoMaker — Identity Lock',     desc: 'Replicate · local/dev provider option',               status: 'dynamic',     statusKey: 'ts_replicate_configured', provider: 'replicate', icon: 'scan-face' },
  { id: 'instantid',           name: 'InstantID',                      desc: 'Replicate · local/dev provider option',               status: 'dynamic',     statusKey: 'ts_replicate_configured', provider: 'replicate', icon: 'fingerprint' },
  { id: 'flux_schnell',        name: 'FLUX Schnell',                   desc: 'Replicate · local/dev provider option',               status: 'dynamic',     statusKey: 'ts_replicate_configured', provider: 'replicate', icon: 'flame' },
  { id: 'fal_flux_ultra',      name: 'FAL FLUX Ultra',                 desc: 'FAL.ai · local/dev provider option',                   status: 'dynamic',     statusKey: 'ts_fal_configured',       provider: 'fal',       icon: 'star' },
  { id: 'fal_flux_dev',        name: 'FAL FLUX Dev',                   desc: 'FAL.ai · local/dev provider option',                   status: 'dynamic',     statusKey: 'ts_fal_configured',       provider: 'fal',       icon: 'zap' },
  { id: 'uncensored_xl',       name: 'Portrait XL',                    desc: 'Local ComfyUI · local/dev provider option',            status: 'needs-setup', statusKey: null,                      provider: null,        icon: 'unlock' },
  { id: 'comfyui',             name: 'Local ComfyUI',                  desc: 'On your machine · local/dev provider option',          status: 'needs-setup', statusKey: null,                      provider: null,        icon: 'cpu' },
  { id: 'prompt',              name: 'Prompt Only',                    desc: 'No image engine · writes prompts',                    status: 'idle',        statusKey: null,                      provider: null,        icon: 'type' },
];

const CLOUD_ENGINES = [
  { id: 'openai', name: 'OpenAI — gpt-image-2', desc: 'Managed by Thee Studio · identity-aware image generation', status: 'connected', provider: 'openai', icon: 'cloud' },
  { id: 'prompt', name: 'Prompt Only', desc: 'Director prompt-building without an image request', status: 'idle', provider: null, icon: 'type' },
];

const STATUS_CONFIG = {
  'connected':   { label: 'Connected',    color: 'var(--status-ready)', bg: 'var(--status-ready-bg)' },
  'needs-setup': { label: 'Needs setup',  color: 'var(--status-warn)',  bg: 'var(--status-warn-bg)' },
  'idle':        { label: 'Available',     color: 'var(--status-off)',   bg: 'var(--status-off-bg)' },
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
  const [testState, setTestState] = React.useState(null);

  React.useEffect(() => {
    if (serverConfigured) setConfigured(true);
  }, [serverConfigured]);

  async function handleSave() {
    if (!key.trim()) return;
    setSt('saving'); setErr('');
    try {
      await onSave(key.trim());
      if (localStorageKey) localStorage.setItem(localStorageKey, '1');
      setSt('ok'); setKey(''); setConfigured(true); setEditing(false); setTestState(null);
      onSaved?.();
    } catch (e) { setSt('error'); setErr(e.message); }
  }

  async function handleTest() {
    if (!isLocalStudioServiceEnabled()) { setTestState('unavailable'); return; }
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
          <div style={{ flex: 1, padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', background: 'var(--cream-deep)', font: '500 0.9rem/1 var(--font-mono)', letterSpacing: '0.15em', color: 'var(--text-faint)' }}>
            {placeholder.slice(0, 3)}••••••••••••••••
          </div>
          <Button variant="secondary" onClick={handleTest} disabled={testState === 'testing'}>{testState === 'testing' ? 'Testing…' : 'Test Connection'}</Button>
          <Button variant="ghost" onClick={() => { setEditing(true); setTestState(null); }}>Replace</Button>
        </div>
        {testState === 'ok' && <div style={{ font: 'var(--text-sm)', color: 'var(--status-ready)', background: 'var(--status-ready-bg)', padding: '9px 12px', borderRadius: 'var(--radius-md)' }}>Backend reachable — key accepted at last save.</div>}
        {testState === 'fail' && <div style={{ font: 'var(--text-sm)', color: 'var(--status-warn)', background: 'var(--status-warn-bg)', padding: '9px 12px', borderRadius: 'var(--radius-md)' }}>Backend unreachable right now.</div>}
        {testState === 'unavailable' && <div style={{ font: 'var(--text-sm)', color: 'var(--status-warn)', background: 'var(--status-warn-bg)', padding: '9px 12px', borderRadius: 'var(--radius-md)' }}>{LOCAL_ACTION_UNAVAILABLE}</div>}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <div style={{ font: '600 0.9375rem/1 var(--font-ui)', color: 'var(--text-strong)' }}>{label}</div>
        <div style={{ font: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 3 }}>{description}</div>
      </div>
      {st === 'ok' && <div style={{ font: 'var(--text-sm)', color: 'var(--status-ready)', background: 'var(--status-ready-bg)', padding: '9px 12px', borderRadius: 'var(--radius-md)' }}>Saved — ready to use.</div>}
      {st === 'error' && <div style={{ font: 'var(--text-sm)', color: 'var(--status-warn)', background: 'var(--status-warn-bg)', padding: '9px 12px', borderRadius: 'var(--radius-md)' }}>{err}</div>}
      <div style={{ display: 'flex', gap: 10 }}>
        <input type="password" value={key} onChange={e => { setKey(e.target.value); setSt(null); }} onKeyDown={e => e.key === 'Enter' && handleSave()} placeholder={placeholder} autoFocus={editing} style={{ flex: 1, padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', background: 'var(--surface-input, var(--cream-light))', font: 'var(--text-sm)', color: 'var(--text-strong)', outline: 'none', fontFamily: 'monospace', letterSpacing: '0.05em' }} />
        <Button variant="accent" onClick={handleSave} disabled={!key.trim() || st === 'saving'}>{st === 'saving' ? 'Saving…' : 'Save'}</Button>
        {configured && <Button variant="ghost" onClick={() => { setEditing(false); setKey(''); setSt(null); }}>Cancel</Button>}
      </div>
    </div>
  );
}

export function Settings({ access = null }) {
  const { usage } = useProduction();
  const localServicesEnabled = isLocalStudioServiceEnabled();
  const internalAccess = access?.account_type === 'internal' || access?.billing_exempt === true;
  const visibleEngines = localServicesEnabled ? ENGINES : CLOUD_ENGINES;
  const [activeEngine, setActiveEngine] = React.useState('openai');
  const [savedTick, setSavedTick] = React.useState(0);
  const [keyStatus, setKeyStatus] = React.useState({});
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const engineDef = visibleEngines.find(e => e.id === activeEngine) || visibleEngines[0];
  const engine = engineDef ? { ...engineDef, status: localServicesEnabled ? resolveEngineStatus(engineDef, keyStatus) : engineDef.status } : engineDef;
  const s = STATUS_CONFIG[engine?.status || 'idle'];

  const onKeySaved = React.useCallback(() => setSavedTick(t => t + 1), []);

  React.useEffect(() => {
    if (!localServicesEnabled) return undefined;
    let live = true;
    fetchApiKeyStatus().then(st => { if (live) setKeyStatus(st || {}); }).catch(() => undefined);
    return () => { live = false; };
  }, [localServicesEnabled, savedTick]);

  React.useEffect(() => {
    if (!visibleEngines.some(item => item.id === activeEngine)) setActiveEngine(visibleEngines[0]?.id || 'openai');
  }, [activeEngine, visibleEngines]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 'var(--content-max)', margin: '0 auto' }}>
      <div>
        <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--accent-deep)', marginBottom: 10 }}>Settings</div>
        <h1 style={{ font: 'var(--display-lg)', color: 'var(--text-strong)', letterSpacing: '-0.015em', margin: '0 0 10px' }}>Generation Settings</h1>
        <p style={{ font: 'var(--text-lg)', color: 'var(--text-muted)', margin: 0, maxWidth: 560 }}>Manage included generation credits and see the engines available in this workspace.</p>
      </div>

      <Card variant="rose" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
        <div>
          <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--accent-deep)', marginBottom: 8 }}>Managed generation</div>
          <div style={{ font: '600 1.25rem/1.2 var(--font-display)', color: 'var(--text-strong)' }}>
            {internalAccess ? 'Internal access · usage tracked' : `${usage.remaining} credits remaining`}
          </div>
          <p style={{ font: 'var(--text-sm)', color: 'var(--text-muted)', lineHeight: 1.55, margin: '7px 0 0', maxWidth: 560 }}>
            Thee Studio securely runs the managed generation provider for you. No personal API key is required in the cloud app.
          </p>
        </div>
        {!internalAccess && <div style={{ minWidth: 180 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', font: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 7 }}><span>{usage.used} used</span><span>{usage.included} included</span></div>
          <div style={{ height: 8, borderRadius: 'var(--radius-pill)', background: 'var(--white)', overflow: 'hidden' }}><div style={{ width: `${Math.min(100, (usage.used / Math.max(usage.included, 1)) * 100)}%`, height: '100%', background: 'var(--grad-coral)', borderRadius: 'inherit' }} /></div>
        </div>}
      </Card>

      {localServicesEnabled && <>
        <div>
          <Button variant="secondary" onClick={() => setAdvancedOpen(value => !value)}>
            <Icon name="settings" size={15} /> {advancedOpen ? 'Hide advanced provider setup' : 'Advanced provider setup'}
          </Button>
          <p style={{ font: 'var(--text-xs)', color: 'var(--text-muted)', margin: '8px 0 0' }}>Optional local-dev provider configuration.</p>
        </div>

        {advancedOpen && <Card style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Local / BYOK API Keys</div>
          <KeyField label="OpenAI API Key" description="Local/dev OpenAI provider key." placeholder="sk-..." localStorageKey="ts_openai_configured" serverConfigured={!!keyStatus.openai} onSave={saveApiKey} onSaved={onKeySaved} />
          <div style={{ borderTop: '1px solid var(--border)' }} />
          <KeyField label="Gemini API Key" description="Local/dev Gemini provider key." placeholder="AIza..." localStorageKey="ts_gemini_configured" serverConfigured={!!keyStatus.gemini} onSave={saveGeminiKey} onSaved={onKeySaved} />
          <div style={{ borderTop: '1px solid var(--border)' }} />
          <KeyField label="Replicate API Token" description="Local/dev Replicate provider token." placeholder="r8_..." localStorageKey="ts_replicate_configured" serverConfigured={!!keyStatus.replicate} onSave={saveReplicateKey} onSaved={onKeySaved} />
          <div style={{ borderTop: '1px solid var(--border)' }} />
          <KeyField label="FAL.ai API Key" description="Local/dev FAL provider key." placeholder="your-fal-key..." localStorageKey="ts_fal_configured" serverConfigured={!!keyStatus.fal} onSave={saveFalKey} onSaved={onKeySaved} />
        </Card>}
      </>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, alignItems: 'start' }}>
        <Card style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '16px' }}>
          <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '4px 4px 12px', margin: 0 }}>Available Engines</div>
          {visibleEngines.map(e => {
            const resolved = localServicesEnabled ? { ...e, status: resolveEngineStatus(e, keyStatus) } : e;
            return <EngineRow key={e.id} engine={resolved} isActive={activeEngine === e.id} onSelect={setActiveEngine} />;
          })}
        </Card>

        <Card variant="rose" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 44, height: 44, borderRadius: 'var(--radius-lg)', background: 'var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-deep)', boxShadow: 'var(--shadow-xs)' }}><Icon name={engine?.icon || 'cpu'} size={20} strokeWidth={1.75} /></span>
            <div>
              <div style={{ font: '600 1rem/1 var(--font-ui)', color: 'var(--text-strong)' }}>{engine?.name}</div>
              <div style={{ font: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 3 }}>{engine?.desc}</div>
            </div>
          </div>
          <div><span style={{ font: '500 0.8125rem/1 var(--font-ui)', color: s.color, background: s.bg, padding: '5px 12px', borderRadius: 'var(--radius-pill)' }}>{s.label}</span></div>
          <p style={{ font: 'var(--text-sm)', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
            {engine?.status === 'connected' && 'This managed engine is connected and ready to use.'}
            {engine?.status === 'needs-setup' && 'Configure this local/dev engine above.'}
            {engine?.status === 'idle' && 'This option is available without an image provider call.'}
          </p>
        </Card>
      </div>
    </div>
  );
}
