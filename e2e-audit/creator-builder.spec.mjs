import { test, expect } from '@playwright/test';

const PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEAQH/6ZcmWQAAAABJRU5ErkJggg==';

async function mockGeneration(page, { delayMs = 250 } = {}) {
  let variationCalls = 0;

  await page.route('**/config', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ components: [] }),
  }));

  await page.route('**/gradio_api/run/**', async route => {
    const endpoint = new URL(route.request().url()).pathname.split('/').pop();
    if (endpoint === 'character_seed_generate') {
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [JSON.stringify({ image: PIXEL, faceAnchor: 'test-anchor' })] }),
      });
    }
    if (endpoint === 'character_variation_shot') {
      variationCalls += 1;
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [JSON.stringify({ image: PIXEL })] }),
      });
    }
    return route.abort();
  });

  return () => variationCalls;
}

// Fills all 9 Step 1 required fields in DOM order:
// adultAgeRange, gender, distinctiveFeatures, skinTone, skinUndertone,
// hairStyle, hairColor, overallBuild.
async function fillBaseStep(page, name) {
  await page.getByPlaceholder(/Angel, Maya, Jade/).fill(name);
  const selects = page.locator('select');
  await selects.nth(0).selectOption('25-29');
  await selects.nth(1).selectOption('Woman');
  await selects.nth(2).selectOption('deep dimples when smiling');
  await selects.nth(3).selectOption('warm caramel with honey undertones');
  await selects.nth(4).selectOption('Warm');
  await selects.nth(5).selectOption({ index: 1 }); // first real hair style option
  await selects.nth(6).selectOption('burgundy wine');
  await selects.nth(7).selectOption({ index: 1 }); // first real build option
}

test('full 5-step wizard generates, locks, and Save Creator persists everywhere', async ({ page }) => {
  page.on('pageerror', error => console.error(`PAGE ERROR: ${error.stack || error.message}`));
  const getVariationCalls = await mockGeneration(page, { delayMs: 200 });
  await page.addInitScript(pixel => {
    localStorage.setItem('ts_characters', JSON.stringify([{
      id: 'seeded', name: 'Existing Creator', image: pixel, refImages: [pixel], fields: {},
    }]));
    localStorage.setItem('ts_library', JSON.stringify([{ id: 'seed-image', url: pixel, savedAt: new Date().toISOString() }]));
  }, PIXEL);

  await page.goto('http://localhost:3000/studio/');
  await page.getByRole('button', { name: /Cast/ }).click();
  await page.getByRole('button', { name: /New Creator/ }).first().click();

  // Step 1 — Base
  await fillBaseStep(page, 'Regression Creator');
  await page.getByRole('button', { name: 'Generate My Creator' }).click();

  // Step 2 — First Look
  await expect(page.getByText('Meet Regression Creator')).toBeVisible();
  await page.getByRole('button', { name: 'Approve This Face' }).click();

  // Step 3 — Identity Lock (four variation shots generate automatically)
  await expect(page.getByText("Let's lock Regression Creator")).toBeVisible();
  await expect.poll(getVariationCalls, { timeout: 15000 }).toBe(4);
  await page.locator('button[title="Use as primary face"]').first().click();
  await page.getByRole('button', { name: 'Approve All' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();

  // Lock success screen
  await expect(page.getByText('Regression Creator is officially locked.')).toBeVisible();
  await page.getByRole('button', { name: 'Skip to Brand' }).click();

  // Step 5 — Brand, then save
  await expect(page.getByText("Build Regression Creator's world")).toBeVisible();
  await page.getByRole('button', { name: 'Save Creator' }).click();

  await expect(page.getByRole('heading', { name: 'Cast' })).toBeVisible();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('ts_characters') || '[]'));
  expect(stored).toHaveLength(2);
  expect(stored[1].name).toBe('Regression Creator');
  expect(stored[1].refImages).toHaveLength(5);
  expect(stored[1].locked).toBe(true);
  expect(stored[1].status).toBe('identity_locked');
  expect(stored[1].coreIdentity.adultAgeRange).toBe('25-29');
  expect(await page.evaluate(() => localStorage.getItem('ts_active_character_id'))).toBe(stored[1].id);
  expect(await page.evaluate(() => localStorage.getItem('ts_creator_draft'))).toBeNull();
});

test('storage failure at final save stays in Builder and shows a recoverable error', async ({ page }) => {
  const getVariationCalls = await mockGeneration(page, { delayMs: 10 });
  await page.addInitScript(pixel => {
    localStorage.setItem('ts_characters', JSON.stringify([{
      id: 'seeded', name: 'Existing Creator', image: pixel, refImages: [pixel], fields: {},
    }]));
  }, PIXEL);

  await page.goto('http://localhost:3000/studio/');
  await page.getByRole('button', { name: /New Creator/ }).first().click();

  await fillBaseStep(page, 'Unsaved Creator');
  await page.getByRole('button', { name: 'Generate My Creator' }).click();
  await expect(page.getByText('Meet Unsaved Creator')).toBeVisible();
  await page.getByRole('button', { name: 'Approve This Face' }).click();
  await expect.poll(getVariationCalls, { timeout: 15000 }).toBe(4);
  await page.locator('button[title="Use as primary face"]').first().click();
  await page.getByRole('button', { name: 'Approve All' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Skip to Brand' }).click();

  await page.evaluate(() => {
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function setItem(key, value) {
      if (key === 'ts_characters' && JSON.parse(value).length > 1) {
        throw new DOMException('Storage quota exceeded', 'QuotaExceededError');
      }
      return originalSetItem.call(this, key, value);
    };
  });
  await page.getByRole('button', { name: 'Save Creator' }).click();

  await expect(page.getByText(/Save failed: browser storage is full/)).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ts_characters') || '[]'))).toHaveLength(1);
});
