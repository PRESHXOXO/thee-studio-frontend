import React from 'react';
import { PageHeader } from '../components/navigation/PageHeader.jsx';
import { EmptyState } from '../components/feedback/EmptyState.jsx';

export function History() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <PageHeader
        title="History"
        subtitle="A log of your prompt runs and generation jobs."
      />
      <EmptyState
        icon="clock"
        title="No history yet"
        body="Your generation history will appear here after your first run."
      />
    </div>
  );
}
