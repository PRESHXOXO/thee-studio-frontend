import React from 'react';
import { PageHeader } from '../components/navigation/PageHeader.jsx';
import { EmptyState } from '../components/feedback/EmptyState.jsx';
import { ConfirmDialog } from '../components/feedback/ConfirmDialog.jsx';
import { Button } from '../components/core/Button.jsx';
import { Icon } from '../components/core/Icon.jsx';
import { Card } from '../components/surfaces/Card.jsx';
import { loadLibrary } from '../lib/library.js';

const KEY = 'ts_campaigns';

const STATUS_META = {
  draft:    { label: 'Draft',    color: 'var(--text-faint)',     bg: 'var(--cream-deep)' },
  active:   { label: 'Active',   color: 'var(--accent-deep)',   bg: 'var(--rose-glass)' },
  complete: { label: 'Complete', color: 'var(--status-ready)',  bg: 'rgba(34,197,94,0.1)' },
};

const CATEGORY_OPTIONS = ['Lifestyle', 'Fashion', 'Beauty', 'Fitness', 'Travel', 'Promo', 'Campaign', 'Collab'];

function loadCampaigns() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}

function saveCampaigns(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {}
}

function loadCharacters() {
  try { return JSON.parse(localStorage.getItem('ts_characters') || '[]'); } catch { return []; }
}

