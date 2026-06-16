import React from 'react';
import { Button } from '../components/core/Button.jsx';
import { Icon } from '../components/core/Icon.jsx';

const REF_KEY = 'ts_references';

function loadRefs() {
  try { return JSON.parse(localStorage.getItem(REF_KEY) || '[]'); } catch { return []; }
}

function saveRefs(refs) {
  try { localStorage.setItem(REF_KEY, JSON.stringify(refs)); } catch {}
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
          : <div style={{ width: '100%', height: '100%', background: 'var(--grad-portrait)' }} />
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

function UploadCard({ onUpload }) {
  const inputRef = React.useRef(null);
  return (
    <div
      onClick={() => inputRef.current?.click()}
      style={{
        aspectRatio: '3/4', borderRadius: 'var(--radius-lg)', border: '2px dashed var(--border-strong)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 8, cursor: 'pointer', background: 'var(--cream)', transition: 'background var(--t-fast)',
        color: 'var(--text-faint)',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--rose-glass)'}
      onMouseLeave={e => e.currentTarget.style.background = 'var(--cream)'}
    >
      <Icon name="plus" size={24} strokeWidth={1.5} />
      <span style={{ font: 'var(--text-sm)' }}>Add reference</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={e => onUpload(Array.from(e.target.files))}
      />
    </div>
  );
}

export function References({ onNav }) {
  const [refs, setRefs] = React.useState(loadRefs);
  const [selected, setSelected] = React.useState(new Set());

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleUpload = (files) => {
    const readers = files.map((file, i) => new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = ev => resolve({
        id: `ref_${Date.now()}_${i}`,
        src: ev.target.result,
        creator: 'My Reference',
        caption: file.name.replace(/\.[^.]+$/, ''),
        tag: 'Uploaded',
      });
      fr.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
      fr.readAsDataURL(file);
    }));
    Promise.all(readers).then(newRefs => {
      setRefs(prev => {
        const updated = [...prev, ...newRefs];
        saveRefs(updated);
        return updated;
      });
    }).catch(err => console.error('Reference upload failed:', err));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 'var(--content-max)', margin: '0 auto' }}>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
        <div>
          <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--accent-deep)', marginBottom: 10 }}>Reference Library</div>
          <h1 style={{ font: 'var(--display-lg)', color: 'var(--text-strong)', letterSpacing: '-0.015em', margin: '0 0 10px' }}>References</h1>
          <p style={{ font: 'var(--text-lg)', color: 'var(--text-muted)', margin: 0, maxWidth: 480 }}>Curate the visual language that keeps every creator on-brand.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="primary" onClick={() => document.getElementById('ref-upload').click()}>
            <Icon name="plus" size={15} /> Add Reference
            <input id="ref-upload" type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => handleUpload(Array.from(e.target.files))} />
          </Button>
        </div>
      </div>

      {selected.size > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: 'var(--rose-glass)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)' }}>
          <span style={{ font: '600 0.875rem/1 var(--font-ui)', color: 'var(--text-strong)' }}>{selected.size} selected</span>
          <Button variant="secondary" size="sm" onClick={() => setSelected(new Set())}>Clear</Button>
          <Button variant="dark" size="sm" onClick={() => {
            const selectedRefs = refs.filter(r => selected.has(r.id));
            const vision = selectedRefs.map(r => `${r.caption} (${r.tag})`).join(', ');
            onNav && onNav('director', { vision });
          }}>Use in Director</Button>
        </div>
      )}

      {refs.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '64px 24px', border: '2px dashed var(--border-strong)', borderRadius: 'var(--radius-lg)', color: 'var(--text-faint)' }}>
          <Icon name="image" size={36} strokeWidth={1} />
          <div style={{ font: '600 1rem/1 var(--font-ui)', color: 'var(--text-muted)' }}>No references yet</div>
          <div style={{ font: 'var(--text-sm)', color: 'var(--text-faint)', textAlign: 'center', maxWidth: 320 }}>Upload reference images to build your visual library. They'll be saved here for future shoots.</div>
          <Button variant="primary" onClick={() => document.getElementById('ref-upload-empty').click()}>
            <Icon name="plus" size={14} /> Add Reference
            <input id="ref-upload-empty" type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => handleUpload(Array.from(e.target.files))} />
          </Button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
          {refs.map(item => (
            <RefCard key={item.id} item={item} selected={selected.has(item.id)} onSelect={toggleSelect} />
          ))}
          <UploadCard onUpload={handleUpload} />
        </div>
      )}

    </div>
  );
}
