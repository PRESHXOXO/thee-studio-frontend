import { test, expect } from '@playwright/test';

const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEAQH/6ZcmWQAAAABJRU5ErkJggg==',
  'base64'
);
const PIXEL_DATA_URL = `data:image/png;base64,${PIXEL.toString('base64')}`;

function authenticate(page, withCreator = false) {
  return page.addInitScript(({ pixel, creator }) => {
    localStorage.setItem('ts_auth_session', JSON.stringify({
      id: 'multi-reference-test',
      name: 'Multi Reference Test',
      email: 'multi-reference@example.test',
    }));
    if (creator) {
      localStorage.setItem('ts_characters', JSON.stringify([{
        id: 81,
        name: 'Maya',
        image: pixel,
        refImages: [pixel],
        locked: true,
        fields: {},
      }]));
      localStorage.setItem('ts_active_character_id', '81');
    } else {
      localStorage.removeItem('ts_characters');
      localStorage.removeItem('ts_active_character_id');
    }
  }, { pixel: PIXEL_DATA_URL, creator: withCreator });
}

function mockConfig(page) {
  return page.route('**/config', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ components: [] }),
  }));
}

test('Guided sends multiple references with distinct visual jobs', async ({ page }) => {
  let generationPayload;
  await authenticate(page, true);
  await mockConfig(page);
  await page.route('**/gradio_api/run/character_generate', route => {
    generationPayload = route.request().postDataJSON();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [JSON.stringify({ images: [PIXEL_DATA_URL], summary: 'ok' })],
      }),
    });
  });

  await page.goto('http://127.0.0.1:3000/studio/director/guided');
  const guidedPanel = page.getByRole('tabpanel');
  await guidedPanel.locator('input[type="file"]').setInputFiles([
    { name: 'look.png', mimeType: 'image/png', buffer: PIXEL },
    { name: 'penthouse.png', mimeType: 'image/png', buffer: PIXEL },
  ]);
  await expect(page.getByLabel('Role for look.png')).toBeVisible();
  await page.getByLabel('Role for penthouse.png').selectOption('background');

  await page.getByRole('button', { name: 'Build + Generate' }).click();
  await expect.poll(() => generationPayload).toBeTruthy();

  const params = JSON.parse(generationPayload.data[0]);
  expect(params.anchorImages).toHaveLength(2);
  expect(params.anchorImages.every(image => image.startsWith('data:image/jpeg;base64,'))).toBe(true);
  expect(params.positivePrompt).toContain('Image 2 — OUTFIT');
  expect(params.positivePrompt).toContain('Image 3 — BACKGROUND');
  expect(generationPayload.data[1]).toBe(PIXEL_DATA_URL);
});

test('Scene Flow sends and generates with all labeled references', async ({ page }) => {
  let chatPayload;
  let generationPayload;
  await authenticate(page, false);
  await mockConfig(page);
  await page.route('**/gradio_api/run/scene_flow_chat', route => {
    chatPayload = route.request().postDataJSON();
    const scene = {
      setting: 'dressing room',
      wardrobe: 'reference look',
      location: 'reference room',
      content_type: 'photo',
      vibe: 'polished candid',
      full_prompt: 'A polished candid dressing-room portrait.',
    };
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [JSON.stringify({
          reply: 'I will combine those roles without mixing identities.',
          scene,
          generate: true,
          history: [],
        })],
      }),
    });
  });
  await page.route('**/gradio_api/run/scene_flow_generate', route => {
    generationPayload = route.request().postDataJSON();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [JSON.stringify({
          result_b64: PIXEL.toString('base64'),
          content_type: 'photo',
          status: 'done',
        })],
      }),
    });
  });

  await page.goto('http://127.0.0.1:3000/studio/director/scene-flow');
  const sceneFlowPanel = page.getByRole('tabpanel');
  await sceneFlowPanel.getByLabel('Role for new references').selectOption('makeup');
  await sceneFlowPanel.locator('input[type="file"]').setInputFiles([
    { name: 'beauty.png', mimeType: 'image/png', buffer: PIXEL },
    { name: 'suite.png', mimeType: 'image/png', buffer: PIXEL },
  ]);
  await expect(page.getByLabel('Role for beauty.png')).toBeVisible();
  await page.getByLabel('Role for suite.png').selectOption('background');
  await page.getByTitle('Send').click();
  await expect(page.getByText('Your scene is ready.')).toBeVisible();

  const chatReferences = JSON.parse(chatPayload.data[2]);
  const generationReferences = JSON.parse(generationPayload.data[1]);
  expect(chatReferences.map(reference => reference.role)).toEqual(['makeup', 'background']);
  expect(generationReferences.map(reference => reference.role)).toEqual(['makeup', 'background']);
  expect(JSON.parse(generationPayload.data[0]).full_prompt).toContain('Image 2 — BACKGROUND');
});

test('Scene Flow composer stays visible at 100% zoom with three references', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 730 });
  await authenticate(page, false);
  await mockConfig(page);

  await page.goto('http://127.0.0.1:3000/studio/director/scene-flow');
  const panel = page.getByRole('tabpanel');
  await panel.evaluate(element => element.scrollIntoView({ block: 'start' }));
  await panel.locator('input[type="file"]').setInputFiles([
    { name: 'outfit.png', mimeType: 'image/png', buffer: PIXEL },
    { name: 'background.png', mimeType: 'image/png', buffer: PIXEL },
    { name: 'makeup.png', mimeType: 'image/png', buffer: PIXEL },
  ]);

  await expect(panel.getByText('3/4')).toBeVisible();
  const composer = page.getByPlaceholder(/Message Scene Flow/);
  await expect(composer).toBeVisible();
  await expect(composer).toBeInViewport({ ratio: 1 });
  await expect(page.getByTitle('Send')).toBeInViewport({ ratio: 1 });
  const composerBox = await composer.boundingBox();
  expect(composerBox.y + composerBox.height).toBeLessThanOrEqual(730);
});
