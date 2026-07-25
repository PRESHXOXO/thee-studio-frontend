import React from 'react';
import { Icon } from '../core/Icon.jsx';

export function ReferenceImageCard({ label, url, status, isPrimary, onApprove, onRegenerate, onSetPrimary, regenerating }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{
        aspectRatio: '2/3', borderRadius: 'var(--radius-md)', overflow: 'hidden', position: 'relative',
        background: 'var(--rose-glass)', border: `2px solid ${isPrimary ? 'var(--accent-deep)' : 'var(--border)'}`,
        boxShadow: isPrimary ? 'var(--depth-media-active)' : 'var(--depth-media-rest)',
      }}>
        {regenerating ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)' }}>
            <Icon name="loader" size={20} style={{ animation: 'spin 1s linear infinite', color: '#fff' }} />
          </div>
        ) : url ? (
          <img src={url} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'var(--grad-portrait)', opacity: 0.4 }} />
        )}

        {status === 'approved' && (
          <div style={{ position: 'absolute', top: 6, left: 6, width: 20, height: 20, borderRadius: '50%', background: 'var(--status-ready)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="check" size={11} strokeWidth={3} color="#101014" />
          </div>
        )}
        {isPrimary && (
          <div style={{ position: 'absolute', top: 6, right: 6, background: 'var(--accent-deep)', color: '#fff', font: '700 0.6rem/1 var(--font-ui)', padding: '3px 7px', borderRadius: 'var(--radius-pill)' }}>
            PRIMARY
          </div>
        )}
      </div>

      <div style={{ font: '600 0.7rem/1 var(--font-ui)', color: 'var(--text-strong)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
        {label}
      </div>

      <div style={{ display: 'flex', gap: 4 }}>
        <button
          title="Approve"
          onClick={onApprove}
          disabled={!url || regenerating}
          style={{
            flex: 1, padding: '5px 0', borderRadius: 'var(--radius-sm)', cursor: url ? 'pointer' : 'default',
            background: status === 'approved' ? 'var(--status-ready-bg)' : 'var(--surface-inset)',
            border: `1px solid ${status === 'approved' ? 'var(--status-ready)' : 'var(--border)'}`,
            color: status === 'approved' ? 'var(--status-ready)' : 'var(--text-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: !url ? 0.4 : 1,
          }}
        >
          <Icon name="check" size={12} />
        </button>
        <button
          title="Regenerate"
          onClick={onRegenerate}
          disabled={regenerating}
          style={{
            flex: 1, padding: '5px 0', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
            background: 'var(--surface-inset)', border: '1px solid var(--border)', color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Icon name="refresh-cw" size={12} />
        </button>
        <button
          title="Use as primary face"
          onClick={onSetPrimary}
          disabled={!url || regenerating}
          style={{
            flex: 1, padding: '5px 0', borderRadius: 'var(--radius-sm)', cursor: url ? 'pointer' : 'default',
            background: isPrimary ? 'var(--rose-deep)' : 'var(--surface-inset)',
            border: `1px solid ${isPrimary ? 'var(--accent-deep)' : 'var(--border)'}`,
            color: isPrimary ? 'var(--accent-deep)' : 'var(--text-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: !url ? 0.4 : 1,
          }}
        >
          <Icon name="star" size={12} />
        </button>
      </div>
    </div>
  );
}
