import React from 'react';
import { Icon } from '../core/Icon.jsx';
import { normalizeImageForVision } from '../../lib/imageUtils.js';
import {
  DIRECTOR_REFERENCE_ROLES,
  MAX_DIRECTOR_REFERENCES,
  referenceRoleLabel,
} from '../../lib/directorReferences.js';

function makeReferenceId() {
  return globalThis.crypto?.randomUUID?.()
    || `ref-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = event => resolve(event.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ReferenceImageTray({
  references,
  onChange,
  maxReferences = MAX_DIRECTOR_REFERENCES,
  defaultRole = 'outfit',
  disabled = false,
  compact = false,
  title = 'Visual references',
  description = 'Add separate images for the outfit, background, makeup, hair, pose, or identity.',
}) {
  const inputRef = React.useRef(null);
  const [nextRole, setNextRole] = React.useState(defaultRole);
  const [reading, setReading] = React.useState(false);
  const [error, setError] = React.useState('');
  const available = Math.max(0, maxReferences - references.length);

  async function handleFiles(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length || disabled) return;
    if (!available) {
      setError(`This shot supports up to ${maxReferences} reference images.`);
      return;
    }

    setReading(true);
    setError('');
    try {
      const accepted = files.slice(0, available);
      const added = [];
      for (const file of accepted) {
        const raw = await readFileAsDataURL(file);
        const dataUrl = await normalizeImageForVision(raw);
        added.push({
          id: makeReferenceId(),
          dataUrl,
          name: file.name,
          role: nextRole,
          pending: true,
          source: 'upload',
        });
      }
      onChange([...references, ...added]);
      if (files.length > accepted.length) {
        setError(`Added ${accepted.length}. This shot supports up to ${maxReferences} reference images.`);
      }
    } catch (uploadError) {
      setError(uploadError.message || 'Could not read one of those images.');
    } finally {
      setReading(false);
    }
  }

  function changeRole(id, role) {
    onChange(references.map(reference =>
      reference.id === id ? { ...reference, role, pending: true } : reference
    ));
  }

  function removeReference(id) {
    onChange(references.filter(reference => reference.id !== id));
  }

  const addControls = (
    <div style={{
      display: 'flex', alignItems: compact ? 'stretch' : 'center', gap: compact ? 5 : 8,
      flexDirection: compact ? 'column' : 'row', flexWrap: compact ? 'nowrap' : 'wrap',
      flex: compact ? '0 0 150px' : 'initial', justifyContent: 'center',
    }}>
      <select
        aria-label="Role for new references"
        value={nextRole}
        onChange={event => setNextRole(event.target.value)}
        disabled={disabled || !available}
        style={{
          minHeight: compact ? 30 : 36, padding: compact ? '0 7px' : '0 10px',
          border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
          background: 'var(--surface-card)', color: 'var(--text-body)',
          font: `500 ${compact ? 11 : 12}px/1 var(--font-ui)`, fontFamily: 'inherit',
        }}
      >
        {DIRECTOR_REFERENCE_ROLES.map(role => (
          <option key={role.id} value={role.id}>{role.label}</option>
        ))}
      </select>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        style={{ display: 'none' }}
        onChange={handleFiles}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || reading || !available}
        style={{
          minHeight: compact ? 30 : 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          padding: compact ? '0 8px' : '0 12px', borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)', background: 'var(--surface-card)',
          color: 'var(--accent-deep)', cursor: disabled || reading || !available ? 'not-allowed' : 'pointer',
          opacity: disabled || reading || !available ? 0.55 : 1,
          font: `600 ${compact ? 11 : 12}px/1 var(--font-ui)`, fontFamily: 'inherit',
        }}
      >
        <Icon name="images" size={compact ? 12 : 14} />
        {reading ? 'Reading…' : available ? `Add image${available > 1 ? 's' : ''}` : 'Reference limit reached'}
      </button>
      {!compact && available > 0 && (
        <span style={{ font: 'var(--text-xs)', color: 'var(--text-faint)' }}>
          Select up to {available} at once
        </span>
      )}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 6 : 10 }}>
      <div>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          font: 'var(--label)', letterSpacing: 'var(--label-spacing)',
          textTransform: 'uppercase', color: 'var(--text-muted)',
        }}>
          <span>{title}</span>
          <span style={{ color: 'var(--text-faint)' }}>{references.length}/{maxReferences}</span>
        </div>
        {!compact && description && (
          <div style={{ font: 'var(--text-xs)', color: 'var(--text-faint)', lineHeight: 1.45, marginTop: 4 }}>
            {description}
          </div>
        )}
      </div>

      {(references.length > 0 || compact) && (
        <div style={{ display: 'flex', gap: compact ? 7 : 10, overflowX: 'auto', padding: '2px 2px 5px', alignItems: 'stretch' }}>
          {references.map((reference, index) => (
            <div
              key={reference.id}
              style={{
                width: compact ? 84 : 104, flex: `0 0 ${compact ? 84 : 104}px`, padding: compact ? 5 : 7,
                border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
                background: 'var(--surface-inset)',
              }}
            >
              <div style={{ position: 'relative' }}>
                <img
                  src={reference.dataUrl}
                  alt={`${referenceRoleLabel(reference.role)} reference ${index + 1}`}
                  style={{
                    width: '100%', height: compact ? 56 : 78, objectFit: 'cover', display: 'block',
                    borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
                  }}
                />
                <button
                  type="button"
                  aria-label={`Remove ${reference.name}`}
                  onClick={() => removeReference(reference.id)}
                  disabled={disabled}
                  style={{
                    position: 'absolute', top: 4, right: 4, width: compact ? 18 : 22, height: compact ? 18 : 22,
                    display: 'grid', placeItems: 'center', padding: 0, cursor: 'pointer',
                    border: 'none', borderRadius: '50%', color: '#fff',
                    background: 'rgba(24, 18, 23, 0.72)',
                  }}
                >
                  <Icon name="x" size={12} />
                </button>
              </div>
              <select
                aria-label={`Role for ${reference.name}`}
                value={reference.role}
                onChange={event => changeRole(reference.id, event.target.value)}
                disabled={disabled}
                style={{
                  width: '100%', marginTop: compact ? 4 : 7, padding: compact ? '4px 3px' : '6px 5px',
                  border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                  background: 'var(--surface-card)', color: 'var(--text-body)',
                  font: `600 ${compact ? 10 : 11}px/1 var(--font-ui)`, fontFamily: 'inherit',
                }}
              >
                {DIRECTOR_REFERENCE_ROLES.map(role => (
                  <option key={role.id} value={role.id}>{role.label}</option>
                ))}
              </select>
              {!compact && (
                <div
                  title={reference.name}
                  style={{
                    marginTop: 5, overflow: 'hidden', textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap', font: 'var(--text-xs)', color: 'var(--text-faint)',
                  }}
                >
                  {reference.name}
                </div>
              )}
            </div>
          ))}
          {compact && addControls}
        </div>
      )}

      {!compact && addControls}

      {error && (
        <div role="alert" style={{ font: 'var(--text-xs)', color: 'var(--cherry)' }}>{error}</div>
      )}
    </div>
  );
}
