import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ImageGenerator } from './ImageGenerator.jsx';
import { blankCreatorDraft } from '../lib/creatorIdentity.js';

const { repository } = vi.hoisted(() => ({
  repository: {
    saveCreatorProfile: vi.fn().mockResolvedValue({ id: '00000000-0000-0000-0000-000000000111' }),
    loadCreatorProfile: vi.fn().mockResolvedValue(null),
    uploadReferenceAsset: vi.fn(),
    removeReferenceAsset: vi.fn(),
  },
}));

vi.mock('../context/ProductionContext.jsx', () => ({
  useProduction: () => ({ repository }),
}));

vi.mock('../lib/cloudStore.js', () => ({
  persistCloudDocument: vi.fn().mockResolvedValue(undefined),
}));

describe('approved creator-builder interface', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    repository.saveCreatorProfile.mockResolvedValue({ id: '00000000-0000-0000-0000-000000000111' });
    repository.loadCreatorProfile.mockResolvedValue(null);
  });

  function validSavedDraft() {
    const draft = blankCreatorDraft();
    draft.name = 'Upload Fixture';
    draft.coreIdentity.adultAgeRange = '25-29';
    draft.coreIdentity.gender = 'Woman';
    draft.coreIdentity.skinTone = 'Medium';
    draft.coreIdentity.skinUndertone = 'Warm';
    draft.coreIdentity.distinctiveFeatures = 'None';
    draft.hairIdentity.style = 'Long waves';
    draft.hairIdentity.color = 'Natural black';
    draft.bodyIdentity.overallBuild = 'Athletic';
    localStorage.setItem('ts_creator_draft', JSON.stringify(draft));
    return draft;
  }

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
    expect(screen.getByRole('button', { name: /save & add headshot/i })).toBeInTheDocument();
    expect(screen.queryByText(/generate my creator/i)).not.toBeInTheDocument();
  });

  it('prevents duplicate draft creation and opens private headshot upload', async () => {
    validSavedDraft();
    let resolveSave;
    repository.saveCreatorProfile.mockImplementationOnce(() => new Promise(resolve => { resolveSave = resolve; }));
    render(<ImageGenerator />);
    const save = screen.getByRole('button', { name: /save & add headshot/i });
    fireEvent.click(save);
    fireEvent.click(save);
    expect(repository.saveCreatorProfile).toHaveBeenCalledTimes(1);
    resolveSave({ id: '00000000-0000-0000-0000-000000000111' });
    expect(await screen.findByRole('heading', { name: /add upload fixture's headshot/i })).toBeInTheDocument();
  });

  it('uploads one headshot and stores stable reference metadata', async () => {
    validSavedDraft();
    repository.uploadReferenceAsset.mockResolvedValue({
      id: 'reference-headshot',
      reference_type: 'headshot',
      storage_path: 'user/creator/references/headshot/face.jpg',
      original_filename: 'face.jpg',
      mime_type: 'image/jpeg',
      size_bytes: 5,
      is_canonical: true,
      signed_url: 'https://signed.invalid/face',
    });
    const user = userEvent.setup();
    const { container } = render(<ImageGenerator />);
    await user.click(screen.getByRole('button', { name: /save & add headshot/i }));
    await screen.findByRole('heading', { name: /add upload fixture's headshot/i });
    const input = container.querySelector('input[type="file"]');
    await user.upload(input, new File(['image'], 'face.jpg', { type: 'image/jpeg' }));
    await waitFor(() => expect(repository.uploadReferenceAsset).toHaveBeenCalledTimes(1));
    expect(repository.uploadReferenceAsset).toHaveBeenCalledWith(
      '00000000-0000-0000-0000-000000000111',
      'headshot',
      expect.objectContaining({ name: 'face.jpg', type: 'image/jpeg' }),
    );
    expect(await screen.findByAltText('Upload Fixture')).toHaveAttribute('src', 'https://signed.invalid/face');
    const saved = JSON.parse(localStorage.getItem('ts_creator_draft'));
    expect(saved.identityReferences.images[0].storagePath).toBe('user/creator/references/headshot/face.jpg');
    expect(saved.identityReferences.images[0].url).toBeUndefined();
  });

  it('restores saved profile fields and private references with fresh signed previews', async () => {
    repository.loadCreatorProfile.mockResolvedValue({
      creator: {
        id: '00000000-0000-0000-0000-000000000111',
        name: 'Restored Creator',
        profile_status: 'complete',
        profile_data: {
          coreIdentity: { naturalLanguageDescription: 'Restored identity details' },
          bodyIdentity: { bodyShape: 'Rectangle', overallBuild: 'Athletic' },
        },
      },
      identity: { identity_notes: 'Restored identity details' },
      references: [
        {
          id: 'head', reference_type: 'headshot', storage_path: 'user/creator/references/headshot/head.jpg',
          original_filename: 'head.jpg', mime_type: 'image/jpeg', size_bytes: 10,
          is_active: true, is_canonical: true, signed_url: 'https://signed.invalid/restored-head',
        },
        {
          id: 'body', reference_type: 'full_body', storage_path: 'user/creator/references/full_body/body.jpg',
          original_filename: 'body.jpg', mime_type: 'image/jpeg', size_bytes: 10,
          is_active: true, is_canonical: true, signed_url: 'https://signed.invalid/restored-body',
        },
      ],
    });
    const user = userEvent.setup();
    render(<ImageGenerator initialCreatorId="00000000-0000-0000-0000-000000000111" />);
    expect(await screen.findByDisplayValue('Restored Creator')).toBeInTheDocument();
    const firstLook = screen.getByText('First Look').closest('button');
    await waitFor(() => expect(firstLook).toBeEnabled());
    await user.click(firstLook);
    expect(await screen.findByAltText('Restored Creator')).toHaveAttribute('src', 'https://signed.invalid/restored-head');
    await user.click(screen.getByText('Body').closest('button'));
    expect(await screen.findByAltText('Full body reference')).toHaveAttribute('src', 'https://signed.invalid/restored-body');
  });
});
