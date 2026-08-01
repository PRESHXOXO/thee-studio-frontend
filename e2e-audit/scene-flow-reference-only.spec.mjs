import { test, expect } from '@playwright/test';

const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEAQH/6ZcmWQAAAABJRU5ErkJggg==',
  'base64'
);

test('reference-only send wakes Scene Flow with a real instruction', async ({ page }) => {
  let chatPayload;

  await page.addInitScript(() => {
    localStorage.setItem('ts_auth_session', JSON.stringify({
      id: 'scene-flow-tester',
      name: 'Scene Flow Tester',
      email: 'scene-flow@example.test',
    }));
  });

  await page.route('**/config', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ components: [] }),
  }));

  await page.route('**/gradio_api/run/scene_flow_chat', async route => {
    chatPayload = route.request().postDataJSON();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [JSON.stringify({
          reply: '',
          scene: {},
          history: [],
        })],
      }),
    });
  });

  await page.goto('http://127.0.0.1:3000/studio/');
  await page.getByRole('navigation').getByRole('button', { name: /Thee Director/ }).click();
  await page.getByRole('tab', { name: 'Talk It Through' }).click();
  await page.locator('input[type="file"]').last().setInputFiles({
    name: 'reference.png',
    mimeType: 'image/png',
    buffer: PIXEL,
  });
  await page.getByTitle('Send').click();

  await expect(page.getByText('References received. What kind of scene would you like to create with them?')).toBeVisible();
  await expect(page.getByPlaceholder(/Message Scene Flow/)).toBeEnabled();
  expect(chatPayload.data[1]).toMatch(/visual reference image.*identity.*what I want to create/);
  const references = JSON.parse(chatPayload.data[2]);
  expect(references).toHaveLength(1);
  expect(references[0].role).toBe('identity');
  expect(references[0].image).toMatch(/^data:image\/jpeg;base64,/);
});
