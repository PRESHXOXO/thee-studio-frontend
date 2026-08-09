import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';

const invoke = vi.fn();
let mockUrl = 'https://qkrmkoixgznvxbcljmsx.supabase.co';
let mockAdminAllowed = true;

vi.mock('../../lib/supabase.js', async () => {
  const actual = await vi.importActual('../../lib/supabase.js');
  return {
    ...actual,
    hasSupabaseConfig: () => true,
    isStagingSupabaseProject: () => mockUrl.includes('qkrmkoixgznvxbcljmsx'),
    getSupabase: () => ({
      functions: { invoke },
      storage: { from: () => ({ createSignedUrl: vi.fn(async () => ({ data: { signedUrl: 'https://signed.example/x.png' }, error: null })) }) },
    }),
  };
});

vi.mock('../../api/adminTelemetry.js', () => ({
  fetchAdminAccess: vi.fn(async () => ({ allowed: mockAdminAllowed, role: mockAdminAllowed ? 'owner' : null })),
}));

const { ShootBuilder } = await import('./ShootBuilder.jsx');

const PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEAQH/6ZcmWQAAAABJRU5ErkJggg==';

const CREATOR = {
  id: 1786164668018,
  cloudCreatorId: '75ec949c-6241-4739-ba81-fa561f3137cb',
  name: 'Sienna',
  refImages: [PIXEL],
  fields: {},
};

beforeEach(() => {
  invoke.mockReset();
  mockUrl = 'https://qkrmkoixgznvxbcljmsx.supabase.co';
  mockAdminAllowed = true;
  cleanup();
});

describe('ShootBuilder — owner-only staging reference preflight', () => {
  it('shows "Check References" for a staging owner', async () => {
    render(<ShootBuilder creator={CREATOR} layout="stacked" />);
    await waitFor(() => expect(screen.getByText(/Check References/i)).toBeTruthy());
  });

  it('does not show the control for a normal (non-admin) user, even on staging', async () => {
    mockAdminAllowed = false;
    render(<ShootBuilder creator={CREATOR} layout="stacked" />);
    await waitFor(() => expect(invoke).not.toHaveBeenCalled()); // let the admin-access effect settle
    expect(screen.queryByText(/Check References/i)).toBeNull();
  });

  it('does not show the control when not wired to the staging Supabase project (e.g. production)', async () => {
    mockUrl = 'https://owxxetqniuayhzktewho.supabase.co';
    render(<ShootBuilder creator={CREATOR} layout="stacked" />);
    // Give any async effects a tick, then assert it never appears.
    await new Promise(r => setTimeout(r, 10));
    expect(screen.queryByText(/Check References/i)).toBeNull();
  });

  it('clicking Check References calls only cast-reference-preflight — never cast-quick-shoot or any provider', async () => {
    invoke.mockResolvedValueOnce({
      data: {
        references: [{ index: 0, mime: 'image/png', byteLength: 68, width: 1, height: 1, valid: true, reason: null }],
        dedupedCount: 1, cappedCount: 1, allValid: true,
      },
      error: null,
    });
    const originalFetch = global.fetch;
    global.fetch = vi.fn(() => { throw new Error('unexpected network fetch'); });

    render(<ShootBuilder creator={CREATOR} layout="stacked" />);
    const button = await screen.findByText(/Check References/i);
    fireEvent.click(button);

    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));
    expect(invoke).toHaveBeenCalledWith('cast-reference-preflight', expect.objectContaining({
      body: expect.objectContaining({ references: [PIXEL] }),
    }));
    const calledFunctionNames = invoke.mock.calls.map(call => call[0]);
    expect(calledFunctionNames).not.toContain('cast-quick-shoot');
    expect(global.fetch).not.toHaveBeenCalled();

    global.fetch = originalFetch;
  });

  it('renders sanitized valid-reference metadata (MIME/dimensions/size), never base64', async () => {
    invoke.mockResolvedValueOnce({
      data: {
        references: [{ index: 0, mime: 'image/png', byteLength: 68, width: 1, height: 1, valid: true, reason: null }],
        dedupedCount: 1, cappedCount: 1, allValid: true,
      },
      error: null,
    });
    render(<ShootBuilder creator={CREATOR} layout="stacked" />);
    fireEvent.click(await screen.findByText(/Check References/i));
    await waitFor(() => expect(screen.getByText(/image\/png/)).toBeTruthy());
    const rendered = document.body.textContent;
    expect(rendered).not.toContain('base64');
    expect(rendered).not.toContain(PIXEL.slice(30));
  });

  it('renders a sanitized failure reason for an invalid reference, never raw JSON error dumps', async () => {
    invoke.mockResolvedValueOnce({
      data: {
        references: [{ index: 0, mime: null, byteLength: 0, width: null, height: null, valid: false, reason: 'invalid_data_url_prefix' }],
        dedupedCount: 0, cappedCount: 0, allValid: false,
      },
      error: null,
    });
    render(<ShootBuilder creator={CREATOR} layout="stacked" />);
    fireEvent.click(await screen.findByText(/Check References/i));
    await waitFor(() => expect(screen.getByText(/invalid_data_url_prefix/)).toBeTruthy());
  });
});
