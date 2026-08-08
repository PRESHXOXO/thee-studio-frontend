import React from 'react';
import { Button } from '../components/core/Button.jsx';
import { Icon } from '../components/core/Icon.jsx';
import { Card } from '../components/surfaces/Card.jsx';
import { EmptyState } from '../components/feedback/EmptyState.jsx';
import { loadLibrary } from '../lib/library.js';
import {
  EMPTY_BRAND_DNA,
  getCreatorMemory,
  learnCreatorMemory,
  memoryConfidence,
  saveCreatorMemory,
} from '../lib/creatorMemory.js';
import { resolveActiveCreator } from '../lib/activeCreator.js';
import { loadCharacters } from '../lib/creatorCache.js';
import { useAuth } from '../context/AuthContext.jsx';

const FIELD_META = [
  ['visualSignature', 'Visual signature', 'Editorial point of view, texture, energy, and recognizable finish.'],
  ['colorPalette', 'Color palette', 'Core colors, neutrals, contrast, grading, and colors to reserve.'],
  ['cameraLanguage', 'Camera language', 'Preferred lenses, framing, distance, depth, and composition rhythm.'],
  ['lighting', 'Lighting rules', 'Natural window light, hard flash, warm practicals, studio softness…'],
  ['wardrobeRules', 'Wardrobe rules', 'Silhouettes, materials, accessories, styling rhythm, and hard boundaries.'],
  ['locationRules', 'Location rules', 'Recurring environments, material language, geography, and atmosphere.'],
  ['mustKeep', 'Always preserve', 'Signature traits or brand cues every generation must keep.'],
  ['avoid', 'Never generate', 'Looks, scenes, styling, colors, or visual clichés to reject.'],
];

function SignalList({ title, items, empty }) {
  return (
    <div>
      <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 9 }}>{title}</div>
      {items?.length ? (
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {items.map(item => (
            <span key={item.value} className="ts-pill" style={{ padding: '6px 10px', font: 'var(--text-xs)', color: 'var(--accent-deep)', background: 'var(--rose-deep)', border: '1px solid var(--border)' }}>
              {item.value} <strong style={{ opacity: 0.55 }}>×{item.count}</strong>
            </span>
          ))}
        </div>
      ) : <div style={{ font: 'var(--text-sm)', color: 'var(--text-faint)' }}>{empty}</div>}
    </div>
  );
}

