import { test, expect } from '@playwright/test';

const PIXEL_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEAQH/6ZcmWQAAAABJRU5ErkJggg==';

test('safe Scene Flow prompt retries with policy-safe wording', async ({ page }) => {
  const generationScenes = [];

  await page.addInitScript(() => {
    localStorage.setItem('ts_auth_session', JSON.stringify({
      id: 'policy-tester',
      name: 'Policy Tester',
      email: 'policy@example.test',
    }));
  });

  await page.route('**/config', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ components: [] }),
  }));

  await page.route('**/gradio_api/run/scene_flow_chat', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      data: [JSON.stringify({
        reply: "Got it, I'm building your scene now.",
        history: [],
        scene: {
          setting: 'luxury hotel bathroom mirror',
          wardrobe: 'silk robe',
          location: 'boutique hotel',
          vibe: 'intimate editorial',
          content_type: 'photo',
          full_prompt: 'Safe intimate fashion portrait at a luxury bathroom mirror, wearing a silk robe.',
        },
      })],
    }),
  }));

  await page.route('**/gradio_api/run/scene_flow_generate', route => {
    const payload = route.request().postDataJSON();
    generationScenes.push(JSON.parse(payload.data[0]));
    const firstAttempt = generationScenes.length === 1;
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [JSON.stringify(firstAttempt
          ? { error: 'Image generation blocked by content policy. Detail: failed.' }
          : { result_b64: PIXEL_B64, content_type: 'photo', status: 'done' })],
      }),
    });
  });

  await page.goto('http://127.0.0.1:3000/studio/');
  await page.getByRole('navigation').getByRole('button', { name: /Thee Director/ }).click();
  await page.getByRole('tab', { name: 'Talk It Through' }).click();
  await page.getByPlaceholder(/Describe the vibe/).fill('Safe luxury hotel mirror portrait.');
  await page.getByTitle('Send').click();

  await expect(page.getByText(/Retrying once with policy-safe phrasing/)).toBeVisible();
  await expect(page.getByText('Your scene is ready.')).toBeVisible();
  expect(generationScenes).toHaveLength(2);
  expect(generationScenes[1].full_prompt).toContain('adults age 25 or older');
  expect(generationScenes[1].full_prompt).not.toMatch(/intimate|bathroom mirror|silk robe/i);
});
