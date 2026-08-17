import { test, expect } from '@playwright/test';
import { sceneFlowV3 } from './scene-fixtures.mjs';

async function setup(page, response) {
  let generationCalls = 0;
  await page.addInitScript(() => localStorage.setItem('ts_auth_session', JSON.stringify({ id: 'format-tester', name: 'Format Tester', email: 'format@example.test' })));
  await page.route('**/config', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ components: [] }) }));
  await page.route('**/gradio_api/run/scene_flow_chat', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [JSON.stringify(response)] }) }));
  await page.route('**/gradio_api/run/scene_flow_generate', route => { generationCalls += 1; return route.abort(); });
  await page.goto('http://127.0.0.1:3000/studio/director/scene-flow');
  return () => generationCalls;
}

test('Scene Flow defaults to Photo sequence and backend guesses cannot auto-render', async ({ page }) => {
  const scene = sceneFlowV3({ format: 'video', action: 'rooftop fashion portrait' });
  const calls = await setup(page, { reply: 'Review this photo sequence.', history: [], generate: true, scene });
  await expect(page.getByRole('radio', { name: 'Photo sequence' })).toBeChecked();
  await page.getByPlaceholder(/Describe the sequence/).fill('Rooftop fashion portrait.');
  await page.getByTitle('Send').click();
  await expect(page.getByText('Review this photo sequence.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Generate photo' })).toBeVisible();
  expect(calls()).toBe(0);
});

test('Scene Flow honors explicit Video planning selection without auto-rendering', async ({ page }) => {
  const scene = sceneFlowV3({ format: 'photo sequence', action: 'rooftop motion scene' });
  const calls = await setup(page, { reply: 'Video board ready to review.', history: [], generate: false, scene });
  await page.getByRole('radio', { name: 'Video' }).click();
  await page.getByPlaceholder(/Describe the sequence/).fill('Rooftop fashion motion scene.');
  await page.getByTitle('Send').click();
  await expect(page.getByRole('radio', { name: 'Video' })).toBeChecked();
  await expect(page.getByRole('button', { name: 'Generate video' })).toBeVisible();
  expect(calls()).toBe(0);
});

test('Scene Flow malformed model response fails closed', async ({ page }) => {
  const calls = await setup(page, { reply: 'Malformed', history: [], generate: true, scene: { schemaVersion: 'scene_flow_v3', shots: [] } });
  await page.getByPlaceholder(/Describe the sequence/).fill('Create a safe studio portrait.');
  await page.getByTitle('Send').click();
  await expect(page.getByText(/scene.creator must be an object/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /Generate/ })).toHaveCount(0);
  expect(calls()).toBe(0);
});