export function CreatorMemory({ onNav }) {
  const { session } = useAuth();
  // Depends on session id so the roster recomputes from the (already
  // account-scoped) cache on sign-in/account switch, not just on mount.
  const creators = React.useMemo(loadCharacters, [session?.id]);
  const active = resolveActiveCreator(creators);
  const [creatorId, setCreatorId] = React.useState(() => String(active?.id || creators[0]?.id || ''));
  const [memory, setMemory] = React.useState(() => getCreatorMemory(active?.id || creators[0]?.id));
  const [form, setForm] = React.useState(() => memory.preferences || EMPTY_BRAND_DNA);
  const [saved, setSaved] = React.useState(false);

  const memorySessionIdRef = React.useRef(session?.id ?? null);
  React.useEffect(() => {
    const nextId = session?.id ?? null;
    if (memorySessionIdRef.current === nextId) return;
    memorySessionIdRef.current = nextId;
    const nextActive = resolveActiveCreator(creators);
    const nextId2 = nextActive?.id || creators[0]?.id || '';
    setCreatorId(String(nextId2));
    const nextMemory = getCreatorMemory(nextId2);
    setMemory(nextMemory);
    setForm(nextMemory.preferences || EMPTY_BRAND_DNA);
  }, [session?.id, creators]);

  const rebuild = React.useCallback(id => {
    const next = learnCreatorMemory(id, loadLibrary()) || getCreatorMemory(id);
    setMemory(next);
    setForm(next.preferences);
    return next;
  }, []);

  React.useEffect(() => {
    if (creatorId) rebuild(creatorId);
  }, [creatorId, rebuild]);

  if (!creators.length) {
    return (
      <Card style={{ maxWidth: 720, margin: '40px auto' }}>
        <EmptyState icon="brain" title="Creator Memory needs a cast member" body="Build a creator first. Memory then learns from every approved, fixed, and rejected image." cta="Create a creator" onCta={() => onNav?.('images')} />
      </Card>
    );
  }

  const confidence = memoryConfidence(memory);
  const selectedCreator = creators.find(creator => String(creator.id) === creatorId);
  const save = () => {
    const next = saveCreatorMemory(creatorId, form);
    setMemory(next);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 'var(--content-max)', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
        <div>
          <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--accent-deep)', marginBottom: 9 }}>Compounding creative intelligence</div>
          <h1 style={{ font: 'var(--display-lg)', margin: '0 0 8px', color: 'var(--text-strong)' }}>Creator Memory</h1>
          <p style={{ font: 'var(--text-lg)', color: 'var(--text-muted)', margin: 0, maxWidth: 660 }}>Define Brand DNA once. Approvals and rejections teach every future shoot what belongs to this creator.</p>
        </div>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 220 }}>
          <span style={{ font: 'var(--label)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Creator</span>
          <select aria-label="Memory creator" value={creatorId} onChange={event => setCreatorId(event.target.value)} style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface-card)', color: 'var(--text-body)', font: 'var(--text-sm)' }}>
            {creators.map(creator => <option key={creator.id} value={creator.id}>{creator.name}</option>)}
          </select>
        </label>
      </div>

      <Card variant="rose" style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <Icon name="brain" size={20} color="var(--accent-deep)" />
            <strong style={{ font: '600 1.05rem/1 var(--font-display)', color: 'var(--text-strong)' }}>{selectedCreator?.name} memory · v{memory.version}</strong>
          </div>
          <div style={{ height: 8, maxWidth: 520, background: 'var(--white)', borderRadius: 999, overflow: 'hidden', marginTop: 13 }}>
            <div style={{ height: '100%', width: `${confidence}%`, background: 'var(--grad-coral)', transition: 'width .3s ease' }} />
          </div>
          <div style={{ font: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 7 }}>{confidence}% trained · grows with reviewed work and completed Brand DNA</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,auto)', gap: 18, textAlign: 'center' }}>
          {[['Saved', memory.feedback.total], ['Approved', memory.feedback.approved], ['Fix', memory.feedback.needsFix], ['Rejected', memory.feedback.rejected]].map(([label, value]) => (
            <div key={label}><strong style={{ display: 'block', font: 'var(--display-sm)', color: 'var(--text-strong)' }}>{value}</strong><span style={{ font: 'var(--text-xs)', color: 'var(--text-muted)' }}>{label}</span></div>
          ))}
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.45fr) minmax(300px,.75fr)', gap: 20, alignItems: 'start' }}>
        <Card style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <h2 style={{ font: 'var(--display-sm)', color: 'var(--text-strong)', margin: '0 0 5px' }}>Brand DNA</h2>
            <p style={{ font: 'var(--text-sm)', color: 'var(--text-muted)', margin: 0 }}>Rules inject into Director, Scene Flow, and Campaign prompts.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {FIELD_META.map(([field, label, placeholder]) => (
              <label key={field} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ font: '600 var(--text-xs)', color: 'var(--text-body)' }}>{label}</span>
                <textarea aria-label={label} rows={field === 'mustKeep' || field === 'avoid' ? 3 : 4} value={form[field] || ''} onChange={event => setForm({ ...form, [field]: event.target.value })} placeholder={placeholder} style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface-input, var(--cream-light))', color: 'var(--text-body)', font: 'var(--text-sm)', fontFamily: 'inherit' }} />
              </label>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 9 }}>
            <Button variant="secondary" onClick={() => rebuild(creatorId)}><Icon name="refresh-cw" size={14} /> Rebuild learning</Button>
            <Button variant="accent" onClick={save}><Icon name={saved ? 'check' : 'save'} size={14} /> {saved ? 'Memory saved' : 'Save Brand DNA'}</Button>
          </div>
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <h2 style={{ font: 'var(--display-sm)', color: 'var(--text-strong)', margin: 0 }}>Learned signals</h2>
            <SignalList title="Approved scenes" items={memory.learned.favoriteScenes} empty="Approve images to teach preferred scenes." />
            <SignalList title="Approved moods" items={memory.learned.favoriteMoods} empty="Mood patterns appear after review." />
            <SignalList title="Preferred engines" items={memory.learned.favoriteEngines} empty="Engine patterns appear after review." />
            <SignalList title="Weak or rejected scenes" items={memory.learned.avoidScenes} empty="Rejected patterns become guardrails." />
          </Card>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}><Icon name="history" size={16} /><strong style={{ color: 'var(--text-strong)' }}>Memory versions</strong></div>
            {memory.history.length ? memory.history.slice().reverse().slice(0, 5).map(version => (
              <div key={`${version.version}-${version.savedAt}`} style={{ display: 'flex', justifyContent: 'space-between', paddingBlock: 7, borderTop: '1px solid var(--border)', font: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                <span>Version {version.version}</span><span>{new Date(version.savedAt).toLocaleDateString()}</span>
              </div>
            )) : <p style={{ font: 'var(--text-sm)', color: 'var(--text-faint)', margin: 0 }}>First saved edit starts version history.</p>}
          </Card>
        </div>
      </div>
    </div>
  );
}
