import { test, expect } from '@playwright/test';
import { sceneFlowV3 } from './scene-fixtures.mjs';

async function openPlannedScene(page, scene, message) {
  let generationCalls = 0;
  await page.addInitScript(() => {
    localStorage.setItem('ts_auth_session', JSON.stringify({ id: 'prompt-tester', name: 'Prompt Tester', email: 'prompt@example.test' }));
  });
  await page.route('**/config', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ components: [] }) }));
  await page.route('**/gradio_api/run/scene_flow_chat', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ data: [JSON.stringify({ reply: 'The sequence is ready to review.', history: [], generate: false, scene })] }),
  }));
  await page.route('**/gradio_api/run/scene_flow_generate', route => {
    generationCalls += 1;
    return route.abort();
  });
  await page.goto('http://127.0.0.1:3000/studio/director/scene-flow');
  await page.getByPlaceholder(/Describe the sequence/).fill(message);
  await page.getByTitle('Send').click();
  await expect(page.getByText('The sequence is ready to review.')).toBeVisible();
  return { generationCalls: () => generationCalls };
}

test('Scene Flow builds mirror-specific direction without rendering', async ({ page }) => {
  const scene = sceneFlowV3({ title: 'Hotel mirror GRWM', concept: 'A lived-in hotel getting-ready moment', location: 'boutique hotel bathroom', outfit: 'white long-sleeve top', action: 'takes a true mirror selfie while getting ready' });
  scene.shots[0].composition = 'true mirror reflection with believable room geometry';
  const tracker = await openPlannedScene(page, scene, 'Hotel mirror GRWM.');
  await expect(page.getByLabel('Shot 1 action')).toHaveValue(/mirror selfie/);

  const built = await page.evaluate(async value => (await import('/src/lib/sceneFlowState.js')).buildSceneFlowPrompts(value, { identityLocked: false, referenceRoles: [] }), scene);
  expect(built.globalPrompt).toContain('boutique hotel bathroom');
  expect(built.shotPrompts[0].prompt).toContain('true mirror reflection');
  expect(built.shotPrompts[0].prompt).toContain('white long-sleeve top');
  expect(tracker.generationCalls()).toBe(0);
});

test('Scene Flow builds grounded vehicle direction without rendering', async ({ page }) => {
  const scene = sceneFlowV3({ title: 'Manhattan car ride', concept: 'A candid city arrival', location: 'rear seat of a black car in Manhattan', outfit: 'navy university hoodie', action: 'checks her phone while riding through Manhattan' });
  scene.shots[0].pose = 'grounded seated posture';
  scene.shots[0].framing = 'passenger eye-level medium candid';
  const tracker = await openPlannedScene(page, scene, 'Candid Manhattan car ride.');
  await expect(page.getByLabel('Shot 1 action')).toHaveValue(/checks her phone/);

  const built = await page.evaluate(async value => (await import('/src/lib/sceneFlowState.js')).buildSceneFlowPrompts(value, { identityLocked: false, referenceRoles: [] }), scene);
  expect(built.shotPrompts[0].prompt).toContain('grounded seated posture');
  expect(built.shotPrompts[0].prompt).toContain('passenger eye-level medium candid');
  expect(built.shotPrompts[0].prompt).toContain('navy university hoodie');
  expect(tracker.generationCalls()).toBe(0);
});
