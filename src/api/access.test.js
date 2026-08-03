import { describe, expect, it, vi } from 'vitest';
import { accessBadgeLabel, accessView, fetchStudioAccess } from './access.js';

const owner = {
  allowed: true,
  reason: 'internal_entitlement',
  role: 'owner',
  account_type: 'internal',
  plan_key: 'internal_owner',
  billing_exempt: true,
  credit_deduction_enabled: false,
  usage_tracking_enabled: true,
  all_features: true,
  admin_access_enabled: true,
  enforcement_enabled: false,
};

const client = value => ({ functions: { invoke: vi.fn().mockResolvedValue(value) } });
const deniedError = (status, payload) => ({ context: new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json' } }) });

describe('studio access', () => {
  it('accepts owner access from backend', async () => {
    const current = client({ data: owner, error: null });
    await expect(fetchStudioAccess(current)).resolves.toMatchObject(owner);
    expect(current.functions.invoke).toHaveBeenCalledWith('thee-access', { body: { feature: 'studio' } });
  });

  it('allows enforcement_disabled when allowed is true', async () => {
    const result = await fetchStudioAccess(client({ data: { ...owner, reason: 'enforcement_disabled' }, error: null }));
    expect(accessView(result).state).toBe('allowed');
  });

  it.each([
    ['pricing_required', 'pricing_required'],
    ['feature_not_entitled', 'feature_not_entitled'],
    ['account_suspended', 'suspended'],
    ['access_denied', 'denied'],
  ])('maps %s denial safely', async (reason, state) => {
    const result = await fetchStudioAccess(client({ data: null, error: deniedError(reason === 'pricing_required' ? 402 : 403, { allowed: false, reason }) }));
    expect(accessView(result).state).toBe(state);
  });

  it('maps access network failures without exposing internals', async () => {
    await expect(fetchStudioAccess(client({ data: null, error: new Error('socket detail') }))).rejects.toThrow('access service is unavailable');
    expect(accessView(null, 'network_failure').state).toBe('network_failure');
  });

  it('shows owner-safe usage language instead of zero-credit denial', () => {
    expect(accessBadgeLabel(owner)).toBe('Owner access · usage tracked');
    expect(accessBadgeLabel(owner)).not.toContain('0 credits');
  });
});
