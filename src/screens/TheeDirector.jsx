import React from 'react';
import { Card } from '../components/surfaces/Card.jsx';
import { Icon } from '../components/core/Icon.jsx';
import { ShootBuilder } from '../components/shoot/ShootBuilder.jsx';
import { PromptLab } from './PromptLab.jsx';
import { SceneFlow } from './SceneFlow.jsx';
import { resolveActiveCreator, saveActiveCreatorId } from '../lib/activeCreator.js';

const LABEL = { font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--text-muted)', margin: 0 };

function loadCharacters() {
  try { return JSON.parse(localStorage.getItem('ts_characters') || '[]'); } catch { return []; }
}
function saveCharacters(list) {
  try { localStorage.setItem('ts_characters', JSON.stringify(list)); } catch {}
}
function getCharacterImage(char) {
  return char?.refImages?.[0] || char?.image || null;
}
function getAllImages(char) {
  if (!char) return [];
  if (char.refImages?.length) return char.refImages;
  if (char.image) return [char.image];
  return [];
}

function CharacterSelector({ characters, selectedId, onSelect }) {
  if (!characters.length) return null;
  return (
    <div>
      <div style={{ ...LABEL, marginBottom: 12 }}>Active Creator</div>
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
        <button
          onClick={() => onSelect(null)}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            background: 'none', border: `2px solid ${!selectedId ? 'var(--accent-deep)' : 'var(--border)'}`,
            borderRadius: 'var(--radius-lg)', padding: '8px 12px', cursor: 'pointer',
            color: !selectedId ? 'var(--accent-deep)' : 'var(--text-faint)',
            font: '500 0.75rem/1 var(--font-ui)', fontFamily: 'inherit',
            minWidth: 64, transition: 'all var(--t-fast)',
          }}
        >
          <Icon name="user-x" size={18} strokeWidth={1.5} />
          None
        </button>
        {characters.map(char => {
          const img = getCharacterImage(char);
          const active = selectedId === char.id;
          return (
            <button
              key={char.id}
              onClick={() => onSelect(char.id)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                background: 'none', border: `2px solid ${active ? 'var(--accent-deep)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-lg)', padding: 8, cursor: 'pointer',
                fontFamily: 'inherit', transition: 'all var(--t-fast)', minWidth: 64,
              }}
            >
              <div style={{
                width: 44, height: 58, borderRadius: 8, overflow: 'hidden',
                background: 'var(--grad-portrait)', flexShrink: 0,
              }}>
                {img
                  ? <img src={img} alt={char.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)' }}><Icon name="user" size={18} strokeWidth={1} /></div>
                }
              </div>
              <span style={{
                font: `${active ? 600 : 500} 0.72rem/1.2 var(--font-ui)`,
                color: active ? 'var(--accent-deep)' : 'var(--text-muted)',
                maxWidth: 64, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {char.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Three ways into the same generate pipeline. Guided (ShootBuilder) and
// Describe It (Prompt Lab) both already call generateImage/characterGenerate
// under the hood, so folding them in here is a real pipeline merge — no
// behavior change to either. Talk It Through (Scene Flow) is nested as-is,
// deliberately cosmetic: it still runs its own conversational backend pair
// (sceneFlowChat/sceneFlowGenerate), a genuinely different pipeline that
// wasn't rewired per an explicit product call — see the Phase 3 summary.
const MODES = [
  { id: 'guided',   label: 'Guided',            icon: 'sliders-horizontal' },
  { id: 'describe', label: 'Describe It',        icon: 'flask-conical' },
  { id: 'talk',     label: 'Talk It Through',    icon: 'message-circle' },
];

export function TheeDirector({ onNav, onActiveCreatorChange, initialScene = 'None', initialVision = '', initialCampaign = null }) {
  const [mode, setMode] = React.useState('guided');
  const [characters, setCharacters] = React.useState(loadCharacters);
  // A campaign's assigned creator takes priority over "whatever was last
  // active" — arriving via "Open in Director" is a deliberate choice of who
  // this session is about.
  const [selectedCharId, setSelectedCharId] = React.useState(() => {
    const chars = loadCharacters();
    if (initialCampaign?.creatorId != null && chars.some(c => c.id === initialCampaign.creatorId)) {
      return initialCampaign.creatorId;
    }
    return resolveActiveCreator(chars)?.id ?? null;
  });
  // Escape hatch out of the "pick a creator" gate — build a subject with raw
  // attributes instead. Skips the gate entirely once a creator is chosen.
  const [buildWithoutCreator, setBuildWithoutCreator] = React.useState(false);

  // Persist the campaign's creator as the studio-wide active one too, once,
  // on arrival — mirrors selectCreator's side effects without re-firing on
  // every render or clobbering a later manual change.
  React.useEffect(() => {
    if (selectedCharId != null) {
      saveActiveCreatorId(selectedCharId);
      onActiveCreatorChange?.(characters.find(c => c.id === selectedCharId) || null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCampaign?.id]);

  const selectCreator = (id) => {
    setSelectedCharId(id);
    saveActiveCreatorId(id);
    if (id != null) setBuildWithoutCreator(false);
    // Push the change up so the sidebar chip updates immediately instead of
    // only reflecting whatever Characters last set — no global store, this
    // is the cheap version: caller passes the same setter Characters uses.
    onActiveCreatorChange?.(characters.find(c => c.id === id) || null);
  };

  const selectedChar = characters.find(c => c.id === selectedCharId) || null;

  const handleSaveAsAnchorForActive = (compressedDataUrl) => {
    if (!selectedCharId) return;
    const updated = characters.map(c => {
      if (c.id !== selectedCharId) return c;
      const existing = getAllImages(c);
      if (existing.includes(compressedDataUrl)) return c;
      const newRefs = [...existing, compressedDataUrl];
      return { ...c, refImages: newRefs, image: newRefs[0] };
    });
    saveCharacters(updated);
    setCharacters(updated);
  };

  const gated = characters.length > 0 && !selectedCharId && !buildWithoutCreator;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 'var(--content-max)', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
        <div>
          <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--accent-deep)', marginBottom: 10 }}>Thee Director</div>
          <h1 style={{ font: 'var(--display-lg)', color: 'var(--text-strong)', letterSpacing: '-0.015em', margin: '0 0 10px' }}>Direct with intention. Create with impact.</h1>
          <p style={{ font: 'var(--text-lg)', color: 'var(--text-muted)', margin: 0, maxWidth: 520 }}>Shape content that connects. Dial in every detail. Let Thee Studio handle the rest.</p>
        </div>
      </div>

      {/* Pinned campaign context — visible across all three tabs since it's
          about the session, not just the Guided form. */}
      {initialCampaign && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 18px',
          borderRadius: 'var(--radius-lg)', background: 'var(--rose-glass)', border: '1px solid var(--border-strong)',
        }}>
          <Icon name="megaphone" size={16} strokeWidth={1.75} style={{ color: 'var(--accent-deep)', flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ font: '600 0.8125rem/1 var(--font-ui)', color: 'var(--accent-deep)', marginBottom: 4 }}>
              Shooting for {initialCampaign.name}
            </div>
            {initialCampaign.brief && (
              <div style={{ font: 'var(--text-sm)', color: 'var(--text-body)', lineHeight: 1.5 }}>{initialCampaign.brief}</div>
            )}
            <div style={{ font: 'var(--text-xs)', color: 'var(--text-faint)', marginTop: 4 }}>Every image generated here is tagged back to this campaign.</div>
          </div>
        </div>
      )}

      {/* Input mode toggle */}
      <div style={{ display: 'flex', gap: 8 }}>
        {MODES.map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '9px 16px', borderRadius: 'var(--radius-pill)', cursor: 'pointer',
              border: `1.5px solid ${mode === m.id ? 'var(--accent-deep)' : 'var(--border)'}`,
              background: mode === m.id ? 'var(--rose-deep)' : 'transparent',
              color: mode === m.id ? 'var(--accent-deep)' : 'var(--text-muted)',
              font: '600 0.85rem/1 var(--font-ui)', fontFamily: 'inherit',
              transition: 'all var(--t-fast)',
            }}
          >
            <Icon name={m.icon} size={15} strokeWidth={1.75} /> {m.label}
          </button>
        ))}
      </div>

      {mode === 'guided' && (
        gated ? (
          <Card style={{ display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center', textAlign: 'center', padding: '40px 32px' }}>
            <Icon name="user-round-search" size={30} strokeWidth={1.25} style={{ color: 'var(--text-faint)' }} />
            <div>
              <div style={{ font: '600 1.0625rem/1.3 var(--font-display)', color: 'var(--text-strong)', marginBottom: 6 }}>Pick a creator to start shooting</div>
              <div style={{ font: 'var(--text-sm)', color: 'var(--text-muted)' }}>Guided mode builds every shot around a saved creator's locked identity.</div>
            </div>
            <div style={{ width: '100%', maxWidth: 560 }}>
              <CharacterSelector characters={characters} selectedId={selectedCharId} onSelect={selectCreator} />
            </div>
            <button
              onClick={() => setBuildWithoutCreator(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'var(--text-sm)', color: 'var(--accent-deep)', textDecoration: 'underline', padding: 0, fontFamily: 'inherit' }}
            >
              Or build a new subject without a creator
            </button>
          </Card>
        ) : (
          <>
            {characters.length > 0 && (
              <Card style={{ padding: '16px 20px' }}>
                <CharacterSelector characters={characters} selectedId={selectedCharId} onSelect={selectCreator} />
              </Card>
            )}
            <ShootBuilder
              creator={selectedChar}
              allowNoCreator
              initialScene={initialScene}
              initialNotes={initialVision}
              onSaveAsCreator={selectedChar ? handleSaveAsAnchorForActive : undefined}
              campaignId={initialCampaign?.id ?? null}
            />
          </>
        )
      )}

      {mode === 'describe' && <PromptLab onNav={onNav} />}

      {mode === 'talk' && <SceneFlow />}

    </div>
  );
}
