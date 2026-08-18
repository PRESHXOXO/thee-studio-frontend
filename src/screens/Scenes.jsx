import React from 'react';
import { PageHeader } from '../components/navigation/PageHeader.jsx';
import { Card } from '../components/surfaces/Card.jsx';
import { Icon } from '../components/core/Icon.jsx';

const SCENE_DATA = [
  {
    id: 'yacht',
    name: 'Yacht',
    icon: 'anchor',
    desc: 'Luxury deck, open water, golden light.',
    mood: 'Coastal · Golden hour',
    imagePosition: '50% 58%',
    image: 'https://images.unsplash.com/photo-1540946485063-a40da27545f8?auto=format&fit=crop&crop=entropy&w=1400&q=88&sat=-8',
  },
  {
    id: 'penthouse',
    name: 'Penthouse',
    icon: 'building-2',
    desc: 'Floor-to-ceiling views, high-end interiors.',
    mood: 'Interior · After dark',
    imagePosition: '50% 50%',
    image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&crop=entropy&w=1400&q=88&sat=-10',
  },
  {
    id: 'jet',
    name: 'Private Jet',
    icon: 'plane',
    desc: 'Intimate cabin, clouds outside.',
    mood: 'Travel · Quiet luxury',
    imagePosition: '58% 50%',
    image: 'https://images.unsplash.com/photo-1540962351504-03099e0a754b?auto=format&fit=crop&crop=entropy&w=1400&q=88&sat=-8',
  },
  {
    id: 'rooftop',
    name: 'Rooftop',
    icon: 'sunset',
    desc: 'City skyline, dusk light.',
    mood: 'City · Blue hour',
    imagePosition: '50% 48%',
    image: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&crop=entropy&w=1400&q=88&sat=-12',
  },
  {
    id: 'poolside',
    name: 'Poolside',
    icon: 'droplets',
    desc: 'Crystal water, summer mood.',
    mood: 'Resort · Sun-washed',
    imagePosition: '50% 58%',
    image: 'https://images.unsplash.com/photo-1575429198097-0414ec08e8cd?auto=format&fit=crop&crop=entropy&w=1400&q=88&sat=-9',
  },
  {
    id: 'studio',
    name: 'Studio',
    icon: 'camera',
    desc: 'Clean backdrop, controlled lighting.',
    mood: 'Editorial · Controlled light',
    imagePosition: '50% 46%',
    image: 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&crop=entropy&w=1400&q=88&sat=-14',
  },
  {
    id: 'hotel',
    name: 'Boutique Hotel',
    icon: 'bed',
    desc: 'Curated luxury interiors.',
    mood: 'Interior · Lamp light',
    imagePosition: '50% 50%',
    image: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&crop=entropy&w=1400&q=88&sat=-11',
  },
  {
    id: 'gallery',
    name: 'Art Gallery',
    icon: 'frame',
    desc: 'White walls, statement art.',
    mood: 'Minimal · Curated',
    imagePosition: '50% 52%',
    image: 'https://images.unsplash.com/photo-1561214115-f2f134cc4912?auto=format&fit=crop&crop=entropy&w=1400&q=88&sat=-15',
  },
  {
    id: 'nightclub',
    name: 'Night Club',
    icon: 'music',
    desc: 'Low light, color, energy.',
    mood: 'Nightlife · After hours',
    imagePosition: '50% 46%',
    image: 'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?auto=format&fit=crop&crop=entropy&w=1400&q=88&sat=-4',
  },
  {
    id: 'garden',
    name: 'Garden',
    icon: 'flower-2',
    desc: 'Natural, lush, organic.',
    mood: 'Botanical · Soft light',
    imagePosition: '50% 52%',
    image: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&crop=entropy&w=1400&q=88&sat=-10',
  },
  {
    id: 'beach',
    name: 'Beach',
    icon: 'waves',
    desc: 'Sand, surf, open sky.',
    mood: 'Coast · Dreamy neutral',
    imagePosition: '50% 58%',
    image: 'https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?auto=format&fit=crop&crop=entropy&w=1400&q=88&sat=-12',
  },
  {
    id: 'desert',
    name: 'Desert',
    icon: 'sun',
    desc: 'Vast, stark, cinematic.',
    mood: 'Landscape · Cinematic',
    imagePosition: '50% 56%',
    image: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&crop=entropy&w=1400&q=88&sat=-10',
  },
];

