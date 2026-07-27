import { test, expect } from '@playwright/test';

const PIXEL_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEAQH/6ZcmWQAAAABJRU5ErkJggg==';

test('Scene Flow defaults to Photo and overrides backend video guesses', async ({ page }) => {
  let chatPayload;
  let generationScene;

  await page.addInitScript(() => {
    localStorage.setItem('ts_auth_session', JSON.stringify({
      id: 'format-tester',
      name: 'Format Tester',
      email: 'format@example.test',
    }));
  });

  await page.route('**/config', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ components: [] }),
  }));

  await page.route('**/gradio_api/run/scene_flow_chat', route => {
    chatPayload = route.request().postDataJSON();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [JSON.stringify({
          reply: "Got it, I'm building your scene now.",
          history: [],
          scene: {
            setting: 'rooftop at sunset',
            content_type: 'video',
            full_prompt: 'Safe rooftop fashion portrait.',
          },
        })],
      }),
    });
  });

  await page.route('**/gradio_api/run/scene_flow_generate', route => {
    const payload = route.request().postDataJSON();
    generationScene = JSON.parse(payload.data[0]);
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [JSON.stringify({ result_b64: PIXEL_B64, content_type: 'photo', status: 'done' })],
      }),
    });
  });

  await page.goto('http://127.0.0.1:3000/studio/');
  await page.getByRole('navigation').getByRole('button', { name: /Thee Director/ }).click();
  await page.getByRole('tab', { name: 'Talk It Through' }).click();

  await expect(page.getByRole('radio', { name: 'Photo' })).toBeChecked();
  await page.getByPlaceholder(/Describe the vibe/).fill('Rooftop fashion portrait.');
  await page.getByTitle('Send').click();
  await expect(page.getByText('Your scene is ready.')).toBeVisible();

  expect(chatPayload.data[1]).toContain('Requested output format: still photo');
  expect(generationScene.content_type).toBe('photo');
});

test('Scene Flow honors explicit Video selection', async ({ page }) => {
  let generationScene;

  await page.addInitScript(() => {
    localStorage.setItem('ts_auth_session', JSON.stringify({
      id: 'video-tester',
      name: 'Video Tester',
      email: 'video@example.test',
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
          setting: 'rooftop at sunset',
          content_type: 'photo',
          full_prompt: 'Safe rooftop fashion motion scene.',
        },
      })],
    }),
  }));

  await page.route('**/gradio_api/run/scene_flow_generate', route => {
    const payload = route.request().postDataJSON();
    generationScene = JSON.parse(payload.data[0]);
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [JSON.stringify({ result_url: 'data:video/mp4;base64,', content_type: 'video', status: 'done' })],
      }),
    });
  });

  await page.goto('http://127.0.0.1:3000/studio/');
  await page.getByRole('navigation').getByRole('button', { name: /Thee Director/ }).click();
  await page.getByRole('tab', { name: 'Talk It Through' }).click();
  await page.getByRole('radio', { name: 'Video' }).click();
  await expect(page.getByRole('radio', { name: 'Video' })).toBeChecked();
  await page.getByPlaceholder(/Describe the vibe/).fill('Rooftop fashion motion scene.');
  await page.getByTitle('Send').click();
  await expect(page.getByText('Your scene is ready.')).toBeVisible();

  expect(generationScene.content_type).toBe('video');
});
