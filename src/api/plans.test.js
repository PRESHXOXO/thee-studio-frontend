import { describe, expect, it, vi } from 'vitest';
import { fetchBillingCatalog, selectFreePlan } from './plans.js';

describe('customer billing catalog', () => {
  it('builds tiers from customer-visible database catalog data', async () => {
    const results = {
      billing_plans: { data: [
        { id: 'free-id', plan_key: 'free', display_name: 'Free', checkout_enabled: false },
        { id: 'pro-id', plan_key: 'studio_pro', display_name: 'Studio Pro', checkout_enabled: true },
      ], error: null },
      billing_plan_versions: { data: [
        { id: 'fv', plan_id: 'free-id', version: 1, price_minor: 0, currency: 'usd', billing_interval: 'none', included_credits: 0, effective_from: '2026-01-01', effective_to: null },
        { id: 'pv', plan_id: 'pro-id', version: 1, price_minor: 1900, currency: 'usd', billing_interval: 'month', included_credits: 1000, effective_from: '2026-01-01', effective_to: null },
      ], error: null },
    };
    const client = { from: vi.fn(table => ({ select: () => ({ eq: () => ({ eq: () => ({ eq: vi.fn().mockResolvedValue(results[table]) }) }) }) })) };
    // Version query has no filters; model its direct thenable separately.
    client.from = vi.fn(table => table === 'billing_plans'
      ? { select: () => ({ eq: () => ({ eq: () => ({ eq: vi.fn().mockResolvedValue(results[table]) }) }) }) }
      : { select: vi.fn().mockResolvedValue(results[table]) });
    const catalog = await fetchBillingCatalog(client, new Date('2026-08-07T00:00:00Z'));
    expect(catalog.map(plan => [plan.display_name, plan.version.price_minor, plan.version.included_credits])).toEqual([
      ['Free', 0, 0], ['Studio Pro', 1900, 1000],
    ]);
  });

  it('selects Free through the authenticated server RPC', async () => {
    const client = { rpc: vi.fn().mockResolvedValue({ data: { allowed: true, reason: 'free_plan' }, error: null }) };
    await expect(selectFreePlan(client)).resolves.toMatchObject({ reason: 'free_plan' });
    expect(client.rpc).toHaveBeenCalledWith('select_free_plan');
  });
});
