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
  const input = guidedPanel.locator('input[type="file"]');

  await input.setInputFiles({ name: 'look.png', mimeType: 'image/png', buffer: PIXEL });
  await expect(page.getByLabel('Role for look.png')).toHaveValue('outfit');
  await expect(guidedPanel.getByLabel('Role for new references')).toHaveValue('background');

  await input.setInputFiles({ name: 'penthouse.png', mimeType: 'image/png', buffer: PIXEL });
  await expect(page.getByLabel('Role for penthouse.png')).toHaveValue('background');

  await page.getByRole('button', { name: 'Generate photo' }).click();
  await expect.poll(() => generationPayload).toBeTruthy();

  const params = JSON.parse(generationPayload.data[0]);
  expect(params.anchorImages).toHaveLength(2);
  expect(params.anchorImages.every(image => image.startsWith('data:image/jpeg;base64,'))).toBe(true);
  expect(params.positivePrompt).toContain('Image 2 — OUTFIT');
  expect(params.positivePrompt).toContain('Image 3 — BACKGROUND');
  expect(generationPayload.data[1]).toBe(PIXEL_DATA_URL);
});

test('Scene Flow sends all labeled references without generating automatically', async ({ page }) => {
  let chatPayload;
  let generationCalls = 0;
  await authenticate(page, false);
  await mockConfig(page);
  await page.route('**/gradio_api/run/scene_flow_chat', route => {
    chatPayload = route.request().postDataJSON();
    const scene = {
      schemaVersion: 'scene_flow_v3', sceneId: 'scene_refs', title: 'Reference study',
      sequenceConcept: 'A polished candid dressing-room portrait.',
      creator: { id: null, name: '', identityLocked: true },
      referenceRoles: ['identity', 'makeup', 'background'],
      globals: { location: 'reference room', outfit: '', hair: '', makeup: '', background: '', mood: 'polished candid', visualStyle: 'realistic', cameraLanguage: 'candid', lighting: 'natural', timeOfDay: 'day', contentFormat: 'photo sequence', aspectRatio: '9:16', continuity: 'preserve identity', supporting: '' },
      shots: [{ id: 'shot_001', index: 1, purpose: 'portrait', action: 'dressing-room portrait', pose: '', expression: '', framing: 'medium', angle: 'eye level', crop: '', environment: 'reference room', props: '', interaction: '', movement: '', composition: '', note: '', overrides: {} }],
    };
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [JSON.stringify({
          reply: 'I will combine those roles without mixing identities.',
          scene,
          generate: false,
          history: [],
        })],
      }),
    });
  });
  await page.route('**/gradio_api/run/scene_flow_generate', route => {
    generationCalls += 1;
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
  const roleSelect = sceneFlowPanel.getByLabel('Role for new references');
  const input = sceneFlowPanel.locator('input[type="file"]');

  await input.setInputFiles({ name: 'identity.png', mimeType: 'image/png', buffer: PIXEL });
  await expect(page.getByLabel('Role for identity.png')).toHaveValue('identity');

  await roleSelect.selectOption('makeup');
  await input.setInputFiles({ name: 'beauty.png', mimeType: 'image/png', buffer: PIXEL });
  await expect(page.getByLabel('Role for beauty.png')).toHaveValue('makeup');

  await roleSelect.selectOption('background');
  await input.setInputFiles({ name: 'suite.png', mimeType: 'image/png', buffer: PIXEL });
  await expect(page.getByLabel('Role for suite.png')).toHaveValue('background');

  await page.getByPlaceholder(/Describe the sequence/).fill('Build one polished dressing-room shot.');
  await page.getByTitle('Send').click();
  await expect(page.getByText(/combine those roles/)).toBeVisible();

  const chatReferences = JSON.parse(chatPayload.data[2]);
  expect(chatReferences.map(reference => reference.role)).toEqual(['identity', 'makeup', 'background']);
  expect(generationCalls).toBe(0);
});

test('Scene Flow composer stays visible at 100% zoom with three references', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 730 });
  await authenticate(page, false);
  await mockConfig(page);

  await page.goto('http://127.0.0.1:3000/studio/director/scene-flow');
  const panel = page.getByRole('tabpanel');
  await panel.evaluate(element => element.scrollIntoView({ block: 'start' }));
  const input = panel.locator('input[type="file"]');

  await input.setInputFiles({ name: 'identity.png', mimeType: 'image/png', buffer: PIXEL });
  await input.setInputFiles({ name: 'outfit.png', mimeType: 'image/png', buffer: PIXEL });
  await input.setInputFiles({ name: 'background.png', mimeType: 'image/png', buffer: PIXEL });

  await expect(panel.getByText('3/6')).toBeVisible();
  const composer = page.getByPlaceholder(/Describe the sequence/);
  await expect(composer).toBeVisible();
  await expect(composer).toBeInViewport({ ratio: 1 });
  await expect(page.getByTitle('Send')).toBeInViewport({ ratio: 1 });
  const composerBox = await composer.boundingBox();
  expect(composerBox.y + composerBox.height).toBeLessThanOrEqual(730);
});
