import { test, expect } from '@playwright/test';

const PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEAQH/6ZcmWQAAAABJRU5ErkJggg==';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(pixel => {
    localStorage.setItem('ts_auth_session', JSON.stringify({
      id: 'memory-test-user',
      name: 'Memory Tester',
      email: 'memory@example.test',
      signedInAt: new Date().toISOString(),
      provider: 'local-test',
    }));
    localStorage.setItem('ts_characters', JSON.stringify([{
      id: 'maya',
      name: 'Maya',
      image: pixel,
      refImages: [pixel],
      locked: true,
    }]));
    localStorage.setItem('ts_active_character_id', 'maya');
    localStorage.setItem('ts_library', JSON.stringify([
      {
        id: 'approved-rooftop',
        url: pixel,
        character: 'maya',
        source: 'scene_flow',
        status: 'approved',
        scene: 'Rooftop at sunset',
        mood: 'quiet confidence',
        engine: 'OpenAI Image',
        savedAt: '2026-07-28T10:00:00.000Z',
      },
      {
        id: 'rejected-studio',
        url: pixel,
        character: 'maya',
        source: 'quick_shoot',
        status: 'rejected',
        scene: 'Generic white studio',
        savedAt: '2026-07-28T10:01:00.000Z',
      },
    ]));
  }, PIXEL);
});

test('Creator Memory learns reviews, versions Brand DNA, and survives reload', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000/studio/memory');
  await expect(page.getByRole('heading', { name: 'Creator Memory' })).toBeVisible();
  await expect(page.getByText('Rooftop at sunset')).toBeVisible();
  await expect(page.getByText('Generic white studio')).toBeVisible();
  await expect(page.getByText('2', { exact: true }).first()).toBeVisible();

  await page.getByLabel('Visual signature').fill('Lived-in luxury with quiet editorial confidence');
  await page.getByLabel('Color palette').fill('Warm cream, espresso, muted coral');
  await page.getByLabel('Never generate').fill('Generic white studio, plastic skin');
  await page.getByRole('button', { name: 'Save Brand DNA' }).click();
  await expect(page.getByRole('button', { name: 'Memory saved' })).toBeVisible();

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('ts_creator_memory_v1')).maya);
  expect(saved.version).toBe(2);
  expect(saved.preferences.visualSignature).toContain('Lived-in luxury');
  expect(saved.learned.favoriteScenes[0].value).toBe('Rooftop at sunset');
  expect(saved.learned.avoidScenes[0].value).toBe('Generic white studio');

  await page.reload();
  await expect(page.getByLabel('Visual signature')).toHaveValue('Lived-in luxury with quiet editorial confidence');
  await expect(page.getByText('Version 1')).toBeVisible();

  await page.getByRole('button', { name: /Search/ }).click();
  await page.getByPlaceholder(/Search creators/).fill('espresso');
  await expect(page.getByText('Maya Brand DNA')).toBeVisible();
});

test('Scene Flow injects learned Creator Memory into generation', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('ts_creator_memory_v1', JSON.stringify({
      maya: {
        creatorId: 'maya',
        version: 3,
        preferences: {
          visualSignature: 'Quiet lived-in luxury',
          colorPalette: 'Warm cream and espresso',
          avoid: 'Generic white studio',
        },
        learned: { favoriteScenes: [{ value: 'Rooftop at sunset', count: 2 }] },
        feedback: { total: 2, approved: 1, needsFix: 0, rejected: 1 },
      },
    }));
  });
  let generationPayload;
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
        reply: 'Ready.',
        history: [],
        scene: {
          setting: 'hotel suite',
          location: 'boutique hotel',
          vibe: 'candid morning',
          content_type: 'photo',
          full_prompt: 'Maya gets ready in a boutique hotel suite.',
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

  await page.goto('http://127.0.0.1:3000/studio/director');
  await page.getByRole('tab', { name: 'Talk It Through' }).click();
  await page.getByPlaceholder(/Describe the vibe/).fill('Hotel morning.');
  await page.getByTitle('Send').click();
  await expect(page.getByText('Your scene is ready.')).toBeVisible();

  const scene = JSON.parse(generationPayload.data[0]);
  expect(scene.full_prompt).toContain('CREATOR MEMORY — APPLY CONSISTENTLY');
  expect(scene.full_prompt).toContain('Quiet lived-in luxury');
  expect(scene.full_prompt).toContain('Warm cream and espresso');
  expect(scene.full_prompt).toContain('Generic white studio');
});
