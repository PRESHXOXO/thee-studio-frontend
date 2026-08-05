import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/core/Button.jsx';
import { Icon } from '../components/core/Icon.jsx';
import { Card } from '../components/surfaces/Card.jsx';
import { EmptyState } from '../components/feedback/EmptyState.jsx';
import { useProduction } from '../context/ProductionContext.jsx';
import {
  MOTION_PRESETS,
  REVIEW_CRITERIA,
  REVIEW_LABELS,
  SHOT_TYPES,
  emptyReviewScores,
} from '../production/domain.js';

const FIELD = { display: 'flex', flexDirection: 'column', gap: 7 };
const LABEL = {
  font: 'var(--label)', letterSpacing: 'var(--label-spacing)',
  textTransform: 'uppercase', color: 'var(--text-muted)',
};
const INPUT = {
  width: '100%', boxSizing: 'border-box', padding: '10px 12px',
  background: 'var(--white)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)', font: 'var(--text-sm)',
  color: 'var(--text-body)', outline: 'none', fontFamily: 'inherit',
};

function Modal({ title, eyebrow, onClose, children, width = 620 }) {
  React.useEffect(() => {
    const onKey = event => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 1000, padding: 24,
      background: 'rgba(25,16,42,.55)', backdropFilter: 'blur(6px)',
      display: 'grid', placeItems: 'center',
    }}>
      <Card onClick={event => event.stopPropagation()} style={{
        width: '100%', maxWidth: width, maxHeight: 'calc(100vh - 48px)',
        overflowY: 'auto', padding: 28,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 22 }}>
          <div>
            {eyebrow && <div style={{ ...LABEL, color: 'var(--accent-deep)', marginBottom: 7 }}>{eyebrow}</div>}
            <h2 style={{ font: 'var(--display-sm)', margin: 0, color: 'var(--text-strong)' }}>{title}</h2>
          </div>
          <button aria-label="Close" onClick={onClose} style={{ border: 0, background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <Icon name="x" size={20} />
          </button>
        </div>
        {children}
      </Card>
    </div>
  );
}

function Status({ value }) {
  const ready = ['succeeded', 'ready', 'complete', 'approved'].includes(value);
  const failed = ['failed', 'needs-work'].includes(value);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '4px 9px',
      borderRadius: 999, font: '600 .68rem/1 var(--font-ui)', textTransform: 'uppercase',
      letterSpacing: '.05em',
      background: ready ? 'var(--status-ready-bg)' : failed ? 'var(--status-locked-bg)' : 'var(--cream-deep)',
      color: ready ? 'var(--status-ready)' : failed ? 'var(--cherry)' : 'var(--text-muted)',
    }}>{String(value || 'draft').replaceAll('_', ' ')}</span>
  );
}

function CampaignModal({ creators, onClose, onCreate }) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const submit = async event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true); setError('');
    try {
      await onCreate({
        creatorId: String(data.get('creatorId')),
        title: String(data.get('title')).trim(),
        brief: String(data.get('brief')).trim(),
        defaultAspectRatio: String(data.get('aspectRatio')),
      });
    } catch (caught) {
      setError(caught.message || 'Unable to create campaign.');
      setBusy(false);
    }
  };
  return (
    <Modal title="Create production campaign" eyebrow="Brief → shots → approved assets" onClose={onClose}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <label style={FIELD}><span style={LABEL}>Creator</span>
          <select aria-label="Campaign creator" name="creatorId" required style={INPUT}>
            {creators.map(creator => <option key={creator.id} value={creator.id}>{creator.name}</option>)}
          </select>
        </label>
        <label style={FIELD}><span style={LABEL}>Campaign name</span>
          <input aria-label="Campaign name" name="title" required autoFocus placeholder="Summer fragrance story" style={INPUT} />
        </label>
        <label style={FIELD}><span style={LABEL}>Creative brief</span>
          <textarea aria-label="Creative brief" name="brief" rows={4} placeholder="Intent, audience, deliverables, visual direction…" style={{ ...INPUT, resize: 'vertical' }} />
        </label>
        <label style={FIELD}><span style={LABEL}>Default aspect ratio</span>
          <select aria-label="Default aspect ratio" name="aspectRatio" defaultValue="9:16" style={INPUT}>
            {['9:16', '4:5', '1:1', '16:9'].map(value => <option key={value}>{value}</option>)}
          </select>
        </label>
        {error && <div role="alert" style={{ color: 'var(--cherry)', font: 'var(--text-sm)' }}>{error}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="accent" loading={busy}>Build shot list</Button>
        </div>
      </form>
    </Modal>
  );
}

