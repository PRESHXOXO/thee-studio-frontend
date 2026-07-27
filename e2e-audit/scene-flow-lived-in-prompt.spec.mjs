import { test, expect } from '@playwright/test';

const PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEAQH/6ZcmWQAAAABJRU5ErkJggg==';

test('Scene Flow enriches mirror scenes with lived-in spatial prompting', async ({ page }) => {
  let generationPayload;

  await page.addInitScript(pixel => {
    localStorage.setItem('ts_auth_session', JSON.stringify({
      id: 'prompt-tester',
      name: 'Prompt Tester',
      email: 'prompt@example.test',
    }));
    localStorage.setItem('ts_characters', JSON.stringify([{
      id: 'maya',
      name: 'Maya',
      image: pixel,
      refImages: [pixel],
      locked: true,
      fields: {},
    }]));
    localStorage.setItem('ts_active_character_id', 'maya');
  }, PIXEL);

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
          location: 'boutique hotel suite',
          vibe: 'casual GRWM',
          wardrobe: 'white long-sleeve top',
          content_type: 'photo',
          full_prompt: 'Maya takes a mirror selfie while getting ready in a luxury hotel bathroom.',
        },
      })],
    }),
  }));

  await page.route('**/gradio_api/run/scene_flow_generate', route => {
    generationPayload = route.request().postDataJSON();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [JSON.stringify({ result_b64: PIXEL.split(',')[1], content_type: 'photo', status: 'done' })],
      }),
    });
  });

  await page.goto('http://127.0.0.1:3000/studio/');
  await page.getByRole('navigation').getByRole('button', { name: /Thee Director/ }).click();
  await page.getByRole('tab', { name: 'Talk It Through' }).click();
  await page.getByPlaceholder(/Describe the vibe/).fill('Hotel mirror GRWM.');
  await page.getByTitle('Send').click();
  await expect(page.getByText('Your scene is ready.')).toBeVisible();

  const scene = JSON.parse(generationPayload.data[0]);
  expect(scene.full_prompt).toContain('one coherent exposure');
  expect(scene.full_prompt).toContain('natural contact shadows');
  expect(scene.full_prompt).toContain('IDENTITY REFERENCE USAGE');
  expect(scene.full_prompt).toContain('true mirror reflection');
  expect(scene.full_prompt).toContain('do not inherit the reference image composition');
  expect(generationPayload.data[1]).toBe(PIXEL);
});
