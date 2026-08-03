import React from 'react';
import { Icon } from '../core/Icon.jsx';

const STEPS = [
  { id: 'base',   label: 'Base' },
  { id: 'look',   label: 'First Look' },
  { id: 'lock',   label: 'Identity Lock' },
  { id: 'body',   label: 'Body' },
  { id: 'brand',  label: 'Brand' },
];

// Clean 5-stage indicator — deliberately not a "step 3 of 12" intake-form
// counter. Completed steps are tappable so the user can go back without
// losing anything (state lives one level up in the wizard, never here).
export function CreatorBuilderProgress({ currentStep, furthestStep, onJump }) {
  const currentIdx = STEPS.findIndex(s => s.id === currentStep);
  const furthestIdx = STEPS.findIndex(s => s.id === furthestStep);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
      {STEPS.map((step, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        const reachable = i <= furthestIdx;
        return (
          <React.Fragment key={step.id}>
            <button
              onClick={() => reachable && onJump?.(step.id)}
              disabled={!reachable}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 'var(--radius-pill)',
                background: active ? 'var(--rose-deep)' : 'transparent',
                border: `1.5px solid ${active ? 'var(--accent-deep)' : done ? 'var(--border-strong)' : 'var(--border)'}`,
                cursor: reachable ? 'pointer' : 'default',
                font: `${active ? 600 : 500} 0.75rem/1 var(--font-ui)`,
                color: active ? 'var(--accent-deep)' : done ? 'var(--text-body)' : 'var(--text-faint)',
                transition: 'all var(--t-fast)',
              }}
            >
              {done
                ? <Icon name="check" size={11} strokeWidth={2.5} />
                : <span style={{ width: 14, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
              }
              {step.label}
            </button>
            {i < STEPS.length - 1 && (
              <div style={{ width: 14, height: 1, background: i < currentIdx ? 'var(--border-strong)' : 'var(--border)', flexShrink: 0 }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export const CREATOR_BUILDER_STEPS = STEPS;
