import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('ts_auth_session', JSON.stringify({
      id: 'merged-test-user',
      name: 'Merge Test',
      email: 'merge@test.local',
      provider: 'local-test',
      signedInAt: new Date().toISOString(),
    }));
    localStorage.setItem('ts_characters', JSON.stringify([{
      id: 'studio-creator-1',
      name: 'Sienna Vale',
      description: 'Luxury lifestyle creator with warm brown skin and editorial polish.',
      face: 'Oval face, almond eyes, defined cupid bow',
      hair: 'Deep espresso silk press',
      body: 'Athletic proportions and elegant posture',
      tone: 'Warm deep brown skin',
      locked: true,
    }]));
    localStorage.setItem('ts_creator_memory_v1', JSON.stringify({
      'studio-creator-1': {
        creatorId: 'studio-creator-1',
        version: 2,
        preferences: { visualSignature: 'Quiet luxury with lived-in realism' },
        learned: { favoriteScenes: [{ value: 'Five-star hotel suite', count: 2 }] },
        feedback: { total: 2, approved: 2, needsFix: 0, rejected: 0 },
      },
    }));
  });
});

test('merged Campaigns pipeline reaches reviewed hero and export', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000/studio/campaigns');
  await expect(page.getByRole('heading', { name: 'Campaigns', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'New campaign' }).first().click();
  await page.getByLabel('Campaign name').fill('Quiet Luxury Morning');
  await page.getByLabel('Creative brief').fill('A premium vertical creator campaign with restrained motion.');
  await page.getByRole('button', { name: 'Build shot list' }).click();

  await expect(page).toHaveURL(/\/studio\/campaigns\/project_/);
  await page.getByRole('button', { name: 'Add first shot' }).click();
  await page.getByLabel('Shot title').fill('Vanity hero');
  await page.getByLabel('Prompt template').fill('Creator at a marble vanity, candid poised expression.');
  await page.getByLabel('Framing').fill('Tight beauty close-up, eye level.');
  await page.getByLabel('Environment').fill('Quiet five-star hotel suite.');
  await page.getByRole('button', { name: 'Add to shot list' }).click();

  await page.getByRole('button', { name: 'Generate stills' }).click();
  await expect(page.getByAltText('Vanity hero candidate 1')).toBeVisible();
  const productionState = await page.evaluate(() => JSON.parse(localStorage.getItem('ts_production_v1:merged-test-user')));
  expect(productionState.runs[0].request_payload.prompt).toContain('CREATOR MEMORY — APPLY CONSISTENTLY');
  expect(productionState.runs[0].request_payload.prompt).toContain('Quiet luxury with lived-in realism');
  await page.getByAltText('Vanity hero candidate 1').click();
  await page.getByLabel('Face consistency').fill('5');
  await page.getByLabel('Skin realism').fill('5');
  await page.getByLabel('Crispness').fill('5');
  await page.getByLabel('Reviewer notes').fill('Identity and lighting are consistent.');
  await page.getByRole('button', { name: 'Choose hero' }).click();

  await expect(page.getByText('Hero locked')).toBeVisible();
  await page.getByRole('button', { name: 'Prepare export' }).click();
  await expect(page.getByRole('button', { name: 'Prepare export' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Prepare export' })).toBeEnabled();
  await page.getByRole('button', { name: 'Exports' }).click();
  await expect(page.getByText('hero still')).toBeVisible();
  await expect(page.getByText('ready')).toBeVisible();

  await page.getByRole('button', { name: 'Jobs' }).click();
  await expect(page.getByText('generate candidates')).toBeVisible();
  await expect(page.getByText('prepare export')).toBeVisible();
});