function ShotModal({ position, defaultAspectRatio, onClose, onCreate }) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const submit = async event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true); setError('');
    try {
      await onCreate({
        title: String(data.get('title')).trim(),
        shot_type: String(data.get('shotType')),
        prompt_template: String(data.get('prompt')).trim(),
        framing: String(data.get('framing')).trim(),
        environment: String(data.get('environment')).trim(),
        styling_notes: String(data.get('styling')).trim(),
        lighting_notes: String(data.get('lighting')).trim(),
        realism_notes: String(data.get('realism')).trim(),
        motion_plan: String(data.get('motion')).trim(),
        negative_constraints: String(data.get('negative')).trim(),
        aspect_ratio: String(data.get('aspectRatio')),
        position,
      });
      onClose();
    } catch (caught) {
      setError(caught.message || 'Unable to add shot.');
      setBusy(false);
    }
  };
  return (
    <Modal title="Direct the frame" eyebrow={`Shot ${String(position).padStart(2, '0')}`} onClose={onClose} width={850}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 17 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <label style={FIELD}><span style={LABEL}>Shot title</span><input aria-label="Shot title" name="title" required autoFocus placeholder="Vanity hero close-up" style={INPUT} /></label>
          <label style={FIELD}><span style={LABEL}>Shot type</span><select aria-label="Shot type" name="shotType" style={INPUT}>{SHOT_TYPES.map(type => <option key={type}>{type}</option>)}</select></label>
          <label style={FIELD}><span style={LABEL}>Framing</span><input aria-label="Framing" name="framing" placeholder="Tight close-up, eye level, 50mm feel" style={INPUT} /></label>
          <label style={FIELD}><span style={LABEL}>Aspect ratio</span><select aria-label="Shot aspect ratio" name="aspectRatio" defaultValue={defaultAspectRatio} style={INPUT}>{['9:16', '4:5', '1:1', '16:9'].map(value => <option key={value}>{value}</option>)}</select></label>
        </div>
        <label style={FIELD}><span style={LABEL}>Prompt template</span><textarea aria-label="Prompt template" name="prompt" required rows={3} placeholder="Creator at a marble vanity, poised but candid…" style={INPUT} /></label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <label style={FIELD}><span style={LABEL}>Environment</span><textarea aria-label="Environment" name="environment" rows={3} placeholder="Quiet five-star hotel suite…" style={INPUT} /></label>
          <label style={FIELD}><span style={LABEL}>Styling</span><textarea aria-label="Styling notes" name="styling" rows={3} placeholder="Silk wrap, minimal gold jewelry…" style={INPUT} /></label>
          <label style={FIELD}><span style={LABEL}>Lighting</span><textarea aria-label="Lighting notes" name="lighting" rows={3} placeholder="Soft window key, warm practicals…" style={INPUT} /></label>
          <label style={FIELD}><span style={LABEL}>Realism</span><textarea aria-label="Realism notes" name="realism" rows={3} placeholder="Natural skin, coherent reflection and shadows…" style={INPUT} /></label>
          <label style={FIELD}><span style={LABEL}>Motion plan</span><textarea aria-label="Motion plan" name="motion" rows={3} placeholder="Natural blink, slight gaze shift…" style={INPUT} /></label>
          <label style={FIELD}><span style={LABEL}>Negative constraints</span><textarea aria-label="Negative constraints" name="negative" rows={3} placeholder="No warped mirror, no extra fingers…" style={INPUT} /></label>
        </div>
        {error && <div role="alert" style={{ color: 'var(--cherry)', font: 'var(--text-sm)' }}>{error}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="accent" loading={busy}>Add to shot list</Button>
        </div>
      </form>
    </Modal>
  );
}

