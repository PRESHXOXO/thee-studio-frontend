import React from 'react';
import { PageHeader } from '../components/navigation/PageHeader.jsx';
import { EmptyState } from '../components/feedback/EmptyState.jsx';
import { Button } from '../components/core/Button.jsx';

export function Campaigns() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <PageHeader
        title="Campaigns"
        subtitle="Organize your shoots into campaigns. Group related generations and track progress."
        actions={<Button variant="primary" onClick={() => {}}>New Campaign</Button>}
      />
      <EmptyState
        icon="layout-grid"
        title="No campaigns yet"
        body="Create a campaign to start organizing your shoots by theme, character, or project."
        cta="New Campaign"
        onCta={() => {}}
      />
    </div>
  );
}
