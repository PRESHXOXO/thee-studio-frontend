import React from 'react';
import { Card } from '../surfaces/Card.jsx';
import { Button } from '../core/Button.jsx';
import { Icon } from '../core/Icon.jsx';

export function CreatorFirstLook({
  name, imageUrl, loading, error, onUpload, onRemove, onContinue,
}) {
  const inputRef = React.useRef(null);
  const handleFile = event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) onUpload?.(file);
  };

  return (
    <Card style={{ padding: '24px 24px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h2 style={{ font: 'var(--display-md, 1.5rem)/1.2 var(--font-display)', color: 'var(--text-strong)', margin: '0 0 6px' }}>
          Add {name || 'your creator'}'s headshot
        </h2>
        <p style={{ font: 'var(--text-sm)', color: 'var(--text-muted)', margin: 0 }}>
          Upload one clear, front-facing image. It stays private and becomes this profile's canonical headshot.
        </p>
      </div>

      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} hidden />

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button
          type="button"
          aria-label={imageUrl ? 'Replace headshot' : 'Upload headshot'}
          onClick={() => !loading && inputRef.current?.click()}
          disabled={loading}
          style={{
            width: '100%', maxWidth: 340, aspectRatio: '2/3', borderRadius: 'var(--radius-lg)',
            overflow: 'hidden', border: '2px solid var(--accent-deep)', background: 'var(--grad-portrait)',
            position: 'relative', boxShadow: 'var(--depth-media-hover)', padding: 0, cursor: loading ? 'wait' : 'pointer',
          }}
        >
          {loading ? (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--accent-deep)' }}>
              <Icon name="loader" size={28} strokeWidth={1.5} style={{ animation: 'spin 1.2s linear infinite' }} />
              <span style={{ font: '500 0.85rem/1 var(--font-ui)' }}>Uploading headshot…</span>
            </div>
          ) : imageUrl ? (
            <img src={imageUrl} alt={name || 'Creator headshot'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)' }}>
              <Icon name="upload" size={36} strokeWidth={1.25} />
              <span style={{ font: '600 0.82rem/1 var(--font-ui)' }}>Upload headshot</span>
              <span style={{ font: 'var(--text-xs)', color: 'var(--text-faint)' }}>JPG, PNG, or WebP · 15 MB max</span>
            </div>
          )}
        </button>
      </div>

      {error && <p role="alert" style={{ font: 'var(--text-sm)', color: 'var(--cherry)', margin: 0, textAlign: 'center' }}>{error}</p>}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: 16 }}>
        <Button variant="secondary" onClick={() => inputRef.current?.click()} disabled={loading}>
          <Icon name={imageUrl ? 'refresh-cw' : 'upload'} size={14} /> {imageUrl ? 'Replace Headshot' : 'Upload Headshot'}
        </Button>
        {imageUrl && (
          <Button variant="secondary" onClick={onRemove} disabled={loading}>
            <Icon name="trash-2" size={14} /> Remove
          </Button>
        )}
        <Button variant="primary" onClick={onContinue} disabled={!imageUrl || loading}>
          Continue <Icon name="arrow-right" size={14} />
        </Button>
      </div>
    </Card>
  );
}
