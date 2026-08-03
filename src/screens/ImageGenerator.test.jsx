import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ImageGenerator } from './ImageGenerator.jsx';

const mocks = vi.hoisted(() => ({
  generate: vi.fn(),
  save: vi.fn().mockResolvedValue({}),
}));

vi.mock('../api/stagingGeneration.js', () => ({ generateStagingStill: mocks.generate }));
vi.mock('../lib/supabase.js', () => ({ supabase: { configured: true } }));
vi.mock('../lib/library.js', () => ({ saveToLibrary: mocks.save }));

describe('ImageGenerator staging action', () => {
  beforeEach(() => {
    mocks.generate.mockReset();
    mocks.save.mockClear();
  });

  it('locks during submission and ignores duplicate clicks', async () => {
    let resolve;
    mocks.generate.mockReturnValue(new Promise(done => { resolve = done; }));
    const user = userEvent.setup();
    render(<ImageGenerator />);
    await user.type(screen.getByPlaceholderText(/Describe your shot/i), 'A ceramic cup');
    const button = screen.getByRole('button', { name: /^Generate$/i });
    await user.dblClick(button);
    expect(mocks.generate).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();
    await act(async () => resolve({
      status: 'Generation complete · usage tracked',
      images: [{ storagePath: 'user-1/stills/image.webp', signedUrl: 'https://signed.invalid/image', metadata: {} }],
    }));
    expect(await screen.findByAltText('Generated 1')).toHaveAttribute('src', 'https://signed.invalid/image');
    await waitFor(() => expect(button).not.toBeDisabled());
  });

  it('shows provider failure without sending another request', async () => {
    mocks.generate.mockRejectedValue(new Error('Generation could not be completed. No retry was sent.'));
    const user = userEvent.setup();
    render(<ImageGenerator />);
    await user.type(screen.getByPlaceholderText(/Describe your shot/i), 'A ceramic cup');
    await user.click(screen.getByRole('button', { name: /^Generate$/i }));
    expect(await screen.findByText('Generation could not be completed. No retry was sent.')).toBeInTheDocument();
    expect(mocks.generate).toHaveBeenCalledTimes(1);
  });
});
