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

test('single approval click generates and Save Creator persists everywhere', async ({ page }) => {
  page.on('pageerror', error => console.error(`PAGE ERROR: ${error.stack || error.message}`));
  const getVariationCalls = await mockGeneration(page, { delayMs: 500 });
  await page.addInitScript(pixel => {
    localStorage.setItem('ts_characters', JSON.stringify([{
      id: 'seeded',
      name: 'New Creator',
      image: pixel,
      refImages: [pixel],
      fields: {},
    }]));
    localStorage.setItem('ts_library', JSON.stringify([{
      id: 'seed-image',
      url: pixel,
      savedAt: new Date().toISOString(),
    }]));
  }, PIXEL);

  await page.goto('http://localhost:3000/studio/');
  await page.getByRole('button', { name: /New Creator Build a new creator/ }).click();
  await page.getByPlaceholder(/Angel, Maya, Jade/).fill('Regression Creator');
  await page.getByRole('button', { name: 'Generate Headshot' }).click();

  const progress = page.getByRole('progressbar', { name: 'Creator generation progress' });
  const firstProgress = Number(await progress.getAttribute('aria-valuenow'));
  await page.waitForTimeout(300);
  const laterProgress = Number(await progress.getAttribute('aria-valuenow'));
  expect(laterProgress).toBeGreaterThan(firstProgress);

  await page.getByRole('button', { name: /That's them/ }).click();
  await expect(page.getByRole('button', { name: /Generating Bust Up/ })).toBeDisabled();
  await expect.poll(getVariationCalls).toBe(4);
  await expect(page.getByRole('button', { name: 'Save Creator' })).toBeEnabled();
  await page.getByRole('button', { name: 'Save Creator' }).click();

  await expect(page.getByText('Regression Creator', { exact: true }).first()).toBeVisible();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('ts_characters') || '[]'));
  expect(stored).toHaveLength(2);
  expect(stored[1].name).toBe('Regression Creator');
  expect(stored[1].refImages).toHaveLength(5);
  expect(await page.evaluate(() => localStorage.getItem('ts_active_character_id'))).toBe(stored[1].id);

  await page.getByRole('navigation').getByRole('button', { name: 'Studio', exact: true }).click();
  await expect(page.getByText('2', { exact: true })).toBeVisible();
  await expect(page.getByText('creators', { exact: true })).toBeVisible();
});

test('storage failure stays in Builder and shows a recoverable error', async ({ page }) => {
  await mockGeneration(page, { delayMs: 10 });
  await page.addInitScript(pixel => {
    localStorage.setItem('ts_characters', JSON.stringify([{
      id: 'seeded',
      name: 'Existing Creator',
      image: pixel,
      refImages: [pixel],
      fields: {},
    }]));
  }, PIXEL);

  await page.goto('http://localhost:3000/studio/');
  await page.getByRole('button', { name: /New Creator Build a new creator/ }).click();
  await page.getByPlaceholder(/Angel, Maya, Jade/).fill('Unsaved Creator');
  await page.getByRole('button', { name: 'Generate Headshot' }).click();
  await page.getByRole('button', { name: /That's them/ }).click();
  await expect(page.getByRole('button', { name: 'Save Creator' })).toBeEnabled();

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
  await expect(page.getByRole('heading', { name: 'New Creator' })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ts_characters') || '[]'))).toHaveLength(1);
});
