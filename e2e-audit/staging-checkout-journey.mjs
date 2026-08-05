import { chromium } from '@playwright/test';

const baseUrl = process.env.STAGING_BASE_URL;
const email = process.env.STAGING_CHECKOUT_EMAIL;
const password = process.env.STAGING_CHECKOUT_PASSWORD;
if (!baseUrl || !email || !password) throw new Error('Required staging journey environment is missing.');

let stage = 'launch';
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext();
  const page = await context.newPage();

  stage = 'login';
  await page.goto(`${baseUrl}/studio`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();

  stage = 'pricing';
  await page.getByText('Access required', { exact: true }).waitFor({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Choose Studio Pro' }).click();
  await page.waitForURL(url => url.hostname === 'checkout.stripe.com', { timeout: 30_000 });

  async function fillInAnyFrame(selectors, value) {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      for (const frame of page.frames()) {
        for (const selector of selectors) {
          const field = frame.locator(selector).first();
          if (await field.count() && await field.isVisible().catch(() => false)) {
            await field.fill(value);
            return;
          }
        }
      }
      await page.waitForTimeout(500);
    }
    throw new Error(`Stripe field was unavailable: ${selectors[0]}`);
  }

  stage = 'test-mode payment';
  await fillInAnyFrame(['input[name="cardNumber"]', 'input[autocomplete="cc-number"]', 'input[aria-label*="Card number" i]'], '4242424242424242');
  await fillInAnyFrame(['input[name="cardExpiry"]', 'input[autocomplete="cc-exp"]', 'input[aria-label*="expiration" i]'], '1234');
  await fillInAnyFrame(['input[name="cardCvc"]', 'input[autocomplete="cc-csc"]', 'input[aria-label*="security code" i]', 'input[aria-label*="CVC" i]'], '123');

  for (const [selectors, value] of [
    [['input[name="billingName"]', 'input[autocomplete="name"]'], 'Staging Checkout Test'],
    [['input[name="billingPostalCode"]', 'input[autocomplete="postal-code"]'], '10001'],
  ]) {
    try { await fillInAnyFrame(selectors, value); } catch { /* optional in the active Checkout locale */ }
  }

  const submit = page.getByRole('button', { name: /subscribe|pay|complete order|start trial/i }).last();
  await submit.click();

  stage = 'webhook access';
  await page.waitForURL(url => url.hostname !== 'checkout.stripe.com', { timeout: 60_000 });
  await page.getByText('Connected', { exact: true }).first().waitFor({ timeout: 45_000 });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByText('Connected', { exact: true }).first().waitFor({ timeout: 30_000 });
  await page.getByText('Studio', { exact: true }).first().waitFor();

  console.log('STAGING_CHECKOUT_JOURNEY=passed');
  console.log('UNPAID_PRICING_STATE=passed');
  console.log('STRIPE_TEST_CHECKOUT=passed');
  console.log('PAID_ACCESS_AFTER_REFRESH=passed');
} catch (error) {
  const safe = String(error?.message || error)
    .replaceAll(email, '[email]')
    .replace(/https?:\/\/\S+/g, '[url]')
    .slice(0, 1000);
  console.error(`STAGING_CHECKOUT_JOURNEY=failed stage=${stage} error=${safe}`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