function ReviewModal({ asset, review, isHero, onClose, onSave, onSelect }) {
  const [scores, setScores] = React.useState(review?.scores || emptyReviewScores());
  const [notes, setNotes] = React.useState(review?.reviewer_notes || '');
  const [busy, setBusy] = React.useState(false);
  const average = Object.values(scores).reduce((sum, value) => sum + Number(value), 0) / REVIEW_CRITERIA.length;
  const save = async select => {
    setBusy(true);
    await onSave(asset.id, scores, notes);
    if (select) await onSelect(asset.shot_id, asset.id);
    onClose();
  };
  return (
    <Modal title="Quality review" eyebrow="Frame QC" onClose={onClose} width={760}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(230px,.8fr) 1.2fr', gap: 24 }}>
        <div>
          <div style={{ position: 'relative', borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: 'var(--cream-deep)' }}>
            <img src={asset.signed_url || asset.external_url} alt="Candidate under review" style={{ width: '100%', display: 'block', aspectRatio: '3/4', objectFit: 'cover' }} />
            {isHero && <div style={{ position: 'absolute', top: 10, right: 10 }}><Status value="approved" /></div>}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginTop: 14 }}>
            <strong style={{ font: 'var(--display-sm)', color: 'var(--text-strong)' }}>{average.toFixed(1)}</strong>
            <span style={{ font: 'var(--text-sm)', color: 'var(--text-muted)' }}>/ 5 quality score</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {REVIEW_CRITERIA.map(criterion => (
            <label key={criterion} style={{ display: 'grid', gridTemplateColumns: '135px 1fr 22px', alignItems: 'center', gap: 10, font: 'var(--text-xs)', color: 'var(--text-body)' }}>
              <span>{REVIEW_LABELS[criterion]}</span>
              <input aria-label={REVIEW_LABELS[criterion]} type="range" min="0" max="5" step="1" value={scores[criterion]} onChange={event => setScores({ ...scores, [criterion]: Number(event.target.value) })} />
              <strong>{scores[criterion]}</strong>
            </label>
          ))}
          <label style={{ ...FIELD, marginTop: 8 }}><span style={LABEL}>Reviewer notes</span>
            <textarea aria-label="Reviewer notes" rows={3} value={notes} onChange={event => setNotes(event.target.value)} placeholder="Flag identity, anatomy, lighting, or environment issues…" style={INPUT} />
          </label>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 9, marginTop: 6 }}>
            <Button variant="secondary" loading={busy} onClick={() => save(false)}>Save review</Button>
            <Button variant="accent" disabled={isHero} loading={busy} onClick={() => save(true)}>{isHero ? 'Hero selected' : 'Choose hero'}</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function MotionModal({ onClose, onGenerate }) {
  const [presets, setPresets] = React.useState(['natural blink', 'subtle breathing']);
  const [busy, setBusy] = React.useState(false);
  const submit = async event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    await onGenerate({
      primaryMovement: String(data.get('primary')),
      secondaryMovement: String(data.get('secondary')),
      cameraMovement: String(data.get('camera')),
      realismConstraints: String(data.get('realism')),
      preserveConstraints: String(data.get('preserve')),
      durationSeconds: Number(data.get('duration')),
      verticalOutput: data.get('vertical') === 'on',
      presets,
    });
    onClose();
  };
  return (
    <Modal title="Animate selected hero" eyebrow="Still → restrained motion" onClose={onClose}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
        <div style={FIELD}><span style={LABEL}>Motion presets</span><div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          {MOTION_PRESETS.map(preset => <button type="button" key={preset} onClick={() => setPresets(current => current.includes(preset) ? current.filter(item => item !== preset) : [...current, preset])} style={{ padding: '7px 10px', borderRadius: 999, border: `1px solid ${presets.includes(preset) ? 'var(--accent-indigo)' : 'var(--border)'}`, background: presets.includes(preset) ? 'var(--accent-indigo-soft)' : 'var(--white)', color: 'var(--text-body)', cursor: 'pointer', font: 'var(--text-xs)' }}>{preset}</button>)}
        </div></div>
        <label style={FIELD}><span style={LABEL}>Primary movement</span><input name="primary" defaultValue="Soft head turn with natural blink" required style={INPUT} /></label>
        <label style={FIELD}><span style={LABEL}>Secondary movement</span><input name="secondary" defaultValue="Subtle breathing and fabric response" style={INPUT} /></label>
        <label style={FIELD}><span style={LABEL}>Camera movement</span><input name="camera" defaultValue="Stable smartphone tracking with slight handheld drift" style={INPUT} /></label>
        <label style={FIELD}><span style={LABEL}>Realism constraints</span><textarea name="realism" defaultValue="Natural micro-movements only. No floating, rubber motion, or speed ramps." rows={2} style={INPUT} /></label>
        <label style={FIELD}><span style={LABEL}>Preserve constraints</span><textarea name="preserve" defaultValue="No morphing. Preserve identity, face geometry, outfit, accessories, hairline, hands, and environment." rows={2} style={INPUT} /></label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <label style={{ ...FIELD, flex: 1 }}><span style={LABEL}>Duration</span><select name="duration" defaultValue="5" style={INPUT}><option value="3">3 seconds</option><option value="5">5 seconds</option><option value="8">8 seconds</option></select></label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', font: 'var(--text-sm)' }}><input name="vertical" type="checkbox" defaultChecked /> Vertical output</label>
        </div>
        <Button type="submit" variant="primary" loading={busy}>Generate restrained clip</Button>
      </form>
    </Modal>
  );
}

