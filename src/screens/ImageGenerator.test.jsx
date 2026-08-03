import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ImageGenerator } from './ImageGenerator.jsx';

vi.mock('../lib/cloudStore.js', () => ({
  persistCloudDocument: vi.fn().mockResolvedValue(undefined),
}));

describe('approved creator-builder interface', () => {
  beforeEach(() => localStorage.clear());

  it('preserves the approved New Creator screen', () => {
    render(<ImageGenerator />);
    expect(screen.getByText('New Creator')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Build with Thee Studio' })).toBeInTheDocument();
    expect(screen.getByText('Base')).toBeInTheDocument();
    expect(screen.getByText('First Look')).toBeInTheDocument();
    expect(screen.getByText('Identity Lock')).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
    expect(screen.getByText('Brand')).toBeInTheDocument();
  });

  it('starts on the approved base-identity form', () => {
    render(<ImageGenerator />);
    expect(screen.getByText(/describe them in your own words/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate my creator/i })).toBeInTheDocument();
  });
});
