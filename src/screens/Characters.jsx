import React from 'react';
import { Button } from '../components/core/Button.jsx';
import { Card } from '../components/surfaces/Card.jsx';
import { Icon } from '../components/core/Icon.jsx';
import { ConfirmDialog } from '../components/feedback/ConfirmDialog.jsx';
import { analyzeCharacterImage, extractFaceAnchor, generateReferenceSet } from '../api/studio.js';
import { saveToLibrary, loadLibrary } from '../lib/library.js';
import { compressImage, normalizeImageForVision } from '../lib/imageUtils.js';
import { resolveActiveCreator, saveActiveCreatorId } from '../lib/activeCreator.js';
import { persistCloudDocument } from '../lib/cloudStore.js';
import { ShootBuilder } from '../components/shoot/ShootBuilder.jsx';

// Starter archetypes for the empty-cast state — no fake portraits to seed
// with, so these hand off to New Creator with niche/energy pre-filled
// instead of dropping the user into a blank roster.
const CAST_ARCHETYPES = [
  { icon: 'sparkles',  name: 'Beauty Editorial', niche: 'Beauty & Glam',       vision: 'Editorial Luxury', description: 'A polished beauty creator — flawless glam, editorial lighting, luxury cosmetics energy.' },
  { icon: 'dumbbell',  name: 'Fitness Coach',     niche: 'Fitness & Wellness', vision: 'Clean & Minimal',  description: 'An athletic wellness creator — toned, energetic, clean activewear and bright natural light.' },
  { icon: 'plane',     name: 'Travel Lifestyle',  niche: 'Lifestyle & Travel', vision: 'Natural & Earthy', description: 'A jet-set lifestyle creator — sun-kissed, effortless, golden-hour destinations and earthy tones.' },
  { icon: 'shirt',     name: 'Street Style',      niche: 'Fashion & Style',    vision: 'Street & Urban',   description: 'A streetwear fashion creator — bold, urban, confident poses with an editorial street edge.' },
];

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
const INPUT_STYLE = { width: '100%', boxSizing: 'border-box', padding: '8px 12px', background: 'var(--surface-inset)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', font: 'var(--text-sm)', color: 'var(--text-body)', outline: 'none', fontFamily: 'inherit' };

function loadCharacters() {
  try { return JSON.parse(localStorage.getItem('ts_characters') || '[]'); } catch { return []; }
}
function saveCharacters(list) {
  try {
    const value = JSON.stringify(list);
    localStorage.setItem('ts_characters', value);
    void persistCloudDocument('ts_characters', value).catch(() => undefined);
  } catch {
    throw new Error('Storage full — delete some characters and try again.');
  }
}

// Returns primary image for a character (supports legacy single-image + new refImages array)
function getPrimaryImage(char) {
  return char.refImages?.[0] || char.image || null;
}

function getAllImages(char) {
  if (char.refImages?.length) return char.refImages;
  if (char.image) return [char.image];
  return [];
}

// Identity fields hold full paragraphs, not single words — a plain <input>
// clips everything past the visible width. Grows with content, capped so one
// runaway field can't push the rest of the grid off-screen.
function AutoGrowTextarea({ value, onChange, placeholder, disabled, style }) {
  const ref = React.useRef(null);
  const resize = (el) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  };
  React.useEffect(() => { resize(ref.current); }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      rows={1}
      style={{
        ...INPUT_STYLE, resize: 'vertical', overflow: 'hidden', lineHeight: 1.5,
        minHeight: 36, maxHeight: 240, fontFamily: 'inherit',
        ...style,
      }}
    />
  );
}

