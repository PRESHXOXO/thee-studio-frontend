import { test, expect } from '@playwright/test';
import { sceneFlowV3 } from './scene-fixtures.mjs';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('ts_auth_session', JSON.stringify({
      id: 'director-test', name: 'Director Test', email: 'director@test.local',
      signedInAt: new Date().toISOString(), provider: 'local-test',
    }));
  });
});

const PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEAQH/6ZcmWQAAAABJRU5ErkJggg==';

test('Director keeps Scene Flow state and sends the first brief with its creator reference', async ({ page }) => {
  const chatPayloads = [];
  let generationCalls = 0;

  await page.addInitScript(pixel => {
    const creator = {
      id: 7,
      name: 'Maya',
      image: pixel,
      refImages: [pixel],
      locked: true,
      fields: {},
    };
    localStorage.setItem('ts_characters', JSON.stringify([creator]));
    localStorage.setItem('ts_active_character_id', '7');
  }, PIXEL);

  await page.route('**/config', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ components: [] }),
  }));

  await page.route('**/gradio_api/run/scene_flow_chat', async route => {
    const payload = route.request().postDataJSON();
    chatPayloads.push(payload);
    const brief = payload.data[1];
    const ready = chatPayloads.length > 1;
    const scene = ready ? sceneFlowV3({ creatorId: null, creatorName: 'Maya', identityLocked: true, location: 'Atlanta', outfit: brief, mood: 'cinematic', action: 'rooftop at sunset' }) : null;
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [JSON.stringify({
          reply: ready ? "Got it, I'm building your scene now..." : 'What should Maya wear?',
          scene,
          generate: false,
          history: [
            { role: 'user', content: brief },
            {
              role: 'assistant',
              content: ready ? "Got it, I'm building your scene now..." : 'What should Maya wear?',
            },
          ],
        })],
      }),
    });
  });

  await page.route('**/gradio_api/run/scene_flow_generate', async route => {
    generationCalls += 1;
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [JSON.stringify({
          result_b64: PIXEL.split(',')[1],
          content_type: 'photo',
          status: 'done',
        })],
      }),
    });
  });

  await page.goto('http://127.0.0.1:3000/studio/');
  await page.getByRole('button', { name: /Thee Director/ }).first().click();
  await page.getByRole('tab', { name: 'Talk It Through' }).click();

  await expect(page.getByText('Maya is on set')).toBeVisible();
  await expect(page.getByText('Identity bound')).toBeVisible();
  const brief = 'Rooftop at sunset in Atlanta with cinematic lighting.';
  await page.getByPlaceholder(/Describe the sequence/).fill(brief);
  await page.getByTitle('Send').click();

  await expect(page.getByText('What should Maya wear?')).toBeVisible();
  await expect(page.getByPlaceholder(/Describe the sequence/)).toBeEnabled();
  expect(chatPayloads[0].data[1]).toContain(brief);
  expect(chatPayloads[0].data[1]).not.toContain('Requested output format');
  expect(chatPayloads[0].data[1]).not.toContain('locked');
  expect(chatPayloads[0].data[2]).toBe('');

  await page.getByRole('tab', { name: 'Guided' }).click();
  await page.getByRole('tab', { name: 'Talk It Through' }).click();
  await expect(page.getByText('What should Maya wear?')).toBeVisible();

  await page.getByPlaceholder(/Describe the sequence/).fill('A tailored black suit');
  await page.getByTitle('Send').click();
  await expect(page.getByLabel('Shot 1 action')).toHaveValue('rooftop at sunset');
  await expect(page.getByText('Maya is on set')).toBeVisible();

  // Saved Cast identity remains canonical and is never flattened into a
  // styling reference payload. Chat/planning never starts image generation.
  expect(chatPayloads[1].data[2]).toBe('');
  expect(generationCalls).toBe(0);

  await page.getByRole('button', { name: 'New chat' }).click();
  await expect(page.getByText('Maya is on set')).toBeVisible();
  await expect(page.getByPlaceholder(/Describe the sequence/)).toHaveValue('');
});
