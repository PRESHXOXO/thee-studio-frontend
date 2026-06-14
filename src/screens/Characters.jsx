import React from 'react';
import { Button } from '../components/core/Button.jsx';
import { Card } from '../components/surfaces/Card.jsx';
import { Icon } from '../components/core/Icon.jsx';

const FIELD_DEFS = [
  { id: 'face',        icon: 'scan-face',    label: 'Face',          placeholder: 'e.g. High cheekbones, almond eyes, soft heart shape' },
  { id: 'hair',        icon: 'wind',         label: 'Hair',          placeholder: 'e.g. Silk press, deep espresso, side part' },
  { id: 'body',        icon: 'person-stand', label: 'Body',          placeholder: 'e.g. 5\'6", elegant posture, lithe build' },
  { id: 'wardrobe',    icon: 'shirt',        label: 'Wardrobe',      placeholder: 'e.g. Minimal luxury, silk, tailored silhouettes' },
  { id: 'tone',        icon: 'droplet',      label: 'Skin Tone',     placeholder: 'e.g. Warm deep brown, dewy, luminous' },
  { id: 'personality', icon: 'sparkles',     label: 'Personality',   placeholder: 'e.g. Confident, creative, sophisticated' },
  { id: 'niche',       icon: 'camera',       label: 'Content Niche', placeholder: 'e.g. Beauty, fashion editorial, lifestyle' },
];

const LABEL = { font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6, display: 'block' };
const INPUT_STYLE = { width: '100%', boxSizing: 'border-box', padding: '8px 12px', background: 'var(--input-bg, #fff)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', font: 'var(--text-sm)', color: 'var(--text-body)', outline: 'none', fontFamily: 'inherit' };

function loadCharacters() {
  try { return JSON.parse(localStorage.getItem('ts_characters') || '[]'); } catch { return []; }
}
function saveCharacters(list) {
  localStorage.setItem('ts_characters', JSON.stringify(list));
}

