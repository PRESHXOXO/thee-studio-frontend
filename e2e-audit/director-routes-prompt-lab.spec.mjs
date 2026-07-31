import { test, expect } from '@playwright/test';

test('Director modes have stable links and Describe It builds successfully', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('ts_auth_session', JSON.stringify({
      id: 'director-route-test',
      name: 'Director Route Test',
      email: 'director-route@example.test',
      provider: 'local-test',
    }));
    localStorage.removeItem('ts_characters');
    localStorage.removeItem('ts_active_character_id');
  });
  await page.route('**/config', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ components: [] }),
  }));
  await page.route('**/gradio_api/run/prompt_lab_build', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      data: [JSON.stringify({
        prompt: 'A cinematic hotel-suite portrait with warm window light.',
        slots: { constraints: 'warped hands' },
        why_this_works: [],
        variants: [],
        moods: ['Quiet confidence'],
        target: 'openai',
        model: 'gpt-4o-mini',
      })],
    }),
  }));

  await page.goto('http://127.0.0.1:3000/studio/director/describe-it');
  await expect(page).toHaveURL(/\/studio\/director\/describe-it$/);
  await expect(page.getByRole('tab', { name: 'Describe It' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('heading', { name: /lab brings the lens/i })).toBeVisible();

  await page.getByPlaceholder(/rooftop dinner in Paris/).fill('Candid hotel-suite portrait.');
  await page.getByRole('button', { name: 'Build my prompt' }).click();
  await expect(page.getByText('Engineered Prompt')).toBeVisible();
  await expect(page.getByText(/cinematic hotel-suite portrait/)).toBeVisible();

  await page.getByRole('tab', { name: 'Talk It Through' }).click();
  await expect(page).toHaveURL(/\/studio\/director\/scene-flow$/);
  await expect(page.getByText('Your conversational creative director')).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/\/studio\/director\/describe-it$/);
  await expect(page.getByRole('tab', { name: 'Describe It' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('Engineered Prompt')).toBeVisible();

  await page.reload();
  await expect(page.getByRole('tab', { name: 'Describe It' })).toHaveAttribute('aria-selected', 'true');

  await page.getByRole('tab', { name: 'Guided' }).click();
  await expect(page).toHaveURL(/\/studio\/director\/guided$/);
});

test('friendly Director mode aliases canonicalize to their own links', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('ts_auth_session', JSON.stringify({
      id: 'director-alias-test',
      name: 'Director Alias Test',
      email: 'director-alias@example.test',
      provider: 'local-test',
    }));
  });

  await page.goto('http://127.0.0.1:3000/prompt-lab');
  await expect(page).toHaveURL(/\/studio\/director\/describe-it$/);
  await expect(page.getByRole('tab', { name: 'Describe It' })).toHaveAttribute('aria-selected', 'true');

  await page.goto('http://127.0.0.1:3000/studio/scene-flow');
  await expect(page).toHaveURL(/\/studio\/director\/scene-flow$/);
  await expect(page.getByRole('tab', { name: 'Talk It Through' })).toHaveAttribute('aria-selected', 'true');
});
