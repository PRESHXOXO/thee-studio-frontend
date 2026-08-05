import { describe, expect, it, vi } from 'vitest';
import { checkoutIdempotencyKey, createCheckoutSession } from './checkout.js';

describe('Stripe Checkout client', () => {
  it('creates an authenticated function request with an idempotency key', async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: { checkoutUrl: 'https://checkout.stripe.com/c/pay/test', reused: false },
      error: null,
    });
    await expect(createCheckoutSession({ functions: { invoke } }, 'checkout_1234567890abcdef')).resolves.toEqual({
      checkoutUrl: 'https://checkout.stripe.com/c/pay/test', reused: false,
    });
    expect(invoke).toHaveBeenCalledWith('thee-create-checkout', {
      body: {}, headers: { 'idempotency-key': 'checkout_1234567890abcdef' },
    });
  });

  it('generates a valid unique key and rejects non-Stripe destinations', async () => {
    expect(checkoutIdempotencyKey()).toMatch(/^checkout_[a-f0-9]{32}$/);
    const client = { functions: { invoke: vi.fn().mockResolvedValue({ data: { checkoutUrl: 'https://example.com' }, error: null }) } };
    await expect(createCheckoutSession(client)).rejects.toThrow('invalid destination');
  });

  it('returns one safe failure and does not retry', async () => {
    const invoke = vi.fn().mockResolvedValue({ data: null, error: new Error('secret detail') });
    await expect(createCheckoutSession({ functions: { invoke } })).rejects.toThrow('could not be started');
    expect(invoke).toHaveBeenCalledTimes(1);
  });
});