function ShotCard({ shot, workspace, busy, onGenerate, onReview, onMotion, onExport }) {
  const [count, setCount] = React.useState(1);
  const assets = workspace.assets.filter(asset => asset.shot_id === shot.id);
  const selection = workspace.selections.find(item => item.shot_id === shot.id);
  const hero = assets.find(asset => asset.id === selection?.still_asset_id);
  const clips = workspace.clips.filter(clip => clip.shot_id === shot.id);
  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '54px 1fr auto', gap: 16, padding: 22, alignItems: 'start' }}>
        <div style={{ font: 'var(--display-sm)', color: 'var(--accent-deep)', borderRight: '1px solid var(--border)' }}>{String(shot.position).padStart(2, '0')}</div>
        <div>
          <div style={{ ...LABEL, marginBottom: 6 }}>{shot.shot_type} · {shot.aspect_ratio}</div>
          <h2 style={{ font: 'var(--display-sm)', margin: '0 0 7px', color: 'var(--text-strong)' }}>{shot.title}</h2>
          <p style={{ font: 'var(--text-sm)', lineHeight: 1.55, color: 'var(--text-muted)', margin: 0 }}>{shot.prompt_template}</p>
        </div>
        <Status value={hero ? 'approved' : assets.length ? 'review' : 'planned'} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', background: 'var(--cream-deep)', borderBlock: '1px solid var(--border)' }}>
        {[['Framing', shot.framing], ['Environment', shot.environment], ['Motion intent', shot.motion_plan]].map(([label, value]) => (
          <div key={label} style={{ padding: '12px 18px', borderRight: '1px solid var(--border)' }}>
            <div style={{ ...LABEL, fontSize: '.58rem', marginBottom: 5 }}>{label}</div>
            <div style={{ font: 'var(--text-xs)', color: 'var(--text-body)' }}>{value || 'Not set'}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px' }}>
        <Icon name="sparkles" size={17} color="var(--accent-deep)" />
        <span style={{ flex: 1, font: 'var(--text-sm)', color: 'var(--text-body)' }}>Generate candidate set</span>
        <select aria-label={`Candidate count for ${shot.title}`} value={count} onChange={event => setCount(Number(event.target.value))} style={{ ...INPUT, width: 'auto' }}>
          {[1, 2, 4].map(value => <option key={value} value={value}>{value} {value === 1 ? 'frame' : 'frames'}</option>)}
        </select>
        <Button variant={assets.length ? 'secondary' : 'primary'} size="sm" loading={busy} onClick={() => onGenerate(shot, count)}>{assets.length ? 'Regenerate' : 'Generate stills'}</Button>
      </div>
      {assets.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, background: 'var(--border)', borderTop: '1px solid var(--border)' }}>
          {assets.map((asset, index) => {
            const review = workspace.reviews.find(item => item.still_asset_id === asset.id);
            const isHero = asset.id === hero?.id;
            return (
              <button key={asset.id} onClick={() => onReview(asset)} style={{ border: 0, padding: 0, background: 'var(--white)', cursor: 'pointer', position: 'relative', textAlign: 'left' }}>
                <img src={asset.signed_url || asset.external_url} alt={`${shot.title} candidate ${index + 1}`} style={{ width: '100%', display: 'block', aspectRatio: '3/4', objectFit: 'cover', boxShadow: isHero ? 'inset 0 0 0 3px var(--accent-indigo)' : 'none' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: 8, font: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  <span>{review ? 'Reviewed' : `C${index + 1}`}</span><span>{isHero ? 'Hero' : `Seed ${asset.seed || '—'}`}</span>
                </div>
                {isHero && <div style={{ position: 'absolute', top: 8, right: 8 }}><Status value="approved" /></div>}
              </button>
            );
          })}
        </div>
      )}
      {hero && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 16, background: 'var(--accent-indigo-soft)', borderTop: '1px solid var(--border)' }}>
          <Icon name="crown" color="var(--accent-indigo)" />
          <div style={{ flex: 1 }}><strong style={{ font: '600 var(--text-sm)', color: 'var(--text-strong)' }}>Hero locked</strong><div style={{ font: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 3 }}>Ready for motion or delivery</div></div>
          <Button variant="secondary" size="sm" loading={busy} onClick={() => onExport(shot, hero, 'hero_still')}>Prepare export</Button>
          <Button variant="accent" size="sm" disabled={busy} onClick={() => onMotion(shot, hero)}>Animate hero</Button>
        </div>
      )}
      {clips.length > 0 && (
        <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border)' }}>
          {clips.map(clip => <div key={clip.id} style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBlock: 6, font: 'var(--text-xs)' }}><Icon name="clapperboard" size={15} /><span style={{ flex: 1 }}>{clip.motion_guidance.primaryMovement}</span><Status value={clip.status} />{clip.status === 'succeeded' && <Button variant="ghost" size="sm" loading={busy} onClick={() => onExport(shot, clip, 'clip')}>Export clip</Button>}</div>)}
        </div>
      )}
    </Card>
  );
}

