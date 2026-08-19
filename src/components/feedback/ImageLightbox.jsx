import React from 'react';
import { Icon } from '../core/Icon.jsx';
import { downloadImageAsPng } from '../../lib/libraryAssets.js';

export function ImageLightbox({ src, onClose }) {
  const [downloadError, setDownloadError] = React.useState('');

  React.useEffect(() => {
    const handleKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleDownload = async event => {
    event.stopPropagation();
    setDownloadError('');
    try {
      await downloadImageAsPng(src, `thee-studio-${Date.now()}.png`);
    } catch (error) {
      setDownloadError(error.message || 'The image could not be downloaded.');
    }
  };

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

      {downloadError && (
        <div
          role="alert"
          onClick={event => event.stopPropagation()}
          style={{
            position: 'absolute', bottom: 76, right: 24, maxWidth: 360,
            padding: '9px 12px', borderRadius: 'var(--radius-md)',
            background: 'rgba(120,20,20,0.88)', color: '#fff',
            font: 'var(--text-xs)', backdropFilter: 'blur(8px)',
          }}
        >
          {downloadError}
        </div>
      )}

      <button
        type="button"
        onClick={handleDownload}
        style={{
          position: 'absolute', bottom: 24, right: 24,
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 16px', borderRadius: 'var(--radius-pill)',
          background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
          color: '#fff', font: '500 0.82rem/1 var(--font-ui)',
          cursor: 'pointer', backdropFilter: 'blur(8px)',
        }}
      >
        <Icon name="download" size={14} /> Download PNG
      </button>
    </div>
  );
}
