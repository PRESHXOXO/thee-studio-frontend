import React from 'react';
import { Icon } from '../core/Icon.jsx';

export function PromptOutput({ label, value, placeholder, onCopy, style, maxHeight = 180 }) {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = () => {
    if (value) {
      navigator.clipboard.writeText(value).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      onCopy && onCopy(value);
    }
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, ...style }}>
      {label && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{label}</span>
          {value && (
            <button onClick={handleCopy} style={{ border: 'none', background: 'none', cursor: 'pointer', color: copied ? 'var(--status-ready)' : 'var(--text-faint)', display: 'flex', alignItems: 'center', gap: 4, font: '500 0.75rem/1 var(--font-ui)', padding: '3px 8px', borderRadius: 6, transition: 'color var(--t-fast)' }}>
              <Icon name={copied ? 'check' : 'copy'} size={13} />
              {copied ? 'Copied' : 'Copy'}
            </button>
          )}
        </div>
      )}
      <div style={{
        background: 'var(--white)', border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-sm)', padding: '12px 14px',
        font: '0.875rem/1.6 var(--font-ui)', color: value ? 'var(--text-body)' : 'var(--text-faint)',
        minHeight: 80, maxHeight, overflowY: 'auto',
        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      }}>
        {value || placeholder || 'Output will appear here.'}
      </div>
    </div>
  );
}