function CampaignList({ repository, isCloud }) {
  const navigate = useNavigate();
  const [creators, setCreators] = React.useState([]);
  const [projects, setProjects] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [creating, setCreating] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true); setError('');
    try {
      let studioCreators = [];
      try { studioCreators = JSON.parse(localStorage.getItem('ts_characters') || '[]'); } catch {}
      await repository.syncStudioCreators?.(studioCreators);
      let creatorMemories = {};
      try { creatorMemories = JSON.parse(localStorage.getItem('ts_creator_memory_v1') || '{}'); } catch {}
      await repository.syncCreatorMemories?.(creatorMemories);
      await repository.ensureSampleWorkspace?.();
      const [nextCreators, nextProjects] = await Promise.all([repository.listCreators(), repository.listProjects()]);
      setCreators(nextCreators); setProjects(nextProjects);
    } catch (caught) { setError(caught.message || 'Unable to load campaigns.'); }
    finally { setLoading(false); }
  }, [repository]);
  React.useEffect(() => { load(); }, [load]);

  const create = async input => {
    const project = await repository.createProject(input);
    setCreating(false);
    navigate(`/studio/campaigns/${project.id}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 26, maxWidth: 'var(--content-max)', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20 }}>
        <div>
          <div style={{ ...LABEL, color: 'var(--accent-deep)', marginBottom: 9 }}>Production workspace</div>
          <h1 style={{ font: 'var(--display-lg)', margin: '0 0 8px', color: 'var(--text-strong)' }}>Campaigns</h1>
          <p style={{ font: 'var(--text-lg)', color: 'var(--text-muted)', margin: 0 }}>From brief to shot list, frame review, motion, and delivery.</p>
        </div>
        <Button variant="accent" icon="plus" disabled={!creators.length} onClick={() => setCreating(true)}>New campaign</Button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 13px', borderRadius: 'var(--radius-md)', background: isCloud ? 'var(--status-ready-bg)' : 'var(--cream-deep)', color: isCloud ? 'var(--status-ready)' : 'var(--text-muted)', font: 'var(--text-xs)' }}>
        <Icon name={isCloud ? 'cloud-check' : 'laptop'} size={15} />
        {isCloud ? 'Cloud production workspace — projects and assets sync across devices.' : 'Local production preview — connect Supabase to enable cloud sync and live provider jobs.'}
      </div>
      {error && <Card variant="rose"><div role="alert" style={{ color: 'var(--cherry)', font: 'var(--text-sm)' }}>{error}</div></Card>}
      {loading ? <EmptyState icon="loader" title="Loading campaigns…" /> : projects.length ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
          {projects.map(project => {
            const creator = creators.find(item => item.id === project.creator_id);
            return (
              <Card key={project.id} onClick={() => navigate(`/studio/campaigns/${project.id}`)} style={{ display: 'flex', flexDirection: 'column', gap: 14, minHeight: 150 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}><span style={{ width: 40, height: 40, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'var(--accent-indigo-soft)', color: 'var(--accent-indigo)' }}><Icon name="clapperboard" /></span><Status value={project.status} /></div>
                <div><h3 style={{ font: 'var(--display-sm)', margin: '0 0 6px', color: 'var(--text-strong)' }}>{project.title}</h3><p style={{ font: 'var(--text-sm)', color: 'var(--text-muted)', lineHeight: 1.45, margin: 0 }}>{project.brief || 'Shot plan ready to build.'}</p></div>
                <div style={{ marginTop: 'auto', font: 'var(--text-xs)', color: 'var(--text-faint)' }}>{creator?.name || 'Creator'} · {project.default_aspect_ratio}</div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card><EmptyState icon="clapperboard" title={creators.length ? 'Build your first production campaign' : isCloud ? 'Create a creator first' : 'Create a cast member first'} body={creators.length ? 'Start with a brief, plan intentional shots, review candidates, and deliver approved assets.' : isCloud ? 'Campaigns use your saved creator details. Create and save a creator, then return here.' : 'Campaigns inherit identity from your Cast. Create and save a creator, then return here.'} cta={creators.length ? 'New campaign' : isCloud ? 'New Creator' : 'Go to Cast'} onCta={() => creators.length ? setCreating(true) : navigate(isCloud ? '/studio/images' : '/studio/characters')} /></Card>
      )}
      {creating && <CampaignModal creators={creators} onClose={() => setCreating(false)} onCreate={create} />}
    </div>
  );
}

function CampaignDetail({ projectId, repository, pipeline, refreshUsage }) {
  const navigate = useNavigate();
  const [workspace, setWorkspace] = React.useState(null);
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [shotModal, setShotModal] = React.useState(false);
  const [reviewAsset, setReviewAsset] = React.useState(null);
  const [motion, setMotion] = React.useState(null);
  const [busyShot, setBusyShot] = React.useState(null);
  const runningShots = React.useRef(new Set());

  const load = React.useCallback(async () => {
    setLoading(true);
    try { setWorkspace(await repository.getWorkspace(projectId)); setError(''); }
    catch (caught) { setError(caught.message || 'Unable to load campaign.'); }
    finally { setLoading(false); }
  }, [projectId, repository]);
  React.useEffect(() => { load(); }, [load]);

  const run = async (shot, action) => {
    if (runningShots.current.has(shot.id)) return;
    runningShots.current.add(shot.id);
    setBusyShot(shot.id); setError('');
    try { await action(); await load(); await refreshUsage(); }
    catch (caught) { setError(caught.message || 'Production action failed.'); }
    finally { runningShots.current.delete(shot.id); setBusyShot(null); }
  };
  const exportAsset = async (shot, asset, type) => run(shot, () => pipeline.createExport(
    workspace.project.id,
    asset.id,
    asset.signed_url || asset.external_url,
    type,
    shot.aspect_ratio || workspace.project.default_aspect_ratio,
  ));

  if (loading) return <EmptyState icon="loader" title="Loading production…" />;
  if (!workspace) return <Card variant="rose"><div role="alert" style={{ color: 'var(--cherry)' }}>{error || 'Campaign unavailable.'}</div></Card>;
  const reviewed = workspace.assets.filter(asset => workspace.reviews.some(review => review.still_asset_id === asset.id)).length;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 'var(--content-max)', margin: '0 auto' }}>
      <button onClick={() => navigate('/studio/campaigns')} style={{ border: 0, background: 'none', padding: 0, display: 'flex', alignItems: 'center', gap: 7, color: 'var(--text-muted)', cursor: 'pointer', width: 'max-content', font: 'var(--text-sm)' }}><Icon name="arrow-left" size={16} /> Campaigns</button>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20 }}>
        <div><div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}><Status value={workspace.project.status} /><span style={{ font: 'var(--text-xs)', color: 'var(--text-faint)' }}>{workspace.project.default_aspect_ratio} · {workspace.creator.name}</span></div><h1 style={{ font: 'var(--display-lg)', margin: '0 0 8px', color: 'var(--text-strong)' }}>{workspace.project.title}</h1><p style={{ font: 'var(--text-base)', color: 'var(--text-muted)', margin: 0 }}>{workspace.project.brief || 'Intentional still-first production set.'}</p></div>
        <Button variant="accent" icon="plus" onClick={() => setShotModal(true)}>Add shot</Button>
      </div>
      {error && <Card variant="rose"><div role="alert" style={{ color: 'var(--cherry)', font: 'var(--text-sm)' }}>{error}</div></Card>}
      <Card style={{ padding: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
          {[
            ['01', 'Identity lock', workspace.identity],
            ['02', 'Still direction', workspace.assets.length],
            ['03', 'Hero selection', workspace.selections.length],
            ['04', 'Motion', workspace.clips.length],
          ].map(([number, label, done]) => <div key={number} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: 10, borderRadius: 'var(--radius-md)', background: done ? 'var(--status-ready-bg)' : 'var(--cream-deep)', color: done ? 'var(--status-ready)' : 'var(--text-muted)' }}><span style={{ width: 28, height: 28, borderRadius: '50%', display: 'grid', placeItems: 'center', border: '1px solid currentColor', font: '600 var(--text-xs)' }}>{done ? <Icon name="check" size={13} /> : number}</span><span style={{ font: '600 var(--text-xs)' }}>{label}</span></div>)}
        </div>
      </Card>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', font: 'var(--text-sm)', color: 'var(--text-muted)', padding: '0 4px' }}><span><strong style={{ color: 'var(--text-strong)' }}>{workspace.shots.length}</strong> shots</span><span><strong style={{ color: 'var(--text-strong)' }}>{workspace.assets.length}</strong> candidates</span><span><strong style={{ color: 'var(--text-strong)' }}>{reviewed}</strong> reviewed</span><span><strong style={{ color: 'var(--text-strong)' }}>{workspace.selections.length}</strong> heroes</span></div>
      {workspace.shots.length ? workspace.shots.map(shot => (
        <ShotCard key={shot.id} shot={shot} workspace={workspace} busy={busyShot === shot.id}
          onGenerate={(target, count) => run(target, () => pipeline.generateStills(target, workspace.identity, count, { memory: workspace.memory }))}
          onReview={setReviewAsset}
          onMotion={(target, asset) => setMotion({ shot: target, asset })}
          onExport={exportAsset}
        />
      )) : <Card><EmptyState icon="aperture" title="Plan the first frame" body="Break the campaign into intentional shots. Each frame keeps its own styling, lighting, realism, and motion constraints." cta="Add first shot" onCta={() => setShotModal(true)} /></Card>}
      {shotModal && <ShotModal position={workspace.shots.length + 1} defaultAspectRatio={workspace.project.default_aspect_ratio} onClose={() => setShotModal(false)} onCreate={input => repository.createShot(projectId, input).then(load)} />}
      {reviewAsset && <ReviewModal
        asset={reviewAsset}
        review={workspace.reviews.find(item => item.still_asset_id === reviewAsset.id)}
        isHero={workspace.selections.some(item => item.still_asset_id === reviewAsset.id)}
        onClose={() => setReviewAsset(null)}
        onSave={async (assetId, scores, notes) => {
          await repository.saveReview(assetId, scores, notes);
          await load();
        }}
        onSelect={async (shotId, assetId) => {
          await repository.selectHero(shotId, assetId);
          await load();
        }}
      />}
      {motion && <MotionModal onClose={() => setMotion(null)} onGenerate={guidance => run(motion.shot, () => pipeline.generateClip(motion.shot, motion.asset, guidance))} />}
    </div>
  );
}

export function CampaignStudio() {
  const { projectId } = useParams();
  const { repository, pipeline, isCloud, refreshUsage } = useProduction();
  return projectId
    ? <CampaignDetail projectId={projectId} repository={repository} pipeline={pipeline} refreshUsage={refreshUsage} />
    : <CampaignList repository={repository} isCloud={isCloud} />;
}
