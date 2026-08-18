import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Plans } from './Plans.jsx';

const state = vi.hoisted(() => ({ auth: {}, access: {}, catalog: [], checkout: vi.fn() }));
vi.mock('../context/AuthContext.jsx', () => ({ useAuth: () => state.auth }));
vi.mock('../api/access.js', () => ({ useStudioAccess: () => state.access }));
vi.mock('../api/plans.js', () => ({
  fetchBillingCatalog: () => Promise.resolve(state.catalog),
}));
vi.mock('../api/checkout.js', () => ({ createCheckoutSession: (...args) => state.checkout(...args) }));

const free = {
  id: 'free',
  plan_key: 'free',
  display_name: 'Free',
  checkout_enabled: false,
  version: { price_minor: 0, currency: 'usd', billing_interval: 'none', included_credits: 0 },
};
const pro = {
  id: 'pro',
  plan_key: 'studio_pro',
  display_name: 'Studio Pro',
  checkout_enabled: true,
  version: { price_minor: 1900, currency: 'usd', billing_interval: 'month', included_credits: 1000 },
};

describe('plan selection', () => {
  beforeEach(() => {
    state.auth = { client: {}, session: { raw: {} } };
    state.access = { access: { allowed: false, account_type: 'customer', role: 'user' }, loading: false };
    state.catalog = [free, pro];
    state.checkout = vi.fn().mockResolvedValue({ checkoutUrl: 'https://checkout.stripe.com/test' });
  });

  it('does not expose the Free plan even if stale catalog data contains it', async () => {
    render(<MemoryRouter><Plans /></MemoryRouter>);
    expect(await screen.findByRole('button', { name: 'Subscribe to Studio Pro' })).toBeInTheDocument();
    expect(screen.queryByText(/^Free$/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Free/i })).not.toBeInTheDocument();
  });

  it('starts authenticated Stripe Checkout for Studio Pro', async () => {
    render(<MemoryRouter><Plans /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Subscribe to Studio Pro' }));
    await waitFor(() => expect(state.checkout).toHaveBeenCalledTimes(1));
  });

  it('bypasses customer plan selection for the internal owner', async () => {
    state.access = { access: { allowed: true, account_type: 'internal', role: 'owner' }, loading: false };
    render(<MemoryRouter><Plans /></MemoryRouter>);
    expect(await screen.findByText(/No customer plan or checkout is required/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Subscribe to Studio Pro' })).not.toBeInTheDocument();
  });
});
