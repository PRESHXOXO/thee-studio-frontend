import React from 'react';
import { Icon } from '../core/Icon.jsx';

function Badge({ children, tone = 'neutral' }) {
  const tones = {
    locked: { background: 'var(--rose-deep)', color: 'var(--accent-deep)', border: 'var(--border-strong)' },
    ready: { background: 'rgba(52,168,83,0.08)', color: 'var(--status-ready)', border: 'rgba(52,168,83,0.22)' },
    warn: { background: 'var(--status-warn-bg)', color: 'var(--text-body)', border: 'rgba(255,178,56,0.32)' },
    neutral: { background: 'var(--surface-inset)', color: 'var(--text-muted)', border: 'var(--border)' },
  };
  const style = tones[tone] || tones.neutral;
  return <span style={{ padding: '5px 8px', borderRadius: 'var(--radius-pill)', border: `1px solid ${style.border}`, background: style.background, color: style.color, font: '600 0.67rem/1 var(--font-ui)', whiteSpace: 'nowrap' }}>{children}</span>;
}

export function DirectorStatusCard({
  creator = null,
  workflow = 'Director',
  identityLocked = false,
  count = 1,
  format = 'PNG',
  sceneSummary = '',
  referenceRoles = [],
  ready = true,
  warning = '',
  compact = false,
  generationStatus = 'idle',
  statusMessage = '',
}) {
  const subject = creator?.name || (identityLocked ? 'Identity reference' : 'Prompt-defined subject');
  const roleLabels = [...new Set(referenceRoles.filter(Boolean))].map(role => role.charAt(0).toUpperCase() + role.slice(1));
  const states = {
    generating: { label: 'Generating', icon: 'loader-circle' },
    still_processing: { label: 'Still processing', icon: 'clock-3' },
    succeeded: { label: 'Completed', icon: 'circle-check' },
    failed: { label: 'Failed', icon: 'circle-x' },
    cancelled: { label: 'Cancelled', icon: 'circle-x' },
  };
  const currentState = states[generationStatus] || { label: ready ? 'Ready to generate' : 'Generation needs attention', icon: ready ? 'shield-check' : 'triangle-alert' };
  const positiveState = generationStatus === 'succeeded' || (generationStatus === 'idle' && ready);
  return (
    <div aria-label="Director generation preflight" style={{
      display: 'flex', flexDirection: 'column', gap: compact ? 9 : 12,
      padding: compact ? '11px 13px' : '14px 16px', borderRadius: 'var(--radius-lg)',
      background: 'var(--surface-inset)', border: `1px solid ${warning ? 'rgba(255,178,56,0.35)' : 'var(--border)'}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name={currentState.icon} size={15} strokeWidth={1.75} style={{ color: positiveState ? 'var(--accent-deep)' : 'var(--text-muted)' }} />
          <strong style={{ font: '600 0.82rem/1 var(--font-ui)', color: 'var(--text-strong)' }}>{currentState.label}</strong>
        </div>
        <Badge tone={identityLocked ? 'locked' : 'neutral'}>{identityLocked ? 'Identity locked' : 'Open subject'}</Badge>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: compact ? 'repeat(2, minmax(0, 1fr))' : 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
        <div><div style={{ font: '600 0.61rem/1 var(--font-ui)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-faint)', marginBottom: 4 }}>Subject</div><div style={{ font: 'var(--text-sm)', color: 'var(--text-body)', fontWeight: 600 }}>{subject}</div></div>
        <div><div style={{ font: '600 0.61rem/1 var(--font-ui)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-faint)', marginBottom: 4 }}>Workflow</div><div style={{ font: 'var(--text-sm)', color: 'var(--text-body)' }}>{workflow}</div></div>
        <div><div style={{ font: '600 0.61rem/1 var(--font-ui)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-faint)', marginBottom: 4 }}>Output</div><div style={{ font: 'var(--text-sm)', color: 'var(--text-body)' }}>{count} {count === 1 ? 'photo' : 'photos'} · {format}</div></div>
        <div><div style={{ font: '600 0.61rem/1 var(--font-ui)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-faint)', marginBottom: 4 }}>References</div><div style={{ font: 'var(--text-sm)', color: 'var(--text-body)' }}>{roleLabels.length ? roleLabels.join(' · ') : identityLocked ? 'Cast identity' : 'None'}</div></div>
      </div>

      {sceneSummary && <div style={{ font: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.45, overflow: 'hidden', textOverflow: 'ellipsis' }}><strong style={{ color: 'var(--text-body)' }}>Direction:</strong> {sceneSummary}</div>}
      {warning && <div role="alert" style={{ display: 'flex', gap: 7, alignItems: 'flex-start', font: 'var(--text-xs)', color: 'var(--text-body)', lineHeight: 1.45 }}><Icon name="triangle-alert" size={13} style={{ marginTop: 1, flexShrink: 0 }} />{warning}</div>}
      {statusMessage && <div role="status" style={{ display: 'flex', gap: 7, alignItems: 'flex-start', font: 'var(--text-xs)', color: 'var(--text-body)', lineHeight: 1.45 }}><Icon name={currentState.icon} size={13} style={{ marginTop: 1, flexShrink: 0 }} />{statusMessage}</div>}
    </div>
  );
}
