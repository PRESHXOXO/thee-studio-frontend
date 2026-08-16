import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GenerationProgress } from './GenerationProgress.jsx';

describe('GenerationProgress batch truth', () => {
  it('uses settled slot count instead of fake timed 98% for multi-image batches', () => {
    render(<GenerationProgress active batchSize={5} completedCount={1} mode="scene" />);

    expect(screen.getByRole('status')).toHaveAccessibleName('Generating sequence… · 1 of 5 slots finished');
    expect(screen.getByText('20%')).toBeInTheDocument();
  });
});
