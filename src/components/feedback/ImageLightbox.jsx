import React from 'react';
import { Icon } from '../core/Icon.jsx';

export function ImageLightbox({ src, onClose }) {
  React.useEffect(() => {
    const handleKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.88)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
        animation: 'screen-in 0.15s ease-out both',
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 16, right: 16,
          width: 36, height: 36, borderRadius: '50%',
          background: 'rgba(255,255,255,0.12)', border: 'none',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff',
        }}
      >
        <Icon name="x" size={18} />
      </button>

      <img
        src={src}
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '90vw', maxHeight: '90vh',
          borderRadius: 'var(--radius-xl)',
          objectFit: 'contain',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
        }}
        alt="Full size preview"
      />

      <a
        href={src}
        download={`thee-studio-${Date.now()}.jpg`}
        onClick={e => e.stopPropagation()}
        style={{
          position: 'absolute', bottom: 24, right: 24,
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 16px', borderRadius: 'var(--radius-pill)',
          background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
          color: '#fff', font: '500 0.82rem/1 var(--font-ui)',
          textDecoration: 'none', backdropFilter: 'blur(8px)',
        }}
      >
        <Icon name="download" size={14} /> Download
      </a>
    </div>
  );
}
