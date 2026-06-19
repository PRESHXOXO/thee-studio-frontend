import React from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';

export function PaywallModal({ open, featureName, featureDesc, onClose }) {
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return ReactDOM.createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(30, 12, 8, 0.55)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--plum)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-lg)',
          padding: '48px 40px',
          maxWidth: 420, width: '100%',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          animation: 'dialog-in 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {/* Background glow */}
        <div style={{
          position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)',
          width: 240, height: 240, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,107,74,0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Lock icon */}
        <div style={{
          width: 64, height: 64, borderRadius: 18,
          background: 'rgba(255,107,74,0.15)',
          border: '1px solid rgba(255,107,74,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--coral)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>

        {featureName && (
          <div style={{ font: '600 0.6875rem/1 var(--font-ui)', letterSpacing: '0.14em', color: 'var(--champagne)', textTransform: 'uppercase', marginBottom: 12 }}>
            {featureName}
          </div>
        )}

        <h2 style={{ font: '600 1.75rem/1.15 var(--font-display)', color: '#fff', marginBottom: 12 }}>
          A Pro feature
        </h2>

        <p style={{ font: 'var(--text-base)', color: 'rgba(255,255,255,0.6)', marginBottom: 32, lineHeight: 1.6 }}>
          {featureDesc || 'Upgrade to Pro to unlock this feature and everything else in Thee Studio.'}
        </p>

        <button
          onClick={() => { onClose(); navigate('/auth'); }}
          style={{
            width: '100%', padding: '13px',
            background: 'var(--grad-coral)', color: '#fff',
            border: 'none', borderRadius: 'var(--radius-md)',
            font: '600 0.9375rem/1 var(--font-ui)', cursor: 'pointer',
            boxShadow: 'var(--shadow-coral)',
            marginBottom: 14,
            transition: 'var(--t-base)',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          ✦ Upgrade to Pro
        </button>

        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none',
            font: 'var(--text-sm)', color: 'rgba(255,255,255,0.4)',
            cursor: 'pointer',
          }}
        >
          Maybe later
        </button>
      </div>
    </div>,
    document.body
  );
}
