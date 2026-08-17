import { test, expect } from '@playwright/test';

const PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEAQH/6ZcmWQAAAABJRU5ErkJggg==';

test('hover controls open full-screen review and delete image', async ({ page }) => {
  await page.addInitScript(pixel => {
    localStorage.setItem('ts_auth_session', JSON.stringify({
      id: 'library-test', name: 'Library Test', email: 'library@test.local',
      signedInAt: new Date().toISOString(), provider: 'local-test',
    }));
    localStorage.setItem('ts_library', JSON.stringify([
      {
        id: 'first-image',
        url: pixel,
        prompt: 'First library image',
        source: 'scene_flow',
        savedAt: '2026-07-26T12:00:00.000Z',
      },
      {
        id: 'second-image',
        url: pixel,
        prompt: 'Second library image',
        source: 'scene_flow',
        savedAt: '2026-07-26T12:01:00.000Z',
      },
    ]));
  }, PIXEL);

  await page.goto('http://127.0.0.1:3000/studio/');
  await page.getByRole('navigation').getByRole('button', { name: /^Library/ }).click();

  const firstImage = page.getByRole('img', { name: 'First library image' });
  await firstImage.hover();
  await page.getByTitle('Review full-screen').click();
  await expect(page.getByTitle('Close (Esc)')).toBeVisible();
  await expect(page.getByText('1 / 2', { exact: true })).toBeVisible();
  await page.getByTitle('Close (Esc)').click();

  await firstImage.hover();
  await page.getByRole('button', { name: 'Delete image' }).click();
  await expect(page.getByText('Delete Image?', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Delete', exact: true }).last().click();

  await expect(firstImage).toHaveCount(0);
  await expect(page.getByText('1 image', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ts_library') || '[]'))).toHaveLength(1);
});

test('Library downloads retain the full-resolution Scene Flow original', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('ts_auth_session', JSON.stringify({
      id: 'original-download-test',
      name: 'Original Download Test',
      email: 'original@example.test',
      signedInAt: new Date().toISOString(),
      provider: 'local-test',
    }));
  });
  await page.goto('http://127.0.0.1:3000/studio/library');

  await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1536;
    const context = canvas.getContext('2d');
    context.fillStyle = '#b86f52';
    context.fillRect(0, 0, canvas.width, canvas.height);
    const source = canvas.toDataURL('image/png');
    localStorage.setItem('ts_library', JSON.stringify([{
      id: 'full-resolution-fixture', url: source, originalUrl: source,
      source: 'scene_flow', prompt: 'Full-resolution download proof',
      savedAt: new Date().toISOString(), status: 'unreviewed',
    }]));
  });
  await page.reload();
  const image = page.getByRole('img', { name: 'Full-resolution download proof' });
  await image.hover();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download Original' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.png$/);
});