/* ── Create/Edit Modal ───────────────────────────────────────── */
function CampaignModal({ campaign, characters, onSave, onCancel }) {
  const isNew = !campaign?.id;
  const [name, setName]         = React.useState(campaign?.name || '');
  const [description, setDesc]  = React.useState(campaign?.description || '');
  const [character, setChar]    = React.useState(campaign?.character || '');
  const [category, setCategory] = React.useState(campaign?.category || 'Lifestyle');
  const [status, setStatus]     = React.useState(campaign?.status || 'draft');

  const FIELD = { display: 'flex', flexDirection: 'column', gap: 6 };
  const LABEL = { font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--text-muted)' };
  const INPUT = {
    width: '100%', boxSizing: 'border-box', padding: '9px 12px',
    background: 'var(--white)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)', font: 'var(--text-sm)', color: 'var(--text-body)',
    outline: 'none', fontFamily: 'inherit',
  };

  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      id: campaign?.id || `camp_${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      character,
      category,
      status,
      createdAt: campaign?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(30, 12, 8, 0.45)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--white)', borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-xl)', padding: '28px',
          width: '100%', maxWidth: 480,
          display: 'flex', flexDirection: 'column', gap: 20,
          animation: 'dialog-in 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ font: '700 1.1rem/1 var(--font-display)', color: 'var(--text-strong)' }}>
            {isNew ? 'New Campaign' : 'Edit Campaign'}
          </div>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', padding: 4 }}>
            <Icon name="x" size={18} />
          </button>
        </div>

        <div style={FIELD}>
          <div style={LABEL}>Campaign Name *</div>
          <input
            style={INPUT}
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Summer Resort Collection"
            onKeyDown={e => e.key === 'Enter' && handleSave()}
          />
        </div>

        <div style={FIELD}>
          <div style={LABEL}>Creative Brief</div>
          <textarea
            style={{ ...INPUT, minHeight: 80, resize: 'vertical', lineHeight: 1.5 }}
            value={description}
            onChange={e => setDesc(e.target.value)}
            placeholder="Describe the campaign concept, mood, or creative direction…"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={FIELD}>
            <div style={LABEL}>Category</div>
            <select
              style={{ ...INPUT, cursor: 'pointer' }}
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div style={FIELD}>
            <div style={LABEL}>Creator</div>
            <select
              style={{ ...INPUT, cursor: 'pointer' }}
              value={character}
              onChange={e => setChar(e.target.value)}
            >
              <option value="">No character</option>
              {characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        {!isNew && (
          <div style={FIELD}>
            <div style={LABEL}>Status</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {Object.entries(STATUS_META).map(([key, meta]) => (
                <button
                  key={key}
                  onClick={() => setStatus(key)}
                  style={{
                    flex: 1, padding: '8px', borderRadius: 'var(--radius-md)',
                    border: `1.5px solid ${status === key ? meta.color : 'var(--border)'}`,
                    background: status === key ? meta.bg : 'transparent',
                    cursor: 'pointer',
                    font: '600 0.75rem/1 var(--font-ui)', color: status === key ? meta.color : 'var(--text-faint)',
                    transition: 'all var(--t-fast)',
                  }}
                >
                  {meta.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4, borderTop: '1px solid var(--border)' }}>
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} disabled={!name.trim()}>
            {isNew ? 'Create Campaign' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Campaign Card ───────────────────────────────────────────── */
function CampaignCard({ campaign, characters, recentImage, onEdit, onDelete, onNav, onOpenDetail }) {
  const [hovered, setHovered] = React.useState(false);
  const status = STATUS_META[campaign.status] || STATUS_META.draft;
  const char = characters.find(c => String(c.id) === String(campaign.character));
  const age = Math.floor((Date.now() - new Date(campaign.createdAt).getTime()) / 86400000);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onOpenDetail(campaign)}
      style={{ display: 'flex', flexDirection: 'column', gap: 0, borderRadius: 'var(--radius-xl)', overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--white)', boxShadow: hovered ? 'var(--shadow-md)' : 'var(--shadow-xs)', transition: 'all var(--t-base)', transform: hovered ? 'translateY(-2px)' : 'none', cursor: 'pointer' }}
    >
      {/* Cover */}
      <div style={{ height: 120, background: 'var(--grad-portrait)', position: 'relative', overflow: 'hidden' }}>
        {recentImage && (
          <img src={recentImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: 0.75 }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 30%, rgba(28,10,8,0.6))' }} />

        {/* Status badge */}
        <div style={{ position: 'absolute', top: 10, left: 10 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            font: '600 0.68rem/1 var(--font-ui)', letterSpacing: '0.05em', textTransform: 'uppercase',
            color: status.color, background: 'rgba(255,255,255,0.9)',
            padding: '3px 9px', borderRadius: 'var(--radius-pill)',
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: status.color, flexShrink: 0 }} />
            {status.label}
          </span>
        </div>

        {/* Actions */}
        {hovered && (
          <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 6 }}>
            <button onClick={(e) => { e.stopPropagation(); onEdit(campaign); }} style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.9)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-strong)' }}>
              <Icon name="pencil" size={12} strokeWidth={2} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(campaign.id); }} style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.9)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cherry)' }}>
              <Icon name="trash-2" size={12} strokeWidth={2} />
            </button>
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
        <div>
          <div style={{ font: '700 0.9375rem/1.2 var(--font-ui)', color: 'var(--text-strong)', marginBottom: 4 }}>
            {campaign.name}
          </div>
          {campaign.description && (
            <div style={{ font: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.45, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {campaign.description}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ font: '500 0.7rem/1 var(--font-ui)', color: 'var(--text-faint)', background: 'var(--cream-deep)', padding: '3px 8px', borderRadius: 'var(--radius-pill)' }}>
            {campaign.category}
          </span>
          {char && (
            <span style={{ font: '500 0.7rem/1 var(--font-ui)', color: 'var(--accent-deep)', background: 'var(--rose-glass)', padding: '3px 8px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border)' }}>
              {char.name}
            </span>
          )}
          <span style={{ font: '0.7rem/1 var(--font-ui)', color: 'var(--text-faint)', marginLeft: 'auto' }}>
            {age === 0 ? 'Today' : age === 1 ? '1 day ago' : `${age}d ago`}
          </span>
        </div>

        {/* CTA */}
        <div style={{ display: 'flex', gap: 8, paddingTop: 4, borderTop: '1px solid var(--border)', marginTop: 2 }}>
          <Button
            variant="secondary"
            size="sm"
            style={{ flex: 1, justifyContent: 'center', fontSize: '0.75rem' }}
            onClick={(e) => {
              e.stopPropagation();
              onNav && onNav('director', {
                vision: campaign.description || campaign.name,
                campaignId: campaign.id,
                campaignName: campaign.name,
                campaignBrief: campaign.description,
                creatorId: campaign.character || null,
              });
            }}
          >
            <Icon name="clapperboard" size={12} /> Open in Director
          </Button>
          {char && (
            <Button
              variant="secondary"
              size="sm"
              style={{ flex: 1, justifyContent: 'center', fontSize: '0.75rem' }}
              onClick={(e) => { e.stopPropagation(); onNav && onNav('characters'); }}
            >
              <Icon name="sparkles" size={12} /> View Creator
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Campaign Detail ─────────────────────────────────────────── */
function CampaignDetail({ campaign, characters, library, onBack, onEdit, onNav }) {
  const status = STATUS_META[campaign.status] || STATUS_META.draft;
  const char = characters.find(c => String(c.id) === String(campaign.character));
  // Authoritative link is entry.campaign (set by every generation run under
  // this campaign since Phase 4). Older shots made before that existed have
  // no campaign tag and won't appear here — nothing to backfill them with.
  const shots = library.filter(e => e.campaign === campaign.id);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <button
        onClick={onBack}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', font: 'var(--text-sm)', padding: 0, fontFamily: 'inherit', alignSelf: 'flex-start' }}
      >
        <Icon name="arrow-left" size={14} /> All Campaigns
      </button>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              font: '600 0.68rem/1 var(--font-ui)', letterSpacing: '0.05em', textTransform: 'uppercase',
              color: status.color, background: status.bg, padding: '4px 10px', borderRadius: 'var(--radius-pill)',
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: status.color, flexShrink: 0 }} />
              {status.label}
            </span>
            <span style={{ font: '500 0.7rem/1 var(--font-ui)', color: 'var(--text-faint)', background: 'var(--cream-deep)', padding: '3px 8px', borderRadius: 'var(--radius-pill)' }}>
              {campaign.category}
            </span>
          </div>
          <h1 style={{ font: 'var(--display-lg)', color: 'var(--text-strong)', letterSpacing: '-0.015em', margin: '0 0 6px' }}>{campaign.name}</h1>
          <div style={{ font: 'var(--text-sm)', color: 'var(--text-faint)' }}>Created {new Date(campaign.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" onClick={() => onEdit(campaign)}><Icon name="pencil" size={14} /> Edit</Button>
          <Button
            variant="primary"
            onClick={() => onNav && onNav('director', {
              vision: campaign.description || campaign.name,
              campaignId: campaign.id,
              campaignName: campaign.name,
              campaignBrief: campaign.description,
              creatorId: campaign.character || null,
            })}
          >
            <Icon name="clapperboard" size={15} /> Open in Director
          </Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20, alignItems: 'start' }}>
        <Card style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Creative Brief</div>
          {campaign.description ? (
            <p style={{ font: 'var(--text-base)', color: 'var(--text-body)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{campaign.description}</p>
          ) : (
            <p style={{ font: 'var(--text-sm)', color: 'var(--text-faint)', margin: 0 }}>No brief written yet — add one from Edit.</p>
          )}
        </Card>

        <Card style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Assigned Creator</div>
          {char ? (
            <button
              onClick={() => onNav && onNav('characters')}
              style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left', fontFamily: 'inherit' }}
            >
              <div style={{ width: 40, height: 52, borderRadius: 8, overflow: 'hidden', background: 'var(--grad-portrait)', flexShrink: 0 }}>
                {(char.refImages?.[0] || char.image) && (
                  <img src={char.refImages?.[0] || char.image} alt={char.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
              </div>
              <span style={{ font: '600 0.875rem/1 var(--font-ui)', color: 'var(--accent-deep)' }}>{char.name}</span>
            </button>
          ) : (
            <div style={{ font: 'var(--text-sm)', color: 'var(--text-faint)' }}>No creator assigned</div>
          )}
        </Card>
      </div>

      <div>
        <div style={{ font: 'var(--label)', letterSpacing: 'var(--label-spacing)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 14 }}>
          Shot History {shots.length > 0 && `· ${shots.length}`}
        </div>
        {shots.length === 0 ? (
          <EmptyState
            icon="image"
            title="Nothing shot under this campaign yet"
            body="Generate from Open in Director above — every image made in that session gets tagged back here automatically."
          />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 14 }}>
            {shots.map(entry => (
              <div key={entry.id} style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border)', aspectRatio: '3/4', background: 'var(--grad-portrait)' }}>
                <img src={entry.url} alt="Shot" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main Screen ─────────────────────────────────────────────── */
export function Campaigns({ onNav }) {
  const [campaigns, setCampaigns] = React.useState(loadCampaigns);
  const [characters]              = React.useState(loadCharacters);
  const [library]                 = React.useState(loadLibrary);
  const [modal, setModal]         = React.useState(null); // null | { mode: 'create'|'edit', campaign? }
  const [confirm, setConfirm]     = React.useState(null);
  const [filter, setFilter]       = React.useState('all');
  const [detailId, setDetailId]   = React.useState(null);

  const save = (updated) => {
    setCampaigns(updated);
    saveCampaigns(updated);
  };

  const handleSave = (data) => {
    const existing = campaigns.find(c => c.id === data.id);
    const updated = existing
      ? campaigns.map(c => c.id === data.id ? data : c)
      : [data, ...campaigns];
    save(updated);
    setModal(null);
  };

  const handleDelete = (id) => {
    setConfirm({
      title: 'Delete Campaign?',
      message: 'This campaign brief will be permanently removed.',
      onConfirm: () => {
        save(campaigns.filter(c => c.id !== id));
        setConfirm(null);
      },
    });
  };

  const filtered = filter === 'all' ? campaigns : campaigns.filter(c => c.status === filter);

  const STATUS_TABS = [
    { id: 'all',      label: 'All' },
    { id: 'active',   label: 'Active' },
    { id: 'draft',    label: 'Draft' },
    { id: 'complete', label: 'Complete' },
  ];

  const detailCampaign = detailId != null ? campaigns.find(c => c.id === detailId) : null;

  if (detailCampaign) {
    return (
      <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto' }}>
        <CampaignDetail
          campaign={detailCampaign}
          characters={characters}
          library={library}
          onBack={() => setDetailId(null)}
          onEdit={(c) => setModal({ mode: 'edit', campaign: c })}
          onNav={onNav}
        />
        {modal && (
          <CampaignModal
            campaign={modal.campaign}
            characters={characters}
            onSave={handleSave}
            onCancel={() => setModal(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 'var(--content-max)', margin: '0 auto' }}>
      <PageHeader
        title="Campaigns"
        subtitle="Plan and organize your shoots. Group creative direction, characters, and assets by campaign."
        actions={
          <Button variant="primary" onClick={() => setModal({ mode: 'create' })}>
            <Icon name="plus" size={15} /> New Campaign
          </Button>
        }
      />

      {campaigns.length > 0 && (
        <div style={{ display: 'flex', gap: 6 }}>
          {STATUS_TABS.map(tab => {
            const count = tab.id === 'all' ? campaigns.length : campaigns.filter(c => c.status === tab.id).length;
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                style={{
                  padding: '7px 14px', borderRadius: 'var(--radius-pill)',
                  border: `1px solid ${active ? 'var(--border-strong)' : 'var(--border)'}`,
                  background: active ? 'var(--white)' : 'transparent',
                  font: `${active ? '600' : '500'} 0.8125rem/1 var(--font-ui)`,
                  color: active ? 'var(--text-strong)' : 'var(--text-muted)',
                  cursor: 'pointer', transition: 'all var(--t-fast)',
                  boxShadow: active ? 'var(--shadow-xs)' : 'none',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                {tab.label}
                {count > 0 && (
                  <span style={{ font: '600 0.7rem/1 var(--font-mono)', color: active ? 'var(--accent-deep)' : 'var(--text-faint)', background: active ? 'var(--rose-glass)' : 'var(--cream-deep)', padding: '2px 6px', borderRadius: 'var(--radius-pill)' }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {filtered.length === 0 ? (
        campaigns.length === 0 ? (
          <EmptyState
            icon="megaphone"
            title="No campaigns yet"
            body="Create a campaign to plan your shoots. Set a creative brief, assign a creator, and track from draft to complete."
            cta="New Campaign"
            onCta={() => setModal({ mode: 'create' })}
          />
        ) : (
          <EmptyState
            icon="filter"
            title={`No ${filter} campaigns`}
            body="Try a different filter or create a new campaign."
          />
        )
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {filtered.map(camp => (
            <CampaignCard
              key={camp.id}
              campaign={camp}
              characters={characters}
              recentImage={
                (library.find(e => e.campaign === camp.id)
                  || library.find(e => String(e.character) === String(camp.character)))?.url
              }
              onEdit={(c) => setModal({ mode: 'edit', campaign: c })}
              onDelete={handleDelete}
              onNav={onNav}
              onOpenDetail={(c) => setDetailId(c.id)}
            />
          ))}

          {/* Quick-add card */}
          <button
            onClick={() => setModal({ mode: 'create' })}
            style={{
              borderRadius: 'var(--radius-xl)', border: '2px dashed var(--border)', background: 'transparent',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 10, cursor: 'pointer', padding: 24, minHeight: 240,
              color: 'var(--text-faint)', transition: 'all var(--t-fast)',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.background = 'var(--rose-glass)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.background = ''; e.currentTarget.style.color = ''; }}
          >
            <Icon name="plus" size={24} strokeWidth={1.5} />
            <span style={{ font: '500 0.875rem/1 var(--font-ui)' }}>New Campaign</span>
          </button>
        </div>
      )}

      {modal && (
        <CampaignModal
          campaign={modal.campaign}
          characters={characters}
          onSave={handleSave}
          onCancel={() => setModal(null)}
        />
      )}

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel="Delete"
        onConfirm={confirm?.onConfirm}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
