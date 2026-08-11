import React from 'react';
import { Button } from '../components/core/Button.jsx';
import { Icon } from '../components/core/Icon.jsx';
import {
  downloadCloudAsset,
  persistCloudAsset,
  persistCloudDocument,
} from '../lib/cloudStore.js';

const REF_KEY = 'ts_references';
const ALLOWED_REFERENCE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function loadRefs() {
  try { return JSON.parse(localStorage.getItem(REF_KEY) || '[]'); } catch { return []; }
}

function serializableRefs(refs) {
  return refs.map(item => {
    // Cloud-backed references keep only lightweight metadata in the synced
    // document. blob: URLs are session-local previews and must never be stored.
    if (item.storagePath) {
      const { src, ...rest } = item;
      return rest;
    }
    return item;
  });
}

function saveRefs(refs) {
  const clean = serializableRefs(refs);
  const value = JSON.stringify(clean);
  localStorage.setItem(REF_KEY, value);
  return persistCloudDocument(REF_KEY, value);
}

async function dataUrlToBlob(dataUrl) {
  const response = await fetch(dataUrl);
  if (!response.ok) throw new Error('Could not read the saved reference image.');
  return response.blob();
}

function RefCard({ item, selected, onSelect }) {
  return (
    <div onClick={() => onSelect(item.id)} style={{ display: 'flex', flexDirection: 'column', gap: 8, cursor: 'pointer' }}>
      <div style={{
        position: 'relative', borderRadius: 'var(--radius-lg)', overflow: 'hidden',
        border: `2px solid ${selected ? 'var(--accent-deep)' : 'transparent'}`,
        transition: 'border-color var(--t-fast)', aspectRatio: '3/4',
      }}>
        {item.src
          ? <img src={item.src} alt={item.caption} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : <div style={{ width: '100%', height: '100%', background: 'var(--grad-portrait)', display: 'grid', placeItems: 'center', color: 'var(--text-faint)' }}><Icon name="image" size={22} /></div>
        }
        {selected && (
          <div style={{ position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: '50%', background: 'var(--accent-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="check" size={12} strokeWidth={2.5} color="#fff" />
          </div>
        )}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '24px 10px 10px', background: 'linear-gradient(transparent, rgba(33,24,33,0.7))' }}>
          <span style={{ font: '500 0.625rem/1 var(--font-ui)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)', background: 'rgba(255,255,255,0.15)', padding: '3px 8px', borderRadius: 999 }}>
            {item.tag}
          </span>
        </div>
      </div>
      <div>
        <div style={{ font: '600 0.8125rem/1 var(--font-ui)', color: 'var(--text-strong)' }}>{item.creator}</div>
        <div style={{ font: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 2 }}>{item.caption}</div>
      </div>
    </div>
  );
}

function UploadCard({ onUpload, disabled }) {
  const inputRef = React.useRef(null);
  return (
    <div
      onClick={() => !disabled && inputRef.current?.click()}
      style={{
        aspectRatio: '3/4', borderRadius: 'var(--radius-lg)', border: '2px dashed var(--border-strong)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 8, cursor: disabled ? 'wait' : 'pointer', background: 'var(--cream)', transition: 'background var(--t-fast)',
        color: 'var(--text-faint)', opacity: disabled ? 0.65 : 1,
      }}
    >
      <Icon name={disabled ? 'loader' : 'plus'} size={24} strokeWidth={1.5} />
      <span style={{ font: 'var(--text-sm)' }}>{disabled ? 'Saving…' : 'Add reference'}</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        disabled={disabled}
        style={{ display: 'none' }}
        onChange={e => onUpload(Array.from(e.target.files))}
      />
    </div>
  );
}

const REFERENCE_TEMPLATES = [
  { id: 'editorial', tag: 'Editorial Beauty', icon: 'sparkles', desc: 'Close-up beauty, clean studio light, high detail' },
  { id: 'street',    tag: 'Street Style',     icon: 'footprints', desc: 'Candid, on-location, editorial streetwear' },
  { id: 'golden',    tag: 'Golden Hour',      icon: 'sun',       desc: 'Warm outdoor lifestyle, low sun, soft glow' },
  { id: 'studio',    tag: 'Studio Portrait',  icon: 'aperture',  desc: 'Seamless backdrop, controlled lighting, posed' },
];