function SceneCard({ scene, onUse }) {
  const [hovered, setHovered] = React.useState(false);

  return (
    <Card
      onClick={onUse}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 290,
        overflow: 'hidden',
        cursor: 'pointer',
        borderColor: hovered ? 'color-mix(in srgb, var(--accent-deep) 30%, var(--border))' : 'var(--border)',
        transform: hovered ? 'translateY(-3px)' : 'none',
        transition: 'transform var(--t-base), box-shadow var(--t-base), border-color var(--t-base)',
        boxShadow: hovered ? '0 22px 50px rgba(36, 28, 30, 0.13)' : 'var(--shadow-xs)',
        background: 'var(--surface-card)',
      }}
    >
      <div style={{
        position: 'relative',
        aspectRatio: '16 / 10',
        overflow: 'hidden',
        background: 'var(--surface-inset)',
      }}>
        <img
          src={scene.image}
          alt=""
          loading="lazy"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: scene.imagePosition,
            display: 'block',
            filter: hovered
              ? 'saturate(0.88) contrast(0.98) brightness(0.94)'
              : 'saturate(0.78) contrast(0.94) brightness(0.9)',
            transform: hovered ? 'scale(1.045)' : 'scale(1.012)',
            transition: 'transform 420ms cubic-bezier(.2,.7,.2,1), filter 280ms ease',
          }}
        />
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(18,13,18,0.04) 18%, rgba(18,13,18,0.08) 48%, rgba(18,13,18,0.58) 100%), linear-gradient(115deg, rgba(92,58,42,0.10), rgba(64,44,76,0.06))',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.16,
          pointerEvents: 'none',
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.38) 0.55px, transparent 0.65px)',
          backgroundSize: '5px 5px',
          mixBlendMode: 'soft-light',
        }} />
        <div style={{
          position: 'absolute',
          top: 14,
          left: 14,
          width: 38,
          height: 38,
          borderRadius: 12,
          background: 'rgba(250, 246, 242, 0.88)',
          color: 'var(--accent-deep)',
          border: '1px solid rgba(255,255,255,0.5)',
          boxShadow: '0 8px 22px rgba(20, 15, 18, 0.12)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Icon name={scene.icon} size={18} strokeWidth={1.55} />
        </div>
        <div style={{
          position: 'absolute',
          left: 16,
          bottom: 14,
          color: 'rgba(255,255,255,0.86)',
          font: '600 0.64rem/1 var(--font-ui)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          textShadow: '0 1px 12px rgba(0,0,0,0.35)',
        }}>
          {scene.mood}
        </div>
        <div style={{
          position: 'absolute',
          right: 14,
          bottom: 13,
          opacity: hovered ? 1 : 0,
          transform: hovered ? 'translateY(0)' : 'translateY(4px)',
          transition: 'opacity var(--t-base), transform var(--t-base)',
          color: '#fff',
          font: 'var(--text-xs)',
          fontWeight: 600,
          textShadow: '0 1px 10px rgba(0,0,0,0.4)',
        }}>
          Open →
        </div>
      </div>

      <div style={{
        padding: '18px 18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        flex: 1,
      }}>
        <div style={{
          font: 'var(--display-sm)',
          color: 'var(--text-strong)',
          lineHeight: 1.12,
        }}>
          {scene.name}
        </div>
        <div style={{
          font: 'var(--text-sm)',
          color: 'var(--text-muted)',
          lineHeight: 1.5,
          maxWidth: '28ch',
        }}>
          {scene.desc}
        </div>
      </div>
    </Card>
  );
}

export function Scenes({ onNav }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 30,
      maxWidth: 'var(--content-max)',
      margin: '0 auto',
    }}>
      <PageHeader
        title="Scenes"
        subtitle="Choose a setting that matches the mood. Select a scene preset to open it in Thee Director."
      />

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: 22,
        alignItems: 'stretch',
      }}>
        {SCENE_DATA.map(scene => (
          <SceneCard
            key={scene.id}
            scene={scene}
            onUse={() => onNav && onNav('director', { scene: scene.name, vision: scene.desc })}
          />
        ))}
      </div>
    </div>
  );
}
