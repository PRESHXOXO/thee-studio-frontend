import { describe, expect, it, vi } from 'vitest';
import {
  CREATOR_REFERENCE_MAX_BYTES,
  creatorReferenceStoragePath,
  sanitizeCreatorReferenceFilename,
  signCreatorReference,
  removeCreatorReference,
  uploadCreatorReference,
  validateCreatorReferenceFile,
} from './creatorReferences.js';

const userId = '00000000-0000-0000-0000-000000000101';
const creatorId = '00000000-0000-0000-0000-000000000201';

function thenable(result, extras = {}) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    in: vi.fn(() => builder),
    order: vi.fn(() => builder),
    single: vi.fn(async () => result),
    maybeSingle: vi.fn(async () => result),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
    ...extras,
  };
  return builder;
}

describe('creator reference uploads', () => {
  it('accepts supported private image inputs', () => {
    expect(validateCreatorReferenceFile({ name: 'face.webp', type: 'image/webp', size: 100 })).toBeTruthy();
  });

  it('rejects unsupported MIME types', () => {
    expect(() => validateCreatorReferenceFile({ name: 'face.gif', type: 'image/gif', size: 100 }))
      .toThrow('Use a JPG, PNG, or WebP image.');
  });

  it('rejects oversized images', () => {
    expect(() => validateCreatorReferenceFile({ name: 'face.jpg', type: 'image/jpeg', size: CREATOR_REFERENCE_MAX_BYTES + 1 }))
      .toThrow('Image must be 15 MB or smaller.');
  });

  it('sanitizes names and creates owner/creator scoped stable paths', () => {
    expect(sanitizeCreatorReferenceFilename(' My Face (Final).JPG ', 'image/jpeg')).toBe('my-face-final-.jpg');
    expect(creatorReferenceStoragePath(
      userId,
      creatorId,
      'headshot',
      { name: 'Face.JPG', type: 'image/jpeg' },
      'upload-id',
    )).toBe(`${userId}/${creatorId}/references/headshot/upload-id-face.jpg`);
  });

  it('creates short-lived signed previews separately from canonical paths', async () => {
    const createSignedUrl = vi.fn().mockResolvedValue({ data: { signedUrl: 'https://signed.invalid/temporary' }, error: null });
    const db = { storage: { from: () => ({ createSignedUrl }) } };
    await expect(signCreatorReference(db, `${userId}/${creatorId}/references/headshot/a.jpg`, 600))
      .resolves.toBe('https://signed.invalid/temporary');
    expect(createSignedUrl).toHaveBeenCalledWith(`${userId}/${creatorId}/references/headshot/a.jpg`, 600);
  });

  it('rejects uploads after session expiry before touching storage', async () => {
    const upload = vi.fn();
    const db = {
      auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }) },
      storage: { from: () => ({ upload }) },
    };
    await expect(uploadCreatorReference(
      db,
      userId,
      creatorId,
      'headshot',
      new File(['image'], 'face.jpg', { type: 'image/jpeg' }),
    )).rejects.toThrow('Your session expired. Sign in again.');
    expect(upload).not.toHaveBeenCalled();
  });

  it('uploads one canonical headshot without returning a public URL', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 640, height: 960, close: vi.fn() }));
    const file = new File(['image'], 'Face.JPG', { type: 'image/jpeg' });
    const created = {
      id: 'reference-1', user_id: userId, creator_id: creatorId,
      reference_type: 'headshot', storage_path: `${userId}/${creatorId}/references/headshot/reference.jpg`,
      original_filename: file.name, mime_type: file.type, size_bytes: file.size,
      is_active: true, is_canonical: false,
    };
    const selected = { ...created, is_canonical: true };
    const creatorQuery = thenable({ data: { id: creatorId, user_id: userId }, error: null });
    const existingQuery = thenable({ data: [], error: null });
    const insertQuery = thenable({ data: created, error: null });
    const updateQuery = thenable({ data: selected, error: null });
    let referenceCall = 0;
    const upload = vi.fn().mockResolvedValue({ data: { path: created.storage_path }, error: null });
    const createSignedUrl = vi.fn().mockResolvedValue({ data: { signedUrl: 'https://signed.invalid/headshot' }, error: null });
    const remove = vi.fn().mockResolvedValue({ data: [], error: null });
    const db = {
      auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: userId } } }, error: null }) },
      from: vi.fn(table => {
        if (table === 'creators') return creatorQuery;
        referenceCall += 1;
        if (referenceCall === 1) return existingQuery;
        if (referenceCall === 2) return { insert: vi.fn(() => insertQuery) };
        return { update: vi.fn(() => updateQuery) };
      }),
      storage: { from: () => ({ upload, createSignedUrl, remove }) },
    };

    const result = await uploadCreatorReference(db, userId, creatorId, 'headshot', file);
    expect(result.is_canonical).toBe(true);
    expect(result.signed_url).toBe('https://signed.invalid/headshot');
    expect(result.publicUrl).toBeUndefined();
    expect(upload).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it('archives then removes an owned private reference', async () => {
    const reference = {
      id: 'reference-remove', user_id: userId, creator_id: creatorId,
      storage_path: `${userId}/${creatorId}/references/additional/remove.jpg`,
    };
    const referenceQuery = thenable({ data: reference, error: null });
    const creatorQuery = thenable({ data: { id: creatorId, user_id: userId }, error: null });
    const updateQuery = thenable({ data: null, error: null });
    let referenceCall = 0;
    const remove = vi.fn().mockResolvedValue({ data: [], error: null });
    const db = {
      auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: userId } } }, error: null }) },
      from: vi.fn(table => {
        if (table === 'creators') return creatorQuery;
        referenceCall += 1;
        if (referenceCall === 1) return referenceQuery;
        return { update: vi.fn(() => updateQuery) };
      }),
      storage: { from: () => ({ remove }) },
    };
    await expect(removeCreatorReference(db, userId, reference.id)).resolves.toBe(true);
    expect(remove).toHaveBeenCalledWith([reference.storage_path]);
  });
});