export function References({ onNav }) {
  const [refs, setRefs] = React.useState(loadRefs);
  const [selected, setSelected] = React.useState(new Set());
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState('');
  const pendingTagRef = React.useRef('Uploaded');

  // Hydrate private cloud assets into short-lived browser object URLs. This
  // also self-heals the legacy format that stored entire base64 images inside
  // ts_references: once cloud runtime is available, those bytes are moved to
  // private object storage and removed from the synced JSON document.
  React.useEffect(() => {
    let cancelled = false;
    const objectUrls = [];

    const hydrate = async () => {
      const stored = loadRefs();
      let migrated = false;
      const next = await Promise.all(stored.map(async item => {
        try {
          if (item.storagePath) {
            const blob = await downloadCloudAsset(item.storagePath);
            if (!blob) return item;
            const src = URL.createObjectURL(blob);
            objectUrls.push(src);
            return { ...item, src };
          }
          if (typeof item.src === 'string' && item.src.startsWith('data:image/')) {
            const blob = await dataUrlToBlob(item.src);
            if (!ALLOWED_REFERENCE_TYPES.has(blob.type)) return item;
            const storagePath = await persistCloudAsset(item.id, blob);
            if (!storagePath) return item; // local-dev mode keeps the data URL
            const src = URL.createObjectURL(blob);
            objectUrls.push(src);
            migrated = true;
            return { ...item, storagePath, mimeType: blob.type, bytes: blob.size, src };
          }
          return item;
        } catch {
          return item;
        }
      }));

      if (cancelled) return;
      setRefs(next);
      if (migrated) await saveRefs(next).catch(() => undefined);
    };

    void hydrate();
    return () => {
      cancelled = true;
      objectUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleUpload = async (files) => {
    if (!files.length || uploading) return;
    const invalid = files.find(file => !ALLOWED_REFERENCE_TYPES.has(file.type));
    if (invalid) {
      setError('References must be JPG, PNG, or WebP images.');
      return;
    }

    const tag = pendingTagRef.current;
    pendingTagRef.current = 'Uploaded';
    setUploading(true);
    setError('');
    const createdObjectUrls = [];

    try {
      const stamp = Date.now();
      const newRefs = await Promise.all(files.map(async (file, index) => {
        const id = `ref_${stamp}_${index}_${Math.random().toString(36).slice(2, 6)}`;
        const storagePath = await persistCloudAsset(id, file);
        if (storagePath) {
          const src = URL.createObjectURL(file);
          createdObjectUrls.push(src);
          return {
            id,
            storagePath,
            mimeType: file.type,
            bytes: file.size,
            src,
            creator: 'My Reference',
            caption: file.name.replace(/\.[^.]+$/, ''),
            tag,
          };
        }

        // Local development has no cloud runtime, so retain the historical
        // data-URL behavior only there.
        const src = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = event => resolve(event.target.result);
          reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
          reader.readAsDataURL(file);
        });
        return { id, src, creator: 'My Reference', caption: file.name.replace(/\.[^.]+$/, ''), tag };
      }));

      const updated = [...refs, ...newRefs];
      setRefs(updated);
      await saveRefs(updated);
    } catch (caught) {
      createdObjectUrls.forEach(url => URL.revokeObjectURL(url));
      setError(caught.message || 'Reference upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const chooseTemplate = tag => {
    pendingTagRef.current = tag;
    document.getElementById('ref-upload-empty')?.click();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 'var(--content-max)', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
        <div>
          <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--accent-deep)', marginBottom: 10 }}>Reference Library</div>
          <h1 style={{ font: 'var(--display-lg)', color: 'var(--text-strong)', letterSpacing: '-0.015em', margin: '0 0 10px' }}>References</h1>
          <p style={{ font: 'var(--text-lg)', color: 'var(--text-muted)', margin: 0, maxWidth: 520 }}>Curate the visual language that keeps every creator on-brand. Cloud references are stored privately as full-resolution assets.</p>
        </div>
        <Button variant="accent" disabled={uploading} onClick={() => document.getElementById('ref-upload')?.click()}>
          <Icon name={uploading ? 'loader' : 'plus'} size={15} /> {uploading ? 'Saving…' : 'Add Reference'}
          <input id="ref-upload" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={uploading} style={{ display: 'none' }} onChange={e => handleUpload(Array.from(e.target.files))} />
        </Button>
      </div>

      {error && <div role="alert" style={{ color: 'var(--cherry)', background: 'var(--status-locked-bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '10px 12px', font: 'var(--text-sm)' }}>{error}</div>}

      {selected.size > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: 'var(--rose-glass)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', flexWrap: 'wrap' }}>
          <span style={{ font: '600 0.875rem/1 var(--font-ui)', color: 'var(--text-strong)' }}>{selected.size} selected</span>
          <Button variant="secondary" size="sm" onClick={() => setSelected(new Set())}>Clear</Button>
          <Button variant="dark" size="sm" onClick={() => {
            const selectedRefs = refs.filter(r => selected.has(r.id));
            const vision = selectedRefs.map(r => `${r.caption} (${r.tag})`).join(', ');
            onNav?.('director', { vision });
          }}>Use in Director</Button>
        </div>
      )}

      {refs.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ font: '600 1rem/1 var(--font-ui)', color: 'var(--text-strong)', marginBottom: 6 }}>Start a mood board</div>
            <div style={{ font: 'var(--text-sm)', color: 'var(--text-muted)' }}>Pick a starting point — it tags what you upload so your library stays organized from the first photo.</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            {REFERENCE_TEMPLATES.map(t => (
              <button key={t.id} disabled={uploading} onClick={() => chooseTemplate(t.tag)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10, padding: '18px 16px', borderRadius: 'var(--radius-lg)', border: '1.5px dashed var(--border-strong)', background: 'var(--cream)', cursor: uploading ? 'wait' : 'pointer', textAlign: 'left', transition: 'all var(--t-fast)' }}>
                <span style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'var(--rose-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-deep)' }}><Icon name={t.icon} size={17} strokeWidth={1.5} /></span>
                <div style={{ font: '600 0.85rem/1.2 var(--font-ui)', color: 'var(--text-strong)' }}>{t.tag}</div>
                <div style={{ font: 'var(--text-xs)', color: 'var(--text-faint)', lineHeight: 1.4 }}>{t.desc}</div>
              </button>
            ))}
          </div>
          <div style={{ textAlign: 'center' }}><Button variant="secondary" disabled={uploading} onClick={() => document.getElementById('ref-upload-empty')?.click()}><Icon name="plus" size={14} /> Or just add a reference</Button></div>
          <input id="ref-upload-empty" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={uploading} style={{ display: 'none' }} onChange={e => handleUpload(Array.from(e.target.files))} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
          {refs.map(item => <RefCard key={item.id} item={item} selected={selected.has(item.id)} onSelect={toggleSelect} />)}
          <UploadCard onUpload={handleUpload} disabled={uploading} />
        </div>
      )}
    </div>
  );
}