export function Characters({ initialCharacter }) {
  const [characters, setCharacters] = React.useState(loadCharacters);
  const [activeId, setActiveId]     = React.useState(null);
  const [editing, setEditing]       = React.useState(null); // { name, image, fields:{} }
  const fileInputRef                = React.useRef(null);

  // When an image is imported from Studio Home, start creating a new character
  React.useEffect(() => {
    if (!initialCharacter) return;
    setEditing({
      name: initialCharacter.name || 'New Creator',
      image: initialCharacter.image || null,
      fields: Object.fromEntries(FIELD_DEFS.map(f => [f.id, ''])),
    });
    setActiveId(null);
  }, [initialCharacter]);

  const active = activeId != null ? characters.find(c => c.id === activeId) : null;

  const handleNew = () => {
    setEditing({ name: 'New Creator', image: null, fields: Object.fromEntries(FIELD_DEFS.map(f => [f.id, ''])) });
    setActiveId(null);
  };

  const handleEdit = (char) => {
    setEditing({ name: char.name, image: char.image, fields: { ...char.fields } });
    setActiveId(char.id);
  };

  const handleSave = () => {
    if (!editing) return;
    const updated = activeId != null
      ? characters.map(c => c.id === activeId ? { ...c, ...editing } : c)
      : [...characters, { id: Date.now(), ...editing }];
    saveCharacters(updated);
    setCharacters(updated);
    setActiveId(activeId ?? updated[updated.length - 1].id);
    setEditing(null);
  };

  const handleDelete = (id) => {
    const updated = characters.filter(c => c.id !== id);
    saveCharacters(updated);
    setCharacters(updated);
    if (activeId === id) { setActiveId(null); setEditing(null); }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setEditing(ed => ({ ...ed, image: ev.target.result }));
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const displayChar = editing
    ? { name: editing.name, image: editing.image, fields: editing.fields }
    : active;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 'var(--content-max)', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
        <div>
          <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--accent-deep)', marginBottom: 10 }}>Character Studio</div>
          <h1 style={{ font: 'var(--display-lg)', color: 'var(--text-strong)', letterSpacing: '-0.015em', margin: '0 0 10px' }}>Character Studio</h1>
          <p style={{ font: 'var(--text-lg)', color: 'var(--text-muted)', margin: 0, maxWidth: 480 }}>Craft consistent, iconic identities for your AI creations.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {editing && <Button variant="primary" onClick={handleSave}><Icon name="save" size={15} /> Save Creator</Button>}
          {!editing && <Button variant="secondary" onClick={handleNew}><Icon name="plus" size={15} /> New Creator</Button>}
          {editing && <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: characters.length ? '200px 1fr 180px' : '200px 1fr', gap: 20, alignItems: 'start' }}>

        {/* Portrait */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div
            onClick={() => editing && fileInputRef.current?.click()}
            style={{ aspectRatio: '3/4', borderRadius: 'var(--radius-xl)', background: 'var(--grad-portrait)', boxShadow: 'var(--shadow-md)', overflow: 'hidden', cursor: editing ? 'pointer' : 'default', position: 'relative' }}
          >
            {displayChar?.image
              ? <img src={displayChar.image} alt="Creator" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : editing && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text-faint)' }}>
                  <Icon name="upload" size={24} strokeWidth={1.5} />
                  <span style={{ font: 'var(--text-sm)' }}>Upload photo</span>
                </div>
              )
            }
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
          {editing
            ? <input value={editing.name} onChange={e => setEditing(ed => ({ ...ed, name: e.target.value }))} style={{ ...INPUT_STYLE, textAlign: 'center', fontWeight: 600 }} />
            : <div style={{ textAlign: 'center' }}>
                <div style={{ font: '600 0.9375rem/1 var(--font-ui)', color: 'var(--text-strong)' }}>{displayChar?.name || 'No creator selected'}</div>
                <div style={{ font: 'var(--text-sm)', color: 'var(--text-faint)', marginTop: 4 }}>
                  {displayChar ? 'Click Edit to modify' : 'Select or create a character'}
                </div>
              </div>
          }
          {!editing && active && (
            <Button variant="secondary" onClick={() => handleEdit(active)} style={{ width: '100%' }}>
              <Icon name="pencil" size={14} /> Edit
            </Button>
          )}
        </div>

        {/* Identity fields */}
        <Card style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {FIELD_DEFS.map(f => (
            <div key={f.id}>
              <label style={LABEL}>
                <Icon name={f.icon} size={12} strokeWidth={2} style={{ marginRight: 5 }} />
                {f.label}
              </label>
              {editing
                ? <input
                    value={editing.fields[f.id] || ''}
                    onChange={e => setEditing(ed => ({ ...ed, fields: { ...ed.fields, [f.id]: e.target.value } }))}
                    placeholder={f.placeholder}
                    style={INPUT_STYLE}
                  />
                : <div style={{ font: 'var(--text-sm)', color: displayChar?.fields?.[f.id] ? 'var(--text-body)' : 'var(--text-faint)', lineHeight: 1.5 }}>
                    {displayChar?.fields?.[f.id] || '—'}
                  </div>
              }
            </div>
          ))}
        </Card>

        {/* Character list */}
        {characters.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={LABEL}>Saved Creators</div>
            {characters.map(c => (
              <div
                key={c.id}
                onClick={() => { setActiveId(c.id); setEditing(null); }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 'var(--radius-md)', background: activeId === c.id ? 'var(--rose-glass)' : 'var(--white)', border: `1px solid ${activeId === c.id ? 'var(--border-strong)' : 'var(--border)'}`, cursor: 'pointer' }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'var(--grad-portrait)', overflow: 'hidden', flexShrink: 0 }}>
                  {c.image && <img src={c.image} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: '600 0.8125rem/1 var(--font-ui)', color: 'var(--text-strong)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                </div>
                <button onClick={e => { e.stopPropagation(); handleDelete(c.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', padding: 2 }}>
                  <Icon name="x" size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
