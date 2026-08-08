import React from 'react';
import { Button } from '../components/core/Button.jsx';
import { Card } from '../components/surfaces/Card.jsx';
import { Icon } from '../components/core/Icon.jsx';
import { ConfirmDialog } from '../components/feedback/ConfirmDialog.jsx';
import {
  analyzeCharacterReferences,
  extractFaceAnchor,
  generateReferenceSet,
  isLocalStudioServiceEnabled,
  LOCAL_ACTION_UNAVAILABLE,
} from '../api/studio.js';
import { hasSupabaseConfig } from '../lib/supabase.js';
import { saveToLibrary, loadLibrary } from '../lib/library.js';
import { compressImage, normalizeImageForVision } from '../lib/imageUtils.js';
import { resolveActiveCreator, saveActiveCreatorId } from '../lib/activeCreator.js';
import { persistCloudDocument } from '../lib/cloudStore.js';
import { canonicalCreatorId } from '../lib/cloudCreators.js';
import { linkCastCreatorToCloud } from '../lib/castCreatorSync.js';
import { loadCharacters } from '../lib/creatorCache.js';
import { useAuth } from '../context/AuthContext.jsx';
import { ShootBuilder } from '../components/shoot/ShootBuilder.jsx';
import { GenerationProgress } from '../components/feedback/GenerationProgress.jsx';
import { useProduction } from '../context/ProductionContext.jsx';

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
  const { repository } = useProduction();
  const { session } = useAuth();
  const [characters, setCharacters] = React.useState(loadCharacters);
  const [activeId, setActiveId]     = React.useState(() => resolveActiveCreator(loadCharacters())?.id ?? null);
  const [editing, setEditing]       = React.useState(null);

  // Storage isolation across an account switch is already handled — auth
  // bootstrap clears+repopulates the ts_characters cache for the new user
  // before `session` updates in React (see lib/creatorCache.js). What's not
  // automatic is this component's own in-memory state, read once at mount:
  // without this, switching accounts in the same tab would keep showing the
  // previous user's cast roster/selection/draft until a full remount.
  const sessionIdRef = React.useRef(session?.id ?? null);
  React.useEffect(() => {
    const nextId = session?.id ?? null;
    if (sessionIdRef.current === nextId) return;
    sessionIdRef.current = nextId;
    const nextCharacters = loadCharacters();
    setCharacters(nextCharacters);
    setActiveId(resolveActiveCreator(nextCharacters)?.id ?? null);
    setEditing(null);
  }, [session?.id]);
  const [importOpen, setImportOpen] = React.useState(false);
  const [importFilesError, setImportFilesError] = React.useState('');
  const [importReferences, setImportReferences] = React.useState([]);
  const [importReading, setImportReading] = React.useState(false);
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
    };
    init();
  }, [initialCharacter]);

  // "Import Creator" entry points elsewhere in the app (Studio Home) land
  // here wanting the photo-import panel specifically, not a blank form.
  React.useEffect(() => {
    if (initialImportRequest) setImportOpen(true);
  }, [initialImportRequest]);

  const analyzeReferenceSet = async (imageDataUrls) => {
    const images = Array.isArray(imageDataUrls) ? imageDataUrls : [imageDataUrls];
    // Do not pass normalizeImageForVision directly to map: map's index would
    // become maxPx, shrinking the first five references to 1–4 pixels.
    const visionImages = await Promise.all(
      images.filter(Boolean).slice(0, 5).map(image => normalizeImageForVision(image))
    );
    if (!visionImages.length) throw new Error('Add at least one creator reference.');

    // Cloud mode: analyzeCharacterReferences already folds identity-anchor
    // extraction into the same call (one billable vision request instead of
    // two) and returns it as `.faceAnchor`. `creatorId` is accepted but
    // deliberately unused here: passing it switches the cloud function to a
    // server-resolve-by-creatorId mode that reads creator_reference_assets —
    // Cast's own reference images are never uploaded there (they live in the
    // local characters array / studio_documents blob), so that path would
    // find nothing and fail with "no saved reference images yet" even though
    // the user just uploaded them. Always analyze the images the user
    // actually supplied.
    if (hasSupabaseConfig()) {
      const result = await analyzeCharacterReferences(visionImages);
      return { result, faceAnchor: result.faceAnchor || '' };
    }

    const [result, faceAnchor] = await Promise.all([
      analyzeCharacterReferences(visionImages),
      extractFaceAnchor(visionImages[0]).catch(e => { console.warn('Face anchor extraction failed:', e); return ''; }),
    ]);
    return { result, faceAnchor };
  };

  const runAnalysis = async (imageDataUrls, currentEditing) => {
    setAnalyzing(true);
    setAnalyzeError('');
    try {
      const { result, faceAnchor } = await analyzeReferenceSet(imageDataUrls);
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

  // Stage the complete set before analysis. The original image is identity-only;
  // supporting references provide broader body/style evidence.
  const handleImportFiles = async (fileList) => {
    const remaining = Math.max(0, 5 - importReferences.length);
    const files = Array.from(fileList || []).slice(0, remaining);
    if (!files.length) return;
    setImportFilesError('');
    setImportReading(true);
    const readers = files.map(file => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = ev => resolve({ image: ev.target.result, name: file.name });
      reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
      reader.readAsDataURL(file);
    }));
    try {
      const originals = await Promise.all(readers);
      const compressed = await Promise.all(originals.map(async ref => ({
        ...ref,
        image: await compressImage(ref.image),
      })));
      setImportReferences(current => [...current, ...compressed].slice(0, 5));
    } catch (e) {
      setImportFilesError(e.message || 'Could not read those photos.');
    } finally {
      setImportReading(false);
    }
  };

  const handleAnalyzeImport = async () => {
    if (!importReferences.length) return;
    setAnalyzing(true);
    setImportFilesError('');
    setAnalyzeError('');
    try {
      const images = importReferences.map(ref => ref.image);
      const { result, faceAnchor } = await analyzeReferenceSet(images);
      setEditing({
        name: '',
        refImages: images,
        faceAnchor: faceAnchor || '',
        fields: Object.fromEntries(FIELD_DEFS.map(field => [field.id, result[field.id] || ''])),
      });
      setActiveId(null);
      setSaveError('');
      setImportOpen(false);
      setImportReferences([]);
    } catch (e) {
      const message = e.message || 'Analysis failed';
      setImportFilesError(
        /invalid mime|invalid_image_format|only image types/i.test(message)
          ? 'Could not read one of these photos. Use JPG, PNG, or WebP images.'
          : message
      );
    } finally {
      setAnalyzing(false);
    }
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

  const handleSave = async () => {
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

    // Best-effort: link this Cast creator to a real cloud `creators` row so
    // Quick Shoot / Build Reference Set / future cloud workflows have a
    // genuine ownable UUID instead of the local Date.now() id. Never blocks
    // or unwinds the local save above, which has already committed.
    try {
      const linked = await linkCastCreatorToCloud(repository, updated, savedId);
      if (linked && linked.id !== updated.find(c => c.id === savedId)?.cloudCreatorId) {
        setCharacters(current => {
          const relinked = current.map(c => c.id === savedId ? { ...c, cloudCreatorId: linked.id } : c);
          saveCharacters(relinked);
          return relinked;
        });
      }
    } catch (error) {
      console.warn('Cloud creator link failed — Cast creator remains usable locally:', error);
    }
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
      setEditing(ed => ({
        ...ed,
        refImages: [compressed, ...(ed.refImages || []).slice(1)],
      }));
      // Deliberately do not analyze here. Users add the whole reference set,
      // then explicitly analyze it once; a lone headshot must not fill fields.
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

      const creatorId = active ? canonicalCreatorId(active) : null;
      const result = await generateReferenceSet({ characterDesc, count, creatorId });
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
  const localServicesEnabled = isLocalStudioServiceEnabled();
  // All four Cast AI actions (Analyze, face anchor, Build Reference Set,
  // Quick Shoot) now have cloud equivalents — only show the blanket warning
  // when neither a local dev backend nor a configured Supabase cloud project
  // is available at all.
  const castActionsUnavailable = !localServicesEnabled && !hasSupabaseConfig();

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
          {!editing && active && (
            <Button
              variant="secondary"
              onClick={() => active.cloudProfile
                ? onNav?.('images', { creatorId: canonicalCreatorId(active) })
                : handleEdit(active)}
            >
              <Icon name="pencil" size={14} /> Edit
            </Button>
          )}
          <Button variant="secondary" onClick={handleNew}><Icon name="user-plus" size={15} /> Create from Scratch</Button>
          <Button variant="secondary" onClick={() => { setImportOpen(true); setImportFilesError(''); }}><Icon name="upload" size={15} /> Import from Photos</Button>
        </div>
      </div>

      {castActionsUnavailable && (
        <Card variant="rose" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="clock" size={16} />
          <span style={{ font: 'var(--text-sm)', color: 'var(--text-body)' }}>{LOCAL_ACTION_UNAVAILABLE} Uploads and manual creator editing remain available.</span>
        </Card>
      )}

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
      <GenerationProgress
        active={refSetLoading}
        identityLocked
        engine="OpenAI"
        mode="reference-set"
        batchSize={15}
      />

      {/* Import from Photos — stage the complete set, then analyze it once. */}
      {importOpen && (
        <Card style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ font: '600 0.9375rem/1 var(--font-ui)', color: 'var(--text-strong)' }}>Import from Photos</div>
              <div style={{ font: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 3 }}>
                Add the complete reference set before analysis. The first photo is identity-only; wardrobe is inferred only from consistent evidence across at least two supporting photos.
              </div>
            </div>
            <button
              onClick={() => { setImportOpen(false); setImportReferences([]); setImportFilesError(''); }}
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
            <span style={{ font: '600 0.875rem/1 var(--font-ui)', color: 'var(--text-muted)' }}>
              {importReferences.length ? 'Add more references' : 'Choose the complete reference set'}
            </span>
            <span style={{ font: 'var(--text-xs)', color: 'var(--text-faint)' }}>Up to 5 images · JPG, PNG, or WebP</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              disabled={importReading || analyzing || importReferences.length >= 5}
              style={{ display: 'none' }}
              onChange={e => { handleImportFiles(e.target.files); e.target.value = ''; }}
            />
          </label>
          {importReferences.length > 0 && (
            <>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {importReferences.map((reference, index) => (
                  <div key={`${reference.name}-${index}`} style={{ width: 86 }}>
                    <div style={{ width: 86, height: 108, borderRadius: 10, overflow: 'hidden', position: 'relative', border: index === 0 ? '2px solid var(--accent-deep)' : '1px solid var(--border)' }}>
                      <img src={reference.image} alt={index === 0 ? 'Identity reference' : `Supporting reference ${index}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button
                        type="button"
                        aria-label={`Remove ${reference.name}`}
                        onClick={() => setImportReferences(current => current.filter((_, refIndex) => refIndex !== index))}
                        disabled={analyzing}
                        style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, border: 0, borderRadius: '50%', background: 'rgba(0,0,0,.65)', color: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
                      >
                        <Icon name="x" size={12} />
                      </button>
                    </div>
                    <div style={{ marginTop: 5, font: '600 0.6875rem/1.2 var(--font-ui)', color: index === 0 ? 'var(--accent-deep)' : 'var(--text-muted)', textAlign: 'center' }}>
                      {index === 0 ? 'Identity only' : `Supporting ${index}`}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ font: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {importReferences.length < 3
                    ? 'Add at least 2 supporting photos for wardrobe analysis. A lone headshot will never define wardrobe.'
                    : `${importReferences.length}/5 ready. Fields stay empty until you confirm this is the complete set.`}
                </div>
                <Button onClick={handleAnalyzeImport} loading={analyzing} disabled={analyzing || importReading}>
                  <Icon name="sparkles" size={14} /> {analyzing ? 'Analyzing complete set…' : `Analyze Complete Set (${importReferences.length})`}
                </Button>
              </div>
            </>
          )}
          {importReading && <div style={{ font: 'var(--text-sm)', color: 'var(--accent-deep)' }}>Preparing every reference…</div>}
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
                {/* Supporting reference slots (indices 1–4) */}
                {[1, 2, 3, 4].map(i => (
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
                  <>
                    <div style={{ font: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                      Add every reference first. Fields remain unchanged until you analyze the complete set.
                    </div>
                    <Button variant="secondary" onClick={() => runAnalysis(displayImages, editing)} style={{ width: '100%' }}>
                      <Icon name="sparkles" size={13} /> Analyze Complete Set ({displayImages.length})
                    </Button>
                  </>
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
          layout="split"
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
