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
    image: 'https://images.unsplash.com/photo-1569263979104-865ab7cd8d13?auto=format&fit=crop&w=1200&q=82',
  },
  {
    id: 'penthouse',
    name: 'Penthouse',
    icon: 'building-2',
    desc: 'Floor-to-ceiling views, high-end interiors.',
    image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=82',
  },
  {
    id: 'jet',
    name: 'Private Jet',
    icon: 'plane',
    desc: 'Intimate cabin, clouds outside.',
    image: 'https://images.unsplash.com/photo-1540962351504-03099e0a754b?auto=format&fit=crop&w=1200&q=82',
  },
  {
    id: 'rooftop',
    name: 'Rooftop',
    icon: 'sunset',
    desc: 'City skyline, dusk light.',
    image: 'https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1200&q=82',
  },
  {
    id: 'poolside',
    name: 'Poolside',
    icon: 'droplets',
    desc: 'Crystal water, summer mood.',
    image: 'https://images.unsplash.com/photo-1572331165267-854da2b10ccc?auto=format&fit=crop&w=1200&q=82',
  },
  {
    id: 'studio',
    name: 'Studio',
    icon: 'camera',
    desc: 'Clean backdrop, controlled lighting.',
    image: 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=1200&q=82',
  },
  {
    id: 'hotel',
    name: 'Boutique Hotel',
    icon: 'bed',
    desc: 'Curated luxury interiors.',
    image: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=82',
  },
  {
    id: 'gallery',
    name: 'Art Gallery',
    icon: 'frame',
    desc: 'White walls, statement art.',
    image: 'https://images.unsplash.com/photo-1561839561-b13bcfe95249?auto=format&fit=crop&w=1200&q=82',
  },
  {
    id: 'nightclub',
    name: 'Night Club',
    icon: 'music',
    desc: 'Low light, color, energy.',
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=82',
  },
  {
    id: 'garden',
    name: 'Garden',
    icon: 'flower-2',
    desc: 'Natural, lush, organic.',
    image: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=1200&q=82',
  },
  {
    id: 'beach',
    name: 'Beach',
    icon: 'waves',
    desc: 'Sand, surf, open sky.',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=82',
  },
  {
    id: 'desert',
    name: 'Desert',
    icon: 'sun',
    desc: 'Vast, stark, cinematic.',
    image: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?auto=format&fit=crop&w=1200&q=82',
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
        borderColor: hovered ? 'color-mix(in srgb, var(--accent-deep) 34%, var(--border))' : 'var(--border)',
        transform: hovered ? 'translateY(-3px)' : 'none',
        transition: 'transform var(--t-base), box-shadow var(--t-base), border-color var(--t-base)',
        boxShadow: hovered ? '0 18px 42px rgba(36, 28, 30, 0.12)' : 'var(--shadow-xs)',
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
            display: 'block',
            filter: 'saturate(0.9) contrast(0.96) brightness(0.96)',
            transform: hovered ? 'scale(1.035)' : 'scale(1)',
            transition: 'transform 320ms ease',
          }}
        />
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(16, 12, 18, 0.02) 36%, rgba(16, 12, 18, 0.42) 100%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          top: 14,
          left: 14,
          width: 38,
          height: 38,
          borderRadius: 12,
          background: 'rgba(250, 246, 242, 0.92)',
          color: 'var(--accent-deep)',
          border: '1px solid rgba(255,255,255,0.56)',
          boxShadow: '0 8px 22px rgba(20, 15, 18, 0.12)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Icon name={scene.icon} size={18} strokeWidth={1.55} />
        </div>
        <div style={{
          position: 'absolute',
          right: 14,
          bottom: 12,
          opacity: hovered ? 1 : 0,
          transform: hovered ? 'translateY(0)' : 'translateY(4px)',
          transition: 'opacity var(--t-base), transform var(--t-base)',
          color: '#fff',
          font: 'var(--text-xs)',
          fontWeight: 600,
          letterSpacing: '0.01em',
          textShadow: '0 1px 10px rgba(0,0,0,0.4)',
        }}>
          Open in Director →
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
        subtitle="Choose a setting and start building your world. Select a scene preset to open it in Thee Director."
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
