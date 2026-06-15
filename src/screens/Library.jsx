import React from 'react';
import { PageHeader } from '../components/navigation/PageHeader.jsx';
import { EmptyState } from '../components/feedback/EmptyState.jsx';

export function Library() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 'var(--content-max)', margin: '0 auto' }}>
      <PageHeader
        title="Library"
        subtitle="All your generated images in one place. Browse, filter, and download."
      />
      <EmptyState
        icon="images"
        title="Library is empty"
        body="Generated images will appear here. Head to the Image Generator to create your first image."
      />
    </div>
  );
}
