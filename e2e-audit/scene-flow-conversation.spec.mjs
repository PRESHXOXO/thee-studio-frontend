import { test, expect } from '@playwright/test';

const PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEAQH/6ZcmWQAAAABJRU5ErkJggg==';

test('Scene Flow chats, remembers revisions, and waits for explicit generation', async ({ page }) => {
  let chatCalls = 0;
  let generationCalls = 0;
  let secondTurnHistory = [];

  await page.addInitScript(() => {
    localStorage.setItem('ts_auth_session', JSON.stringify({
      id: 'conversation-tester',
      name: 'Conversation Tester',
      email: 'conversation@example.test',
    }));
    localStorage.removeItem('ts_characters');
    localStorage.removeItem('ts_active_character_id');
  });
  await page.route('**/config', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ components: [] }),
  }));
  await page.route('**/gradio_api/run/scene_flow_chat', route => {
    chatCalls += 1;
    const request = route.request().postDataJSON();
    const firstScene = {
      setting: 'rear seat of a black car',
      wardrobe: 'navy hoodie',
      location: 'Manhattan',
      content_type: 'photo',
      vibe: 'candid city arrival',
      character_desc: '',
      full_prompt: 'A candid passenger portrait during a Manhattan car ride.',
    };
    const revisedScene = {
      ...firstScene,
      vibe: 'rainy candid city arrival',
      full_prompt: 'A candid passenger portrait during a rainy Manhattan car ride with window reflections.',
    };

    if (chatCalls === 1) {
      const reply = `That works. I would keep the camera at passenger eye level and let Manhattan move softly outside.\nSCENE_DRAFT:${JSON.stringify(firstScene)}`;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [JSON.stringify({
            reply,
            scene: firstScene,
            generate: false,
            history: [
              { role: 'user', content: request.data[1] },
              { role: 'assistant', content: reply },
            ],
          })],
        }),
      });
    }

    secondTurnHistory = JSON.parse(request.data[0]);
    const reply = `Rain makes it stronger. I added wet-window reflections and cooler ambient light without changing the wardrobe.\nSCENE_DRAFT:${JSON.stringify(revisedScene)}`;
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [JSON.stringify({
          reply,
          scene: revisedScene,
          generate: false,
          history: [
            ...secondTurnHistory,
            { role: 'user', content: request.data[1] },
            { role: 'assistant', content: reply },
          ],
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
          result_b64: PIXEL.split(',')[1],
          content_type: 'photo',
          status: 'done',
        })],
      }),
    });
  });

  await page.goto('http://127.0.0.1:3000/studio/director');
  await page.getByRole('tab', { name: 'Talk It Through' }).click();
  await expect(page.getByText('Your conversational creative director')).toBeVisible();

  const composer = page.getByPlaceholder(/Message Scene Flow/);
  await composer.fill('I want a candid Manhattan car scene with a navy hoodie.');
  await page.getByTitle('Send').click();

  await expect(page.getByText(/keep the camera at passenger eye level/)).toBeVisible();
  await expect(page.getByText(/SCENE_DRAFT/)).toHaveCount(0);
  await expect(page.getByText(/rear seat of a black car/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Generate photo' })).toBeVisible();
  expect(generationCalls).toBe(0);

  await composer.fill('Make it rainy, but keep the outfit.');
  await page.getByTitle('Send').click();

  await expect(page.getByText(/Rain makes it stronger/)).toBeVisible();
  await expect(page.getByText(/rainy candid city arrival/)).toBeVisible();
  expect(secondTurnHistory).toHaveLength(2);
  expect(generationCalls).toBe(0);

  await page.getByRole('button', { name: 'Generate photo' }).click();
  await expect(page.getByText('Your scene is ready.')).toBeVisible();
  expect(generationCalls).toBe(1);
});
