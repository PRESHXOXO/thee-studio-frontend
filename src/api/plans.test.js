import { describe, expect, it, vi } from 'vitest';
import { fetchBillingCatalog } from './plans.js';

describe('customer billing catalog', () => {
  it('builds Studio Pro from the customer-visible database catalog', async () => {
    const results = {
      billing_plans: { data: [
        { id: 'pro-id', plan_key: 'studio_pro', display_name: 'Studio Pro', checkout_enabled: true },
      ], error: null },
      billing_plan_versions: { data: [
        { id: 'pv', plan_id: 'pro-id', version: 1, price_minor: 1900, currency: 'usd', billing_interval: 'month', included_credits: 1000, effective_from: '2026-01-01', effective_to: null },
      ], error: null },
    };

    const client = {
      from: vi.fn(table => table === 'billing_plans'
        ? { select: () => ({ eq: () => ({ eq: () => ({ eq: vi.fn().mockResolvedValue(results[table]) }) }) }) }
        : { select: vi.fn().mockResolvedValue(results[table]) }),
    };

    const catalog = await fetchBillingCatalog(client, new Date('2026-08-07T00:00:00Z'));

    expect(catalog.map(plan => [plan.plan_key, plan.display_name, plan.version.price_minor, plan.version.included_credits])).toEqual([
      ['studio_pro', 'Studio Pro', 1900, 1000],
    ]);
  });
});
