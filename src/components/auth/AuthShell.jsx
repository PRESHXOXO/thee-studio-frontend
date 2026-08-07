import React from 'react';
import { useNavigate } from 'react-router-dom';

export function AuthShell({ title, subtitle, children, wide = false }) {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <button type="button" onClick={() => navigate('/')} style={{ position: 'fixed', top: 24, left: 24, background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '8px 16px', font: 'var(--text-sm)', color: 'var(--text-muted)', cursor: 'pointer' }}>
        ← Home
      </button>
      <div style={{ width: '100%', maxWidth: wide ? 920 : 420, background: 'var(--white)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)', padding: wide ? '48px' : '48px 40px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--grad-plum)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <span style={{ font: '700 1.375rem/1 var(--font-display)', color: 'var(--champagne)' }}>T</span>
          </div>
          <h1 style={{ font: '600 1.75rem/1.2 var(--font-display)', color: 'var(--text-strong)', marginBottom: 6 }}>{title}</h1>
          {subtitle && <p style={{ font: 'var(--text-sm)', color: 'var(--text-muted)' }}>{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}

export const authInputStyle = {
  width: '100%', padding: '10px 14px', boxSizing: 'border-box', background: 'var(--white)',
  border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', font: 'var(--text-base)',
  color: 'var(--text-body)', outline: 'none', transition: 'var(--t-fast)',
};

export const authPrimaryButtonStyle = {
  width: '100%', padding: '12px', background: 'var(--grad-coral)', color: '#fff', border: 'none',
  borderRadius: 'var(--radius-md)', font: '600 0.9375rem/1 var(--font-ui)', cursor: 'pointer',
  boxShadow: 'var(--shadow-coral)', transition: 'var(--t-base)',
};

export function AuthNotice({ children, error = false }) {
  return <div role={error ? 'alert' : 'status'} style={{ margin: '0 0 16px', padding: '10px 12px', borderRadius: 'var(--radius-md)', background: error ? 'var(--status-locked-bg)' : 'var(--status-ready-bg)', color: error ? 'var(--cherry)' : 'var(--status-ready)', font: 'var(--text-sm)', lineHeight: 1.4 }}>{children}</div>;
}
