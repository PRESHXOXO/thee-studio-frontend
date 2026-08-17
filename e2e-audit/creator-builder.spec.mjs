import { test, expect } from '@playwright/test';

const PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEAQH/6ZcmWQAAAABJRU5ErkJggg==';
const PIXEL_BUFFER = Buffer.from(PIXEL.split(',')[1], 'base64');

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

// Picks an option from the custom combobox at index `idx`: click its trigger,
// then click the option (in the document.body portal) by visible label.
async function pickCombo(page, idx, optionLabel) {
  await page.locator('[role="combobox"]').nth(idx).click();
  await page.getByRole('option', { name: optionLabel, exact: true }).first().click();
}

// Fills all 9 Step 1 required fields in DOM order:
// adultAgeRange, gender, distinctiveFeatures, skinTone, skinUndertone,
// hairStyle, hairColor, overallBuild.
async function fillBaseStep(page, name) {
  await page.getByPlaceholder(/Angel, Maya, Jade/).fill(name);
  await pickCombo(page, 0, '25–29');           // en-dash label
  await pickCombo(page, 1, 'Woman');
  await pickCombo(page, 2, 'Deep Dimples');
  await pickCombo(page, 3, 'Warm Caramel — honey');
  await pickCombo(page, 4, 'Warm');
  await pickCombo(page, 5, 'Pixie Cut');
  await pickCombo(page, 6, 'Burgundy / Wine');
  await pickCombo(page, 7, 'Curvy / Hourglass');
}

async function completeCurrentUploadBuilder(page, name) {
  await fillBaseStep(page, name);
  await page.getByRole('button', { name: 'Save & Add Headshot' }).click();
  await expect(page.getByRole('heading', { name: `Add ${name}'s headshot` })).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles({ name: 'headshot.png', mimeType: 'image/png', buffer: PIXEL_BUFFER });
  await expect(page.getByAltText(name)).toBeVisible();
  await page.getByRole('button', { name: /Continue/ }).click();
  await expect(page.getByRole('heading', { name: `Preserve ${name} references.` })).toBeVisible();
  await page.getByRole('button', { name: /Continue/ }).click();
  await page.getByRole('button', { name: 'Define Body' }).click();
  await page.locator('input[type="file"]').setInputFiles({ name: 'full-body.png', mimeType: 'image/png', buffer: PIXEL_BUFFER });
  await pickCombo(page, 1, 'Hourglass');
  await page.getByRole('button', { name: /Continue/ }).click();
}

test('full upload-first wizard locks and Save Creator persists everywhere without generation', async ({ page }) => {
  page.on('pageerror', error => console.error(`PAGE ERROR: ${error.stack || error.message}`));
  await page.addInitScript(pixel => {
    localStorage.setItem('ts_auth_session', JSON.stringify({ id: 't', name: 'T', email: 't@test.local', signedInAt: new Date().toISOString(), provider: 'local-test' }));
    localStorage.setItem('ts_characters', JSON.stringify([{
      id: 'seeded', name: 'Existing Creator', image: pixel, refImages: [pixel], fields: {},
    }]));
    localStorage.setItem('ts_library', JSON.stringify([{ id: 'seed-image', url: pixel, savedAt: new Date().toISOString() }]));
  }, PIXEL);

  await page.goto('http://localhost:3000/studio/');
  await page.getByRole('button', { name: /Cast/ }).click();
  await page.getByRole('button', { name: /New Creator/ }).first().click();

  await completeCurrentUploadBuilder(page, 'Regression Creator');
  await expect(page.getByText("Build Regression Creator's world")).toBeVisible();
  await page.getByRole('button', { name: 'Save Creator' }).click();

  await expect(page.getByRole('heading', { name: 'Cast' })).toBeVisible();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('ts_characters') || '[]'));
  expect(stored).toHaveLength(2);
  expect(stored[1].name).toBe('Regression Creator');
  expect(stored[1].refImages).toHaveLength(2);
  expect(stored[1].locked).toBe(true);
  expect(stored[1].status).toBe('identity_locked');
  expect(stored[1].coreIdentity.adultAgeRange).toBe('25-29');
  expect(await page.evaluate(() => localStorage.getItem('ts_active_character_id'))).toBe(stored[1].id);
  expect(await page.evaluate(() => localStorage.getItem('ts_creator_draft'))).toBeNull();
});

test('storage failure at final save stays in Builder and shows a recoverable error', async ({ page }) => {
  await page.addInitScript(pixel => {
    localStorage.setItem('ts_auth_session', JSON.stringify({ id: 't', name: 'T', email: 't@test.local', signedInAt: new Date().toISOString(), provider: 'local-test' }));
    localStorage.setItem('ts_characters', JSON.stringify([{
      id: 'seeded', name: 'Existing Creator', image: pixel, refImages: [pixel], fields: {},
    }]));
  }, PIXEL);

  await page.goto('http://localhost:3000/studio/');
  await page.getByRole('button', { name: /New Creator/ }).first().click();

  await completeCurrentUploadBuilder(page, 'Unsaved Creator');

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

  await expect(page.getByText(/Storage quota exceeded|Creator could not be saved/)).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ts_characters') || '[]'))).toHaveLength(1);
});

// Bug #3 — deep links / refresh must resolve app screens, not fall back to Landing.
test('direct navigation and bare slugs resolve app screens', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('ts_auth_session', JSON.stringify({ id: 't', name: 'T', email: 't@test.local', signedInAt: new Date().toISOString(), provider: 'local-test' }));
  });

  await page.goto('http://localhost:3000/studio/cast');
  await expect(page.getByRole('heading', { name: 'Cast', exact: true })).toBeVisible();

  // Bare friendly slug redirects into the shell.
  await page.goto('http://localhost:3000/cast');
  await expect(page).toHaveURL(/\/studio\/cast$/);
  await expect(page.getByRole('heading', { name: 'Cast', exact: true })).toBeVisible();

  // Unknown path still shows the marketing landing page.
  await page.goto('http://localhost:3000/nonsense-xyz');
  await expect(page.getByRole('button', { name: /Start free/i }).first()).toBeVisible();
});

// Bug #6 — search indexes full prompt text + scene + creator, not just labels.
test('search surfaces content buried in library prompts', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('ts_auth_session', JSON.stringify({ id: 't', name: 'T', email: 't@test.local', signedInAt: new Date().toISOString(), provider: 'local-test' }));
    localStorage.setItem('ts_characters', JSON.stringify([{ id: 42, name: 'Nova' }]));
    localStorage.setItem('ts_library', JSON.stringify([{
      id: 'a', url: 'x', savedAt: new Date().toISOString(), source: 'quick_shoot', scene: 'Penthouse', character: 42,
      prompt: 'Nova lounging in a Marrakech riad courtyard at golden hour with intricate tilework',
    }]));
  });
  await page.goto('http://localhost:3000/studio/home');

  const results = await page.evaluate(async () => {
    const m = await import('/src/lib/search.js');
    return {
      deepWord: m.searchIndex('tilework').length,   // past the 60-char label slice
      sceneVal: m.searchIndex('penthouse').length,  // scene field, not in label
    };
  });
  expect(results.deepWord).toBeGreaterThan(0);
  expect(results.sceneVal).toBeGreaterThan(0);
});
