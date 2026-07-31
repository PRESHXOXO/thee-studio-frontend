import { test, expect } from '@playwright/test';

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
  let generationPayload;

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
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [JSON.stringify({
          reply: ready ? "Got it, I'm building your scene now..." : 'What should Maya wear?',
          scene: ready ? {
            setting: 'rooftop at sunset',
            wardrobe: brief,
            location: 'Atlanta',
            content_type: 'photo',
            vibe: 'cinematic',
            character_desc: '',
            full_prompt: '',
          } : {},
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
    generationPayload = route.request().postDataJSON();
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

  await expect(page.getByText('Maya (creator)')).toBeVisible();
  const brief = 'Rooftop at sunset in Atlanta with cinematic lighting.';
  await page.getByPlaceholder(/Describe the vibe/).fill(brief);
  await page.getByTitle('Send').click();

  await expect(page.getByText('What should Maya wear?')).toBeVisible();
  await expect(page.getByPlaceholder(/Message Scene Flow/)).toBeEnabled();
  expect(chatPayloads[0].data[1]).toContain(brief);
  expect(chatPayloads[0].data[1]).not.toContain('Requested output format');
  expect(chatPayloads[0].data[1]).not.toContain('locked');
  expect(chatPayloads[0].data[2]).toBe(PIXEL);

  await page.getByRole('tab', { name: 'Guided' }).click();
  await page.getByRole('tab', { name: 'Talk It Through' }).click();
  await expect(page.getByText('What should Maya wear?')).toBeVisible();

  await page.getByPlaceholder(/Message Scene Flow/).fill('A tailored black suit');
  await page.getByTitle('Send').click();
  await expect(page.getByText('Your scene is ready.')).toBeVisible();

  // The chat sees the reference only once, while the later generation still
  // receives the same active identity reference after multiple turns.
  expect(chatPayloads[1].data[2]).toBe('');
  expect(generationPayload.data[1]).toBe(PIXEL);

  await page.getByRole('button', { name: 'New chat' }).click();
  await expect(page.getByText('Maya (creator)')).toBeVisible();
  await expect(page.getByPlaceholder(/Describe the vibe/)).toHaveValue('');
});