function RefImageSlot({ src, active, onClick, onDelete, onUpload, index }) {
  const [hov, setHov] = React.useState(false);
  const fileRef = React.useRef(null);

  if (!src) {
    return (
      <>
        <button
          onClick={() => fileRef.current?.click()}
          style={{
            width: 58, height: 77, borderRadius: 8, cursor: 'pointer',
            border: '1.5px dashed var(--border)',
            background: 'var(--surface-raised)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-faint)', flexShrink: 0,
            transition: 'border-color var(--t-fast)',
          }}
        >
          <Icon name="plus" size={16} strokeWidth={1.5} />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ''; }}
        />
      </>
    );
  }

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onClick}
      style={{
        width: 58, height: 77, borderRadius: 8, overflow: 'hidden', cursor: 'pointer', flexShrink: 0, position: 'relative',
        border: `2px solid ${active ? 'var(--accent-deep)' : 'transparent'}`,
        boxShadow: active ? 'var(--depth-media-active)' : 'var(--depth-media-rest)',
        transition: 'border-color var(--t-fast), box-shadow var(--t-fast)',
      }}
    >
      <img src={src} alt={`Ref ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      {hov && (
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          style={{
            position: 'absolute', top: 2, right: 2, width: 18, height: 18,
            borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none',
            cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Icon name="x" size={10} />
        </button>
      )}
    </div>
  );
}

function CreatorCard({ char, selected, onClick, onDelete }) {
  const [hovered, setHovered] = React.useState(false);
  const portrait = getPrimaryImage(char);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        cursor: 'pointer', position: 'relative',
        transform: hovered ? 'translateY(-3px)' : 'none',
        transition: 'transform var(--t-base)',
      }}
    >
      <div style={{
        width: '100%', aspectRatio: '3/4',
        borderRadius: 'var(--radius-xl)',
        background: 'var(--grad-portrait)',
        overflow: 'hidden',
        border: `2px solid ${selected ? 'var(--accent-deep)' : 'transparent'}`,
        boxShadow: selected ? 'var(--shadow-md)' : hovered ? 'var(--shadow-sm)' : 'var(--shadow-xs)',
        transition: 'box-shadow var(--t-base), border-color var(--t-base)',
        position: 'relative',
      }}>
        {portrait
          ? <img src={portrait} alt={char.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)' }}>
              <Icon name="user" size={32} strokeWidth={1} />
            </div>
          )
        }
        {hovered && (
          <button
            onClick={e => { e.stopPropagation(); onDelete(); }}
            style={{
              position: 'absolute', top: 8, right: 8,
              width: 24, height: 24, borderRadius: '50%',
              background: 'rgba(0,0,0,0.55)', border: 'none',
              cursor: 'pointer', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Icon name="x" size={12} />
          </button>
        )}
        {char.locked && (
          <div style={{
            position: 'absolute', bottom: 8, left: 8,
            width: 22, height: 22, borderRadius: '50%',
            background: 'var(--accent-deep)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
          }}>
            <Icon name="fingerprint" size={13} />
          </div>
        )}
        {char.faceAnchor && (
          <div title="Face Lock active — AI has memorized this creator's facial geometry" style={{
            position: 'absolute', top: 8, right: 8,
            background: 'var(--accent-deep)', color: '#fff',
            borderRadius: 'var(--radius-pill)', padding: '2px 6px',
            font: '700 0.6rem/1 var(--font-ui)', letterSpacing: '0.04em',
            boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
          }}>
            FACE LOCK
          </div>
        )}
        {getAllImages(char).length > 1 && (
          <div style={{
            position: 'absolute', bottom: 8, right: 8,
            background: 'rgba(0,0,0,0.55)', color: '#fff', borderRadius: 6,
            font: '600 0.65rem/1 var(--font-ui)', padding: '2px 5px',
          }}>
            {getAllImages(char).length}
          </div>
        )}
      </div>
      <div style={{
        font: '600 0.8125rem/1.2 var(--font-ui)',
        color: selected ? 'var(--accent-deep)' : 'var(--text-strong)',
        textAlign: 'center',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%',
      }}>
        {char.name}
      </div>
    </div>
  );
}

export function Characters({ initialCharacter, initialImportRequest, onCharacterChange, onNav }) {
  const [characters, setCharacters] = React.useState(loadCharacters);
  const [activeId, setActiveId]     = React.useState(() => resolveActiveCreator(loadCharacters())?.id ?? null);
  const [editing, setEditing]       = React.useState(null);
  const [importOpen, setImportOpen] = React.useState(false);
  const [importFilesError, setImportFilesError] = React.useState('');
  const [analyzing, setAnalyzing]   = React.useState(false);
  const [analyzeError, setAnalyzeError] = React.useState('');
  const [saveError, setSaveError]   = React.useState('');
  const [saved, setSaved]           = React.useState(false);
  const [activeRef, setActiveRef]   = React.useState(0);

  // Bumped by ShootBuilder's onGenerated so the shot-history strip refreshes
  // without Characters.jsx needing to own the generation state itself.
  const [shotRefreshTick, setShotRefreshTick] = React.useState(0);

  // Reference set generation
  const [refSetLoading, setRefSetLoading] = React.useState(false);
  const [refSetError,   setRefSetError]   = React.useState('');
  const [refSetDone,    setRefSetDone]    = React.useState(false);

  // Shot history — library entries for active character
  const [shotHistory, setShotHistory] = React.useState([]);

  const fileInputRef    = React.useRef(null);
  const refFileRefs     = React.useRef([null, null, null]);

  const active = activeId != null ? characters.find(c => c.id === activeId) : null;

  // Refresh shot history when active character changes or new images generated
  React.useEffect(() => {
    if (!active) { setShotHistory([]); return; }
    setShotHistory(
      loadLibrary()
        .filter(e => e.character === active.id || e.character === active.name)
        .slice(0, 16)
    );
  }, [activeId, characters, shotRefreshTick]);

  React.useEffect(() => {
    setActiveRef(0);
  }, [activeId, editing]);

  React.useEffect(() => {
    if (!onCharacterChange) return;
    onCharacterChange(active || null);
  }, [activeId, characters]);

  React.useEffect(() => {
    if (!initialCharacter) return;
    const init = async () => {
      const compressed = initialCharacter.image ? await compressImage(initialCharacter.image) : null;
      const newEditing = {
        name: initialCharacter.name || '',
        refImages: compressed ? [compressed] : [],
        fields: Object.fromEntries(FIELD_DEFS.map(f => [f.id, ''])),
      };
      setEditing(newEditing);
      setActiveId(null);
      setAnalyzeError('');
      setSaveError('');
      if (initialCharacter.image) runAnalysis(initialCharacter.image, newEditing);
    };
    init();
  }, [initialCharacter]);

  // "Import Creator" entry points elsewhere in the app (Studio Home) land
  // here wanting the photo-import panel specifically, not a blank form.
  React.useEffect(() => {
    if (initialImportRequest) setImportOpen(true);
  }, [initialImportRequest]);

  const runAnalysis = async (imageDataUrl, currentEditing) => {
    setAnalyzing(true);
    setAnalyzeError('');
    try {
      const visionImage = await normalizeImageForVision(imageDataUrl);
      // Run both in parallel — general fields + precise face anchor
      const [result, faceAnchor] = await Promise.all([
        analyzeCharacterImage(visionImage),
        extractFaceAnchor(visionImage).catch(e => { console.warn('Face anchor extraction failed:', e); return ''; }),
      ]);
      setEditing(ed => ({
        ...(ed || currentEditing),
        faceAnchor: faceAnchor || ed?.faceAnchor || '',
        fields: {
          face:        result.face        || ed?.fields?.face        || '',
          hair:        result.hair        || ed?.fields?.hair        || '',
          body:        result.body        || ed?.fields?.body        || '',
          wardrobe:    result.wardrobe    || ed?.fields?.wardrobe    || '',
          tone:        result.tone        || ed?.fields?.tone        || '',
          personality: result.personality || ed?.fields?.personality || '',
          niche:       result.niche       || ed?.fields?.niche       || '',
        },
      }));
    } catch (e) {
      const message = e.message || 'Analysis failed';
      setAnalyzeError(
        /invalid mime|invalid_image_format|only image types/i.test(message)
          ? 'Could not read this photo. Use a JPG, PNG, or WebP image.'
          : message
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const handleToggleLock = () => {
    if (!activeId) return;
    const updated = characters.map(c => c.id === activeId ? { ...c, locked: !c.locked } : c);
    saveCharacters(updated);
    setCharacters(updated);
  };

  // ShootBuilder handles its own generation state; this just persists a
  // newly-approved shot as another reference angle on the active creator.
  const handleSaveAsAnchorForActive = (compressedDataUrl) => {
    if (!activeId) return;
    const updated = characters.map(c => {
      if (c.id !== activeId) return c;
      const existing = getAllImages(c);
      if (existing.includes(compressedDataUrl)) return c; // already saved
      const newRefs = [...existing, compressedDataUrl];
      return { ...c, refImages: newRefs, image: newRefs[0] };
    });
    saveCharacters(updated);
    setCharacters(updated);
  };

  const handleNew = () => {
    setEditing({ name: '', refImages: [], fields: Object.fromEntries(FIELD_DEFS.map(f => [f.id, ''])) });
    setActiveId(null);
    setAnalyzeError('');
    setSaveError('');
  };

  // "Import from Photos" — reads up to 5 reference images, runs the same
  // vision analysis as the "Re-analyze" button (on the first image), and
  // drops the user into the normal review/edit panel with fields prefilled.
  const handleImportFiles = (fileList) => {
    const files = Array.from(fileList || []).slice(0, 5);
    if (!files.length) return;
    setImportFilesError('');
    const readers = files.map(file => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = ev => resolve(ev.target.result);
      reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
      reader.readAsDataURL(file);
    }));
    Promise.all(readers)
      .then(dataUrls => Promise.all(dataUrls.map(compressImage)))
      .then(compressed => {
        const newEditing = {
          name: '',
          refImages: compressed,
          fields: Object.fromEntries(FIELD_DEFS.map(f => [f.id, ''])),
        };
        setEditing(newEditing);
        setActiveId(null);
        setAnalyzeError('');
        setSaveError('');
        setImportOpen(false);
        runAnalysis(compressed[0], newEditing);
      })
      .catch(e => setImportFilesError(e.message || 'Could not read those photos.'));
  };

  const handleEdit = (char) => {
    // Migrate legacy single image to refImages array
    const refImages = char.refImages?.length
      ? char.refImages
      : char.image ? [char.image] : [];
    setEditing({ name: char.name, refImages, faceAnchor: char.faceAnchor || '', fields: { ...char.fields } });
    setActiveId(char.id);
    setAnalyzeError('');
    setSaveError('');
  };

  const handleSave = () => {
    if (!editing) return;
    setSaveError('');
    // Require a real name — blocks the old "New Creator" placeholder from
    // being saved as an actual creator name (collided with the nav CTA,
    // truncated in Director's picker, showed up as a subject in History).
    if (!editing.name?.trim()) {
      setSaveError('Give your creator a name before saving.');
      return;
    }
    // Normalize: always store refImages, keep legacy image as first ref for compat
    const charData = {
      ...editing,
      image: editing.refImages?.[0] || null,
    };
    const updated = activeId != null
      ? characters.map(c => c.id === activeId ? { ...c, ...charData } : c)
      : [...characters, { id: Date.now(), ...charData }];
    // Snapshot the stored collection so a failed write can never leave it
    // mutated. Existing creators must never be stripped to make space.
    const prevSerialized = localStorage.getItem('ts_characters');
    try {
      saveCharacters(updated);
    } catch {
      if (localStorage.getItem('ts_characters') !== prevSerialized) {
        try {
          if (prevSerialized === null) localStorage.removeItem('ts_characters');
          else localStorage.setItem('ts_characters', prevSerialized);
        } catch {}
      }
      setSaveError('Browser storage is full, so this creator could not be saved. Your existing creators were left untouched. Free up space by deleting an unused creator or clearing old Library images, then save again.');
      return;
    }
    setCharacters(updated);
    const savedId = activeId ?? updated[updated.length - 1].id;
    setActiveId(savedId);
    saveActiveCreatorId(savedId);
    setEditing(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDelete = (id) => {
    const char = characters.find(c => c.id === id);
    setConfirm({
      title: 'Delete Creator?',
      message: `"${char?.name || 'This creator'}" and all their reference photos will be permanently removed.`,
      onConfirm: () => {
        const updated = characters.filter(c => c.id !== id);
        saveCharacters(updated);
        setCharacters(updated);
        if (activeId === id) { setActiveId(null); saveActiveCreatorId(null); setEditing(null); }
        setConfirm(null);
      },
    });
  };

  const handlePrimaryUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async ev => {
      const original = ev.target.result;
      const compressed = await compressImage(original);
      // Capture current editing snapshot BEFORE setEditing so runAnalysis
      // gets the correct state, not the stale closure value.
      const snapshot = editing;
      setEditing(ed => ({
        ...ed,
        refImages: [compressed, ...(ed.refImages || []).slice(1)],
      }));
      runAnalysis(original, snapshot);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRefUpload = async (file, index) => {
    const reader = new FileReader();
    reader.onload = async ev => {
      const compressed = await compressImage(ev.target.result);
      setEditing(ed => {
        const imgs = [...(ed.refImages || [])];
        imgs[index] = compressed;
        return { ...ed, refImages: imgs };
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRefDelete = (index) => {
    setConfirm({
      title: 'Remove Photo?',
      message: 'This reference photo will be removed from the creator profile.',
      confirmLabel: 'Remove',
      onConfirm: () => {
        setEditing(ed => {
          const imgs = [...(ed.refImages || [])];
          imgs.splice(index, 1);
          return { ...ed, refImages: imgs };
        });
        setConfirm(null);
      },
    });
  };

  const handleBuildRefSet = async (count = 15) => {
    const char = editing || active;
    if (!char) return;
    setRefSetLoading(true);
    setRefSetError('');
    setRefSetDone(false);
    try {
      const f = char.fields || {};
      const characterDesc = [
        char.faceAnchor || f.face,
        f.tone && `Skin: ${f.tone}`,
        f.hair && `Hair: ${f.hair}`,
        f.personality && `Energy: ${f.personality}`,
      ].filter(Boolean).join('. ');

      const result = await generateReferenceSet({ characterDesc, count });
      const newImages = result.images || [];
      if (!newImages.length) throw new Error('No images generated.');

      // Merge into refImages (up to 20 total)
      setEditing(ed => {
        const existing = ed?.refImages || [];
        const merged = [...newImages, ...existing].slice(0, 20);
        return { ...ed, refImages: merged };
      });
      setRefSetDone(true);
      setTimeout(() => setRefSetDone(false), 4000);
    } catch (e) {
      setRefSetError(e.message || 'Reference set generation failed.');
    } finally {
      setRefSetLoading(false);
    }
  };

  const [confirm, setConfirm] = React.useState(null); // { title, message, onConfirm }

  const displayChar = editing
    ? { name: editing.name, refImages: editing.refImages, image: editing.refImages?.[0] || null, fields: editing.fields }
    : active;

  const displayImages = displayChar ? getAllImages(displayChar) : [];
  const primaryDisplay = displayImages[editing ? 0 : activeRef] || displayImages[0] || null;

  const showPanel = !!(editing || activeId != null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 'var(--content-max)', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
        <div>
          <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--accent-deep)', marginBottom: 10 }}>Cast</div>
          <h1 style={{ font: 'var(--display-lg)', color: 'var(--text-strong)', letterSpacing: '-0.015em', margin: '0 0 10px' }}>Cast</h1>
          <p style={{ font: 'var(--text-lg)', color: 'var(--text-muted)', margin: 0, maxWidth: 480 }}>Craft consistent, iconic identities for your AI creations.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {analyzing && (
            <span style={{ font: 'var(--text-sm)', color: 'var(--accent-deep)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="sparkles" size={14} /> Analyzing…
            </span>
          )}
          {saved && (
            <span style={{ font: 'var(--text-sm)', color: 'var(--accent-deep)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="check" size={14} /> Saved!
            </span>
          )}
          {editing && <Button variant="accent" onClick={handleSave}><Icon name="save" size={15} /> Save Creator</Button>}
          {editing && <Button variant="secondary" onClick={() => { setEditing(null); setAnalyzeError(''); setSaveError(''); }}>Cancel</Button>}
          {!editing && active && (
            <Button
              variant={active.locked ? 'primary' : 'secondary'}
              onClick={handleToggleLock}
              title={active.locked ? 'Identity Locked — click to unlock' : 'Lock identity'}
            >
              <Icon name="fingerprint" size={15} /> {active.locked ? 'Locked' : 'Lock Identity'}
            </Button>
          )}
          {!editing && active && <Button variant="secondary" onClick={() => handleEdit(active)}><Icon name="pencil" size={14} /> Edit</Button>}
          <Button variant="secondary" onClick={handleNew}><Icon name="user-plus" size={15} /> Create from Scratch</Button>
          <Button variant="secondary" onClick={() => { setImportOpen(true); setImportFilesError(''); }}><Icon name="upload" size={15} /> Import from Photos</Button>
        </div>
      </div>

      {analyzeError && (
        <p style={{ font: 'var(--text-sm)', color: 'var(--cherry)', margin: 0 }}>
          Analysis: {analyzeError} — fields can still be filled manually.
        </p>
      )}
      {saveError && (
        <p style={{ font: 'var(--text-sm)', color: 'var(--cherry)', margin: 0 }}>
          Save failed: {saveError}
        </p>
      )}

      {/* Import from Photos — upload 1-5 references, analyze the first,
          then hand off to the normal review/edit panel below. */}
      {importOpen && (
        <Card style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ font: '600 0.9375rem/1 var(--font-ui)', color: 'var(--text-strong)' }}>Import from Photos</div>
              <div style={{ font: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 3 }}>
                Upload 1–5 reference photos. Thee Studio reads the first one to prefill face, hair, skin tone, body, wardrobe, personality, and content niche — review and adjust before saving.
              </div>
            </div>
            <button
              onClick={() => setImportOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', padding: 4, display: 'flex' }}
            >
              <Icon name="x" size={16} />
            </button>
          </div>
          <label
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '32px 20px', borderRadius: 'var(--radius-lg)', border: '1.5px dashed var(--border)',
              background: 'var(--surface-raised)', cursor: 'pointer', color: 'var(--text-faint)',
              transition: 'border-color var(--t-fast)',
            }}
          >
            <Icon name="images" size={26} strokeWidth={1.5} />
            <span style={{ font: '600 0.875rem/1 var(--font-ui)', color: 'var(--text-muted)' }}>Click to choose photos</span>
            <span style={{ font: 'var(--text-xs)', color: 'var(--text-faint)' }}>Up to 5 images · JPG or PNG</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              style={{ display: 'none' }}
              onChange={e => { handleImportFiles(e.target.files); e.target.value = ''; }}
            />
          </label>
          {importFilesError && (
            <p style={{ font: 'var(--text-sm)', color: 'var(--cherry)', margin: 0 }}>{importFilesError}</p>
          )}
        </Card>
      )}

      {/* Detail panel */}
      {!importOpen && showPanel && (
        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 20, alignItems: 'start' }}>

          {/* Portrait + reference slots */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Primary portrait */}
            <div
              onClick={() => editing && fileInputRef.current?.click()}
              style={{ aspectRatio: '3/4', borderRadius: 'var(--radius-xl)', background: 'var(--grad-portrait)', boxShadow: 'var(--shadow-md)', overflow: 'hidden', cursor: editing ? 'pointer' : 'default', position: 'relative' }}
            >
              {primaryDisplay
                ? <img src={primaryDisplay} alt="Creator" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : editing && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text-faint)' }}>
                    <Icon name="upload" size={24} strokeWidth={1.5} />
                    <span style={{ font: 'var(--text-sm)' }}>Upload photo</span>
                  </div>
                )
              }
              {analyzing && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#fff' }}>
                  <Icon name="sparkles" size={28} strokeWidth={1.5} />
                  <span style={{ font: 'var(--text-sm)', fontWeight: 600 }}>Reading creator…</span>
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handlePrimaryUpload} />

            {/* Additional reference photo slots (editing mode or view mode when refs exist) */}
            {(editing || displayImages.length > 1) && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {/* Slots 1–3 (indices 1–3) */}
                {[1, 2, 3].map(i => (
                  <RefImageSlot
                    key={i}
                    index={i}
                    src={displayImages[i] || null}
                    active={!editing && activeRef === i}
                    onClick={() => !editing && displayImages[i] && setActiveRef(i)}
                    onDelete={() => editing && handleRefDelete(i)}
                    onUpload={file => handleRefUpload(file, i)}
                  />
                ))}
              </div>
            )}

            {editing && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {primaryDisplay && !analyzing && (
                  <Button variant="secondary" onClick={() => runAnalysis(primaryDisplay, editing)} style={{ width: '100%' }}>
                    <Icon name="sparkles" size={13} /> Re-analyze
                  </Button>
                )}
                <Button
                  variant="secondary"
                  loading={refSetLoading}
                  onClick={() => handleBuildRefSet(15)}
                  style={{ width: '100%', background: refSetDone ? 'var(--accent-soft)' : undefined }}
                  disabled={refSetLoading}
                >
                  <Icon name="layers" size={13} />
                  {refSetLoading ? 'Generating reference set…' : refSetDone ? '✓ Reference set added!' : 'Build Reference Set (15 shots)'}
                </Button>
                {refSetError && (
                  <div style={{ font: 'var(--text-xs)', color: 'var(--error)', lineHeight: 1.4 }}>{refSetError}</div>
                )}
                {refSetLoading && (
                  <div style={{ font: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    Generating 15 reference headshots — this takes ~3–5 min. Don't close this panel.
                  </div>
                )}
              </div>
            )}
            {editing
              ? <input value={editing.name} onChange={e => setEditing(ed => ({ ...ed, name: e.target.value }))} placeholder="Name your creator" style={{ ...INPUT_STYLE, textAlign: 'center', fontWeight: 600 }} />
              : <div style={{ textAlign: 'center', font: '600 0.9375rem/1 var(--font-ui)', color: 'var(--text-strong)' }}>
                  {displayChar?.name}
                </div>
            }
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
                  ? <AutoGrowTextarea
                      value={editing.fields[f.id] || ''}
                      onChange={v => setEditing(ed => ({ ...ed, fields: { ...ed.fields, [f.id]: v } }))}
                      placeholder={analyzing ? 'Analyzing…' : f.placeholder}
                      style={{ opacity: analyzing ? 0.5 : 1 }}
                      disabled={analyzing}
                    />
                  : <div style={{ font: 'var(--text-sm)', color: displayChar?.fields?.[f.id] ? 'var(--text-body)' : 'var(--text-faint)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                      {displayChar?.fields?.[f.id] || '—'}
                    </div>
                }
              </div>
            ))}
          </Card>
        </div>
      )}

      {/* Quick Shoot — shared with the unified Director screen's Guided tab */}
      {activeId != null && !editing && active && (
        <ShootBuilder
          creator={active}
          onGenerated={() => setShotRefreshTick(t => t + 1)}
          onSaveAsCreator={handleSaveAsAnchorForActive}
        />
      )}

      {/* Shot History */}
      {activeId != null && !editing && shotHistory.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ ...LABEL, marginBottom: 0 }}>
              Shot History · {shotHistory.length} image{shotHistory.length !== 1 ? 's' : ''}
            </div>
            <button
              onClick={() => onNav && onNav('library')}
              style={{ font: 'var(--text-sm)', color: 'var(--accent-deep)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}
            >
              View all in Library <Icon name="arrow-right" size={13} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12 }}>
            {shotHistory.map(entry => (
              <div key={entry.id} style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border)', aspectRatio: '3/4', background: 'var(--grad-portrait)' }}>
                <img src={entry.url} alt="Shot" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Creator gallery */}
      {characters.length > 0 && (
        <div>
          <div style={{ ...LABEL, marginBottom: 16 }}>Your Creators</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 'var(--grid-gap-media)' }}>
            {characters.map(c => (
              <CreatorCard
                key={c.id}
                char={c}
                selected={c.id === activeId && !editing}
                onClick={() => { setActiveId(c.id); saveActiveCreatorId(c.id); setEditing(null); setAnalyzeError(''); setSaveError(''); }}
                onDelete={() => handleDelete(c.id)}
              />
            ))}
          </div>
        </div>
      )}

      {characters.length === 0 && !editing && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ font: '600 1rem/1 var(--font-ui)', color: 'var(--text-strong)', marginBottom: 6 }}>Start your cast</div>
            <div style={{ font: 'var(--text-sm)', color: 'var(--text-muted)' }}>Pick an archetype to open New Creator with a niche and energy already dialed in — or import a photo instead.</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            {CAST_ARCHETYPES.map(a => (
              <button
                key={a.name}
                onClick={() => onNav && onNav('images', { name: '', niche: a.niche, vision: a.vision, description: a.description })}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10,
                  padding: '18px 16px', borderRadius: 'var(--radius-lg)', border: '1.5px dashed var(--border-strong)',
                  background: 'var(--cream)', cursor: 'pointer', textAlign: 'left', transition: 'all var(--t-fast)',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--rose-glass)'; e.currentTarget.style.borderColor = 'var(--accent-deep)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--cream)'; e.currentTarget.style.borderColor = 'var(--border-strong)'; }}
              >
                <span style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'var(--rose-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-deep)' }}>
                  <Icon name={a.icon} size={17} strokeWidth={1.5} />
                </span>
                <div style={{ font: '600 0.85rem/1.2 var(--font-ui)', color: 'var(--text-strong)' }}>{a.name}</div>
                <div style={{ font: 'var(--text-xs)', color: 'var(--text-faint)' }}>{a.niche} · {a.vision}</div>
              </button>
            ))}
          </div>
          <div style={{ textAlign: 'center' }}>
            <Button variant="secondary" onClick={() => setImportOpen(true)}>
              <Icon name="upload" size={14} /> Or import a photo
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel || 'Delete'}
        onConfirm={confirm?.onConfirm}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
