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
