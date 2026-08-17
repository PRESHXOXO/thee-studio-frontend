import { test, expect } from '@playwright/test';
import { sceneFlowV3 } from './scene-fixtures.mjs';

test('Scene Flow never obeys model-requested automatic generation or retry', async ({ page }) => {
  let generationCalls = 0;
  await page.addInitScript(() => localStorage.setItem('ts_auth_session', JSON.stringify({ id: 'policy-tester', name: 'Policy Tester', email: 'policy@example.test' })));
  await page.route('**/config', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ components: [] }) }));
  await page.route('**/gradio_api/run/scene_flow_chat', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ data: [JSON.stringify({
      reply: 'Review the safe hotel sequence before rendering.',
      history: [],
      generate: true,
      retry: true,
      scene: sceneFlowV3({ location: 'boutique hotel', mood: 'quiet editorial', action: 'checks the mirror before leaving' }),
    })] }),
  }));
  await page.route('**/gradio_api/run/scene_flow_generate', route => { generationCalls += 1; return route.abort(); });

  await page.goto('http://127.0.0.1:3000/studio/director/scene-flow');
  await page.getByPlaceholder(/Describe the sequence/).fill('Safe luxury hotel sequence.');
  await page.getByTitle('Send').click();
  await expect(page.getByText('Review the safe hotel sequence before rendering.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Generate photo' })).toBeVisible();
  expect(generationCalls).toBe(0);
});
