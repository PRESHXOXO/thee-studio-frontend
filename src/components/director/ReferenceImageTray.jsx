import React from 'react';
import { Icon } from '../core/Icon.jsx';
import { normalizeImageForVision } from '../../lib/imageUtils.js';
import {
  DIRECTOR_REFERENCE_ROLES,
  MAX_DIRECTOR_REFERENCES,
  referenceRoleLabel,
} from '../../lib/directorReferences.js';

const ROLE_SEQUENCE = ['identity', 'outfit', 'background', 'pose', 'makeup', 'hair'];

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

function nextSuggestedRole(currentRole, references) {
  const used = new Set(references.map(reference => reference.role));
  const start = Math.max(0, ROLE_SEQUENCE.indexOf(currentRole) + 1);
  return ROLE_SEQUENCE.slice(start).find(role => !used.has(role))
    || ROLE_SEQUENCE.find(role => !used.has(role))
    || currentRole;
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

  React.useEffect(() => {
    if (!references.length) setNextRole(defaultRole);
  }, [defaultRole, references.length]);

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
      // One file per add keeps the role contract explicit. Previously a batch
      // silently inherited one role for every image, which could turn a
      // background board into a second outfit authority.
      const file = files[0];
      const raw = await readFileAsDataURL(file);
      const dataUrl = await normalizeImageForVision(raw);
      const added = {
        id: makeReferenceId(),
        dataUrl,
        name: file.name,
        role: nextRole,
        pending: true,
        source: 'upload',
      };
      const nextReferences = [...references, added];
      onChange(nextReferences);
      setNextRole(nextSuggestedRole(nextRole, nextReferences));
      if (files.length > 1) {
        setError('Add one image at a time so each reference keeps a clear role.');
      }
    } catch (uploadError) {
      setError(uploadError.message || 'Could not read that image.');
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
      display: 'flex', alignItems: compact ? 'stretch' : 'center', gap: compact ? 6 : 10,
      flexDirection: compact ? 'column' : 'row', flexWrap: compact ? 'nowrap' : 'wrap',
      flex: compact ? '0 0 156px' : 'initial',
      padding: compact ? 0 : '12px 14px',
      border: compact ? 'none' : '1px dashed var(--border-strong)',
      borderRadius: compact ? 0 : 'var(--radius-lg)',
      background: compact ? 'transparent' : 'rgba(255,254,252,0.34)',
    }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={handleFiles}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || reading || !available}
        style={{
          minHeight: compact ? 32 : 40, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: compact ? '0 10px' : '0 14px', borderRadius: 9,
          border: '1px solid var(--plum)', background: 'var(--plum)',
          color: 'var(--text-on-dark)', cursor: disabled || reading || !available ? 'not-allowed' : 'pointer',
          opacity: disabled || reading || !available ? 0.48 : 1,
          font: `600 ${compact ? 11 : 12}px/1 var(--font-ui)`, fontFamily: 'inherit',
          boxShadow: '0 8px 18px rgba(23,20,27,0.10)',
        }}
      >
        <Icon name="plus" size={compact ? 12 : 14} />
        {reading ? 'Reading…' : available ? 'Add image' : 'Reference limit reached'}
      </button>
      <select
        aria-label="Role for new references"
        value={nextRole}
        onChange={event => setNextRole(event.target.value)}
        disabled={disabled || !available}
        style={{
          minHeight: compact ? 32 : 40, padding: compact ? '0 8px' : '0 11px',
          border: '1px solid var(--border)', borderRadius: 9,
          background: 'rgba(255,254,252,0.72)', color: 'var(--text-body)',
          font: `600 ${compact ? 11 : 12}px/1 var(--font-ui)`, fontFamily: 'inherit',
        }}
      >
        {DIRECTOR_REFERENCE_ROLES.map(role => (
          <option key={role.id} value={role.id}>{role.label}</option>
        ))}
      </select>
      {!compact && available > 0 && (
        <span style={{ font: '500 0.72rem/1.35 var(--font-ui)', color: 'var(--text-faint)', marginLeft: 2 }}>
          Choose the job, then add one image · {available} slot{available === 1 ? '' : 's'} open
        </span>
      )}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 8 : 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18 }}>
        <div>
          <div style={{ font: '600 0.86rem/1.15 var(--font-ui)', letterSpacing: '-0.01em', color: 'var(--text-strong)' }}>
            {title}
          </div>
          {!compact && description && (
            <div style={{ font: 'var(--text-xs)', color: 'var(--text-faint)', lineHeight: 1.5, marginTop: 5, maxWidth: 640 }}>
              {description}
            </div>
          )}
        </div>
        <span style={{
          flexShrink: 0, font: '700 0.62rem/1 var(--font-mono)', letterSpacing: '0.08em',
          color: 'var(--text-faint)', paddingTop: 2,
        }}>
          {references.length}/{maxReferences}
        </span>
      </div>

      {references.length > 0 && (
        <div style={{ display: 'flex', gap: compact ? 8 : 12, overflowX: 'auto', padding: '2px 2px 6px', alignItems: 'stretch' }}>
          {references.map((reference, index) => (
            <div
              key={reference.id}
              style={{
                width: compact ? 90 : 118, flex: `0 0 ${compact ? 90 : 118}px`,
                padding: 0, overflow: 'hidden',
                border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
                background: 'rgba(255,254,252,0.74)', boxShadow: 'var(--shadow-xs)',
              }}
            >
              <div style={{ position: 'relative' }}>
                <img
                  src={reference.dataUrl}
                  alt={`${referenceRoleLabel(reference.role)} reference ${index + 1}`}
                  style={{
                    width: '100%', height: compact ? 68 : 96, objectFit: 'cover', display: 'block',
                    border: 'none', borderBottom: '1px solid var(--border)',
                  }}
                />
                <span style={{
                  position: 'absolute', left: 7, bottom: 7, padding: '4px 6px', borderRadius: 6,
                  background: 'rgba(19,16,21,0.72)', backdropFilter: 'blur(6px)', color: '#fff',
                  font: '700 0.56rem/1 var(--font-ui)', letterSpacing: '0.08em', textTransform: 'uppercase',
                }}>
                  {referenceRoleLabel(reference.role)}
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${reference.name}`}
                  onClick={() => removeReference(reference.id)}
                  disabled={disabled}
                  style={{
                    position: 'absolute', top: 6, right: 6, width: compact ? 20 : 24, height: compact ? 20 : 24,
                    display: 'grid', placeItems: 'center', padding: 0, cursor: 'pointer',
                    border: '1px solid rgba(255,255,255,0.16)', borderRadius: '50%', color: '#fff',
                    background: 'rgba(19,16,21,0.68)', backdropFilter: 'blur(6px)',
                  }}
                >
                  <Icon name="x" size={12} />
                </button>
              </div>
              <div style={{ padding: compact ? 6 : 8 }}>
                <select
                  aria-label={`Role for ${reference.name}`}
                  value={reference.role}
                  onChange={event => changeRole(reference.id, event.target.value)}
                  disabled={disabled}
                  style={{
                    width: '100%', padding: compact ? '5px 4px' : '6px 6px',
                    border: '1px solid var(--border)', borderRadius: 8,
                    background: 'var(--surface-inset)', color: 'var(--text-body)',
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
                      marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap', font: '500 0.66rem/1 var(--font-ui)', color: 'var(--text-faint)',
                    }}
                  >
                    {reference.name}
                  </div>
                )}
              </div>
            </div>
          ))}
          {compact && addControls}
        </div>
      )}

      {!compact && addControls}
      {compact && references.length === 0 && addControls}
      {error && (
        <div role="alert" style={{ font: 'var(--text-xs)', color: 'var(--cherry)' }}>{error}</div>
      )}
    </div>
  );
}
