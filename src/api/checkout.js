import { supabase } from '../lib/supabase.js';

export function checkoutIdempotencyKey() {
  return `checkout_${crypto.randomUUID().replaceAll('-', '')}`;
}

export async function createCheckoutSession(client = supabase, key = checkoutIdempotencyKey()) {
  if (!client) throw new Error('Staging connection is not configured.');
  const { data, error } = await client.functions.invoke('thee-create-checkout', {
    body: {},
    headers: { 'idempotency-key': key },
  });
  if (error) throw new Error('Checkout could not be started.');
  const checkoutUrl = data?.checkoutUrl;
  if (typeof checkoutUrl !== 'string' || !checkoutUrl.startsWith('https://checkout.stripe.com/')) {
    throw new Error('Checkout returned an invalid destination.');
  }
  return { checkoutUrl, reused: data?.reused === true };
}
