import React from 'react';
import { Icon } from '../core/Icon.jsx';

// Stages vary by whether identity lock is active (vision pass takes longer)
const STAGES_IDENTITY = [
  { label: 'Reading your reference photos…',   target: 18, ms: 7000  },
  { label: 'Understanding facial identity…',   target: 48, ms: 18000 },
  { label: 'Generating image…',                target: 80, ms: 45000 },
  { label: 'Rendering final details…',         target: 94, ms: 25000 },
];

const STAGES_STANDARD = [
  { label: 'Building your prompt…',   target: 28, ms: 3000  },
  { label: 'Generating image…',       target: 78, ms: 22000 },
  { label: 'Rendering details…',      target: 94, ms: 12000 },
];

const STAGES_REPLICATE = [
  { label: 'Queuing on Replicate…',   target: 20, ms: 4000  },
  { label: 'Generating image…',       target: 85, ms: 20000 },
  { label: 'Downloading result…',     target: 94, ms: 5000  },
];

const STAGES_SCENE = [
  { label: 'Reading scene and references…', target: 16, ms: 7000 },
  { label: 'Building the final composition…', target: 42, ms: 18000 },
  { label: 'Generating your scene…', target: 82, ms: 70000 },
  { label: 'Rendering high-resolution details…', target: 94, ms: 45000 },
];

const STAGES_VIDEO = [
  { label: 'Preparing identity and motion…', target: 16, ms: 12000 },
  { label: 'Queuing the video render…', target: 34, ms: 20000 },
  { label: 'Rendering motion and continuity…', target: 82, ms: 110000 },
  { label: 'Finalizing your video…', target: 94, ms: 50000 },
];

const STAGES_CREATOR = [
  { label: 'Building creator identity…', target: 22, ms: 9000 },
  { label: 'Generating reference image…', target: 80, ms: 65000 },
  { label: 'Locking facial details…', target: 94, ms: 35000 },
];

const STAGES_REFERENCE_SET = [
  { label: 'Preparing the identity lock…', target: 14, ms: 12000 },
  { label: 'Generating reference angles…', target: 82, ms: 210000 },
  { label: 'Finishing the reference set…', target: 94, ms: 70000 },
];

const STAGES_CAMPAIGN = [
  { label: 'Preparing campaign direction…', target: 18, ms: 8000 },
  { label: 'Generating candidate frames…', target: 84, ms: 90000 },
  { label: 'Saving candidates for review…', target: 94, ms: 30000 },
];

function getStages(engine, identityLocked, mode) {
  if (mode === 'scene') return STAGES_SCENE;
  if (mode === 'video') return STAGES_VIDEO;
  if (mode === 'creator') return STAGES_CREATOR;
  if (mode === 'reference-set') return STAGES_REFERENCE_SET;
  if (mode === 'campaign') return STAGES_CAMPAIGN;
  if (engine && (engine.includes('replicate') || engine.includes('photomaker') || engine.includes('instantid') || engine.includes('flux'))) return STAGES_REPLICATE;
  if (identityLocked) return STAGES_IDENTITY;
  return STAGES_STANDARD;
}

// easeOutCubic
function ease(t) { return 1 - Math.pow(1 - t, 3); }

export function GenerationProgress({ active, identityLocked = false, engine = '', batchSize = 1, completedCount = null, mode = 'image', style }) {
  const [progress, setProgress]     = React.useState(0);
  const [stageIdx, setStageIdx]     = React.useState(0);
  const [complete, setComplete]     = React.useState(false);
  const [visible, setVisible]       = React.useState(false);

  const frameRef    = React.useRef(null);
  const stageRef    = React.useRef(null);
  const stageIdxRef = React.useRef(0);
  const progressRef = React.useRef(0);
  const stages      = React.useMemo(() => getStages(engine, identityLocked, mode), [engine, identityLocked, mode]);
  const currentStage = stages[Math.min(stageIdx, stages.length - 1)];

  React.useEffect(() => {
    if (active) {
      setProgress(0);
      setStageIdx(0);
      setComplete(false);
      setVisible(true);
      progressRef.current = 0;
      stageIdxRef.current = 0;
      stageRef.current  = Date.now();

      const animate = () => {
        const now = Date.now();
        const idx   = stageIdxRef.current;
        const stage = stages[idx];
        if (!stage) return;

        const prevTarget = idx === 0 ? 0 : stages[idx - 1].target;
        const t = Math.min(1, (now - stageRef.current) / stage.ms);
        let p = prevTarget + (stage.target - prevTarget) * ease(t);

        // Real provider APIs do not stream percentage data. Once the timed
        // stages finish, keep creeping toward 98% so a long render never
        // looks frozen while still reserving 100% for a real response.
        if (t >= 1 && idx === stages.length - 1) {
          const overtime = Math.max(0, now - stageRef.current - stage.ms);
          p = stage.target + (98 - stage.target) * (1 - Math.exp(-overtime / 90000));
        }

        setProgress(p);
        progressRef.current = p;

        if (t >= 1 && idx < stages.length - 1) {
          stageIdxRef.current = idx + 1;
          setStageIdx(idx + 1);
          stageRef.current = now;
        }

        frameRef.current = requestAnimationFrame(animate);
      };

      frameRef.current = requestAnimationFrame(animate);

      return () => {
        if (frameRef.current) cancelAnimationFrame(frameRef.current);
      };
    } else if (visible) {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      setProgress(100);
      setComplete(true);
      const hide = setTimeout(() => setVisible(false), 1400);
      return () => clearTimeout(hide);
    }
  }, [active]);

  if (!visible) return null;

  const hasSlotProgress = active && batchSize > 1 && Number.isInteger(completedCount) && completedCount >= 0;
  const displayedProgress = complete
    ? 100
    : hasSlotProgress
      ? Math.min(99, (completedCount / batchSize) * 100)
      : progress;
  const label = complete
    ? 'Done'
    : hasSlotProgress
      ? `Generating sequence… · ${completedCount} of ${batchSize} slots finished`
    : batchSize > 1
      ? `${currentStage?.label} · ${batchSize} images`
      : currentStage?.label;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 8,
      padding: '14px 16px',
      borderRadius: 'var(--radius-lg)',
      background: 'var(--white)',
      border: '1px solid var(--border)',
      boxShadow: 'var(--shadow-xs)',
      transition: 'opacity 0.4s',
      opacity: 1,
      ...style,
    }} role="status" aria-live="polite" aria-label={complete ? 'Generation complete' : label}>
      {/* Label row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, font: '500 0.8125rem/1 var(--font-ui)', color: complete ? 'var(--status-ready)' : 'var(--text-body)' }}>
          {complete
            ? <Icon name="check-circle" size={14} />
            : <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--accent-deep)', borderTopColor: 'transparent', display: 'inline-block', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
          }
          {label}
        </div>
        <span style={{ font: '500 0.75rem/1 var(--font-mono)', color: 'var(--text-faint)', flexShrink: 0 }}>
          {complete ? '✓' : `${Math.round(displayedProgress)}%`}
        </span>
      </div>

      {/* Bar */}
      <div style={{ height: 5, borderRadius: 999, background: 'var(--cream-deep)', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${Math.round(displayedProgress)}%`,
          borderRadius: 999,
          background: complete ? 'var(--status-ready)' : 'var(--grad-coral)',
          transition: complete ? 'width 0.3s ease-out, background 0.3s' : 'width 0.6s ease-out',
        }} />
      </div>
    </div>
  );
}
