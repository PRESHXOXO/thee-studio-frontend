import React from 'react';
import { Card } from '../surfaces/Card.jsx';
import { Button } from '../core/Button.jsx';
import { Icon } from '../core/Icon.jsx';

export function IdentityReferencePack({
  name, images, uploading, error, onUploadAdditional, onRemove, onContinue,
}) {
  const inputRef = React.useRef(null);
  const handleFiles = event => {
    const files = Array.from(event.target.files || []).slice(0, Math.max(0, 5 - images.length));
    event.target.value = '';
    if (files.length) onUploadAdditional?.(files);
  };

  return (
    <Card style={{ padding: '24px 24px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h2 style={{ font: 'var(--display-md, 1.5rem)/1.2 var(--font-display)', color: 'var(--text-strong)', margin: '0 0 6px' }}>
          Preserve {name || 'their'} references.
        </h2>
        <p style={{ font: 'var(--text-sm)', color: 'var(--text-muted)', margin: 0 }}>
          Headshot saved. Add up to four optional angles for profile management and future reference-conditioned workflows.
        </p>
      </div>

      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleFiles} hidden />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12 }}>
        {images.map((image, index) => (
          <div key={image.id || image.storagePath || index} style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <div style={{
              aspectRatio: '2/3', borderRadius: 'var(--radius-md)', overflow: 'hidden', position: 'relative',
              background: 'var(--rose-glass)', border: `2px solid ${index === 0 ? 'var(--accent-deep)' : 'var(--border)'}`,
              boxShadow: index === 0 ? 'var(--depth-media-active)' : 'var(--depth-media-rest)',
            }}>
              <img src={image.url} alt={image.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              {index === 0 && (
                <div style={{ position: 'absolute', top: 6, right: 6, background: 'var(--accent-deep)', color: '#fff', font: '700 0.6rem/1 var(--font-ui)', padding: '3px 7px', borderRadius: 'var(--radius-pill)' }}>
                  HEADSHOT
                </div>
              )}
            </div>
            <div style={{ font: '600 0.7rem/1 var(--font-ui)', color: 'var(--text-strong)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              {image.label}
            </div>
            {index > 0 && (
              <button
                type="button"
                aria-label={`Remove ${image.label}`}
                onClick={() => onRemove?.(image)}
                disabled={uploading}
                style={{ padding: '6px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', background: 'var(--surface-inset)', border: '1px solid var(--border)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Icon name="trash-2" size={12} />
              </button>
            )}
          </div>
        ))}
        {images.length < 5 && (
          <button
            type="button"
            aria-label="Upload additional creator references"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            style={{ aspectRatio: '2/3', borderRadius: 'var(--radius-md)', border: '1.5px dashed var(--border-strong)', background: 'var(--surface-inset)', color: 'var(--text-faint)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: uploading ? 'wait' : 'pointer' }}
          >
            <Icon name={uploading ? 'loader' : 'plus'} size={22} style={uploading ? { animation: 'spin 1s linear infinite' } : undefined} />
            <span style={{ font: '600 0.72rem/1.3 var(--font-ui)' }}>{uploading ? 'Uploading…' : 'Add reference'}</span>
          </button>
        )}
      </div>

      {error && <p role="alert" style={{ font: 'var(--text-sm)', color: 'var(--cherry)', margin: 0 }}>{error}</p>}

      <p style={{ font: 'var(--text-xs)', color: 'var(--text-faint)', margin: 0 }}>
        Current Campaign generation uses text identity details. These images are preserved privately but are not sent to FLUX Schnell for identity locking.
      </p>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: 16 }}>
        <Button variant="secondary" onClick={() => inputRef.current?.click()} disabled={uploading || images.length >= 5}>
          <Icon name="upload" size={14} /> Add References
        </Button>
        <Button variant="primary" onClick={onContinue} disabled={!images[0]?.url || uploading}>
          Continue <Icon name="arrow-right" size={14} />
        </Button>
      </div>
    </Card>
  );
}
