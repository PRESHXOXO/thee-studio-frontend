import React from 'react';
import { PageHeader } from '../components/navigation/PageHeader.jsx';
import { Card } from '../components/surfaces/Card.jsx';
import { EmptyState } from '../components/feedback/EmptyState.jsx';
import { Icon } from '../components/core/Icon.jsx';

const SCENE_DATA = [
  { id: 'yacht', name: 'Yacht', icon: 'anchor', desc: 'Luxury deck, open water, golden light.' },
  { id: 'penthouse', name: 'Penthouse', icon: 'building-2', desc: 'Floor-to-ceiling views, high-end interiors.' },
  { id: 'jet', name: 'Private Jet', icon: 'plane', desc: 'Intimate cabin, clouds outside.' },
  { id: 'rooftop', name: 'Rooftop', icon: 'sunset', desc: 'City skyline, dusk light.' },
  { id: 'poolside', name: 'Poolside', icon: 'droplets', desc: 'Crystal water, summer mood.' },
  { id: 'studio', name: 'Studio', icon: 'camera', desc: 'Clean backdrop, controlled lighting.' },
  { id: 'hotel', name: 'Boutique Hotel', icon: 'bed', desc: 'Curated luxury interiors.' },
  { id: 'gallery', name: 'Art Gallery', icon: 'frame', desc: 'White walls, statement art.' },
  { id: 'nightclub', name: 'Night Club', icon: 'music', desc: 'Low light, color, energy.' },
  { id: 'garden', name: 'Garden', icon: 'flower-2', desc: 'Natural, lush, organic.' },
  { id: 'beach', name: 'Beach', icon: 'waves', desc: 'Sand, surf, open sky.' },
  { id: 'desert', name: 'Desert', icon: 'sun', desc: 'Vast, stark, cinematic.' },
];

function SceneCard({ scene }) {
  return (
    <Card style={{ display: 'flex', flexDirection: 'column', gap: 12, cursor: 'default' }}>
      <div style={{
        width: 40, height: 40, borderRadius: 'var(--radius)',
        background: 'var(--rose-deep)', color: 'var(--accent-deep)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name={scene.icon} size={20} strokeWidth={1.5} />
      </div>
      <div>
        <div style={{ font: 'var(--display-sm)', color: 'var(--text-strong)' }}>{scene.name}</div>
        <div style={{ font: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 4 }}>{scene.desc}</div>
      </div>
    </Card>
  );
}

export function Scenes() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <PageHeader
        title="Scenes"
        subtitle="Browse available scene presets. Scenes are used by Thee Director to craft your prompts."
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
        {SCENE_DATA.map(scene => (
          <SceneCard key={scene.id} scene={scene} />
        ))}
      </div>
    </div>
  );
}
