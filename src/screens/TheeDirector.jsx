import React from 'react';
import { Card } from '../components/surfaces/Card.jsx';
import { Icon } from '../components/core/Icon.jsx';
import { ShootBuilder } from '../components/shoot/ShootBuilder.jsx';
import { PromptLabV2 } from './PromptLabV2.jsx';
import { SceneFlowV2 } from './SceneFlowV2.jsx';
import { resolveActiveCreator, saveActiveCreatorId } from '../lib/activeCreator.js';
import { loadCharacters, saveCharacters } from '../lib/creatorCache.js';
import { canonicalCreatorId } from '../lib/cloudCreators.js';
import { directorIdentityState } from '../api/directorGeneration.js';
import { useAuth } from '../context/AuthContext.jsx';

const LABEL = { font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--text-muted)', margin: 0 };
function getCharacterImage(char) { return char?.refImages?.[0] || char?.image || null; }
function getAllImages(char) { if (!char) return []; if (char.refImages?.length) return char.refImages; if (char.image) return [char.image]; return []; }

function CharacterSelector({ characters, selectedId, onSelect }) {
  if (!characters.length) return null;
  return <div><div style={{ ...LABEL, marginBottom: 12 }}>Who is on set?</div><div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, WebkitOverflowScrolling: 'touch' }}>
    <button type="button" onClick={() => onSelect(null)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'none', border: `2px solid ${!selectedId ? 'var(--accent-deep)' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', padding: '8px 12px', cursor: 'pointer', color: !selectedId ? 'var(--accent-deep)' : 'var(--text-faint)', font: '500 0.75rem/1 var(--font-ui)', fontFamily: 'inherit', minWidth: 64 }}><Icon name="user-x" size={18} strokeWidth={1.5} />Open</button>
    {characters.map(char => { const img = getCharacterImage(char); const active = selectedId === char.id; return <button type="button" key={char.id} onClick={() => onSelect(char.id)} aria-pressed={active} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: active ? 'var(--rose-deep)' : 'none', border: `2px solid ${active ? 'var(--accent-deep)' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', padding: 8, cursor: 'pointer', fontFamily: 'inherit', minWidth: 64 }}><div style={{ width: 44, height: 58, borderRadius: 8, overflow: 'hidden', background: 'var(--grad-portrait)', boxShadow: img ? 'var(--depth-media-rest)' : 'var(--depth-flat)' }}>{img ? <img src={img} alt={char.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: 'var(--text-faint)' }}><Icon name="user" size={18} /></div>}</div><span style={{ font: `${active ? 600 : 500} 0.72rem/1.2 var(--font-ui)`, color: active ? 'var(--accent-deep)' : 'var(--text-muted)', maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{char.name}</span></button>; })}
  </div></div>;
}

const MODES = [
  { id: 'guided', label: 'Guided', icon: 'sliders-horizontal', help: 'Build the shot with structured controls. A selected Cast member owns Identity across the whole render.' },
  { id: 'describe', label: 'Describe It', icon: 'flask-conical', help: 'Say what you want naturally. Director engineers the visual direction without replacing the selected Cast member.' },
  { id: 'talk', label: 'Talk It Through', icon: 'message-circle', help: 'Brainstorm and revise conversationally. Drafting is free; generation starts only when you explicitly ask or press Generate.' },
];

export function TheeDirector({ onNav, onModeChange, onActiveCreatorChange, initialScene = 'None', initialVision = '', initialCampaign = null, initialCreatorId = null, initialMode = 'guided', initialSettings = null, mobile = false }) {
  const [mode, setMode] = React.useState(MODES.some(item => item.id === initialMode) ? initialMode : 'guided');
  React.useEffect(() => { if (MODES.some(item => item.id === initialMode)) setMode(initialMode); }, [initialMode]);
  const [characters, setCharacters] = React.useState(loadCharacters);
  const [selectedCharId, setSelectedCharId] = React.useState(() => {
    const chars = loadCharacters();
    const match = id => chars.find(char => String(char.id) === String(id));
    if (initialCampaign?.creatorId != null && match(initialCampaign.creatorId)) return match(initialCampaign.creatorId).id;
    if (initialCreatorId != null && match(initialCreatorId)) return match(initialCreatorId).id;
    return resolveActiveCreator(chars)?.id ?? null;
  });
  const [buildWithoutCreator, setBuildWithoutCreator] = React.useState(false);
  const { session } = useAuth();
  const sessionRef = React.useRef(session?.id ?? null);
  React.useEffect(() => {
    const nextId = session?.id ?? null;
    if (sessionRef.current === nextId) return;
    sessionRef.current = nextId;
    const nextChars = loadCharacters();
    setCharacters(nextChars);
    setSelectedCharId(resolveActiveCreator(nextChars)?.id ?? null);
  }, [session?.id]);
  React.useEffect(() => {
    if (selectedCharId != null) { saveActiveCreatorId(selectedCharId); onActiveCreatorChange?.(characters.find(char => char.id === selectedCharId) || null); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCampaign?.id, initialCreatorId]);

  const selectCreator = id => {
    setSelectedCharId(id); saveActiveCreatorId(id); if (id != null) setBuildWithoutCreator(false);
    onActiveCreatorChange?.(characters.find(char => char.id === id) || null);
  };
  const selectedChar = characters.find(char => char.id === selectedCharId) || null;
  const selectedHasIdentity = directorIdentityState(selectedChar, []).locked;

  const handleSaveAsAnchorForActive = compressedDataUrl => {
    if (!selectedCharId) return;
    const updated = characters.map(char => {
      if (char.id !== selectedCharId) return char;
      const existing = getAllImages(char);
      if (existing.includes(compressedDataUrl)) return char;
      const newRefs = [...existing, compressedDataUrl];
      return { ...char, refImages: newRefs, image: newRefs[0] };
    });
    saveCharacters(updated); setCharacters(updated);
  };

  const gated = characters.length > 0 && !selectedCharId && !buildWithoutCreator;
  return <div style={{ display: 'flex', flexDirection: 'column', gap: mobile ? 18 : 22, maxWidth: 'var(--content-max)', margin: '0 auto' }}>
    <div><div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--accent-deep)', marginBottom: 10 }}>Thee Director</div><h1 style={{ font: 'var(--display-lg)', color: 'var(--text-strong)', letterSpacing: '-0.015em', margin: '0 0 10px' }}>Direct with intention. Create with impact.</h1><p style={{ font: 'var(--text-lg)', color: 'var(--text-muted)', margin: 0, maxWidth: 650 }}>One subject. Three ways to direct. The selected Cast identity stays authoritative no matter which workflow you use.</p></div>

    {initialCampaign && <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: mobile ? '12px 14px' : '14px 18px', borderRadius: 'var(--radius-lg)', background: 'var(--rose-glass)', border: '1px solid var(--border-strong)' }}><Icon name="megaphone" size={16} style={{ color: 'var(--accent-deep)', marginTop: 2 }} /><div><div style={{ font: '600 0.8125rem/1 var(--font-ui)', color: 'var(--accent-deep)', marginBottom: 4 }}>Shooting for {initialCampaign.name}</div>{initialCampaign.brief && <div style={{ font: 'var(--text-sm)', color: 'var(--text-body)' }}>{initialCampaign.brief}</div>}</div></div>}

    <div role="tablist" aria-label="Director input method" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{MODES.map(item => <button type="button" key={item.id} role="tab" aria-selected={mode === item.id} onClick={() => { setMode(item.id); onModeChange?.(item.id); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: mobile ? '11px 14px' : '9px 16px', minHeight: mobile ? 44 : undefined, flex: mobile ? '1 1 132px' : undefined, borderRadius: 'var(--radius-pill)', cursor: 'pointer', border: `1.5px solid ${mode === item.id ? 'var(--accent-deep)' : 'var(--border)'}`, background: mode === item.id ? 'var(--rose-deep)' : 'transparent', color: mode === item.id ? 'var(--accent-deep)' : 'var(--text-muted)', font: '600 0.85rem/1 var(--font-ui)', fontFamily: 'inherit' }}><Icon name={item.icon} size={15} />{item.label}</button>)}</div>
    <div style={{ font: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: -10 }}>{MODES.find(item => item.id === mode)?.help}</div>

    {characters.length > 0 && <Card style={{ padding: mobile ? 14 : '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}><CharacterSelector characters={characters} selectedId={selectedCharId} onSelect={selectCreator} /><div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 12, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}><Icon name={selectedChar ? 'shield-check' : 'user-round-search'} size={15} style={{ color: selectedChar ? 'var(--accent-deep)' : 'var(--text-faint)' }} /><strong style={{ font: '600 0.8rem/1 var(--font-ui)', color: 'var(--text-strong)' }}>{selectedChar ? `${selectedChar.name} is on set` : 'Open-subject session'}</strong>{selectedChar && <span style={{ padding: '4px 7px', borderRadius: 'var(--radius-pill)', background: selectedHasIdentity ? 'var(--rose-deep)' : 'var(--status-warn-bg)', color: selectedHasIdentity ? 'var(--accent-deep)' : 'var(--text-body)', font: '600 0.67rem/1 var(--font-ui)' }}>{selectedHasIdentity ? 'Identity bound' : 'Identity unavailable'}</span>}<span style={{ font: 'var(--text-xs)', color: 'var(--text-faint)' }}>{selectedChar ? 'Styling references cannot replace this identity.' : 'Director may create a new subject unless you add an Identity reference.'}</span></div></Card>}

    <div role="tabpanel" hidden={mode !== 'guided'} style={{ display: mode === 'guided' ? 'block' : 'none' }}>{gated ? <Card style={{ display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center', textAlign: 'center', padding: mobile ? '28px 18px' : '40px 32px' }}><Icon name="user-round-search" size={30} style={{ color: 'var(--text-faint)' }} /><div><div style={{ font: '600 1.0625rem/1.3 var(--font-display)', color: 'var(--text-strong)', marginBottom: 6 }}>Pick a creator to start shooting</div><div style={{ font: 'var(--text-sm)', color: 'var(--text-muted)' }}>Choose Cast above, or deliberately open a one-off subject.</div></div><button type="button" onClick={() => setBuildWithoutCreator(true)} style={{ background: 'none', border: 0, cursor: 'pointer', font: 'var(--text-sm)', color: 'var(--accent-deep)', textDecoration: 'underline', fontFamily: 'inherit' }}>Build without a saved creator</button></Card> : <ShootBuilder layout={mobile ? 'stacked' : 'split'} creator={selectedChar} allowNoCreator initialScene={initialScene} initialNotes={initialVision} initialSettings={initialSettings} onSaveAsCreator={selectedChar && !canonicalCreatorId(selectedChar) ? handleSaveAsAnchorForActive : undefined} campaignId={initialCampaign?.id ?? null} />}</div>
    <div role="tabpanel" hidden={mode !== 'describe'} style={{ display: mode === 'describe' ? 'block' : 'none' }}><PromptLabV2 onNav={onNav} campaignId={initialCampaign?.id ?? null} initialVision={initialVision} initialSettings={initialSettings} creator={selectedChar} /></div>
    <div role="tabpanel" hidden={mode !== 'talk'} style={{ display: mode === 'talk' ? 'block' : 'none' }}><SceneFlowV2 campaignId={initialCampaign?.id ?? null} initialVision={initialVision} initialSettings={initialSettings} creator={selectedChar} /></div>
  </div>;
}
