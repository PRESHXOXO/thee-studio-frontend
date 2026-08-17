import { test, expect } from '@playwright/test';

test('local test account can sign up, sign out, and sign back in', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000/studio/');
  await expect(page).toHaveURL(/\/login/);

  await page.getByRole('link', { name: 'Sign up' }).click();
  await page.getByLabel('Name').fill('Test Owner');
  await page.getByLabel('Email').fill('owner@example.test');
  await page.locator('#auth-password').fill('testing123');
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page).toHaveURL(/\/plans/);
  await page.goto('http://127.0.0.1:3000/studio/');
  await expect(page).toHaveURL(/\/studio/);
  await page.getByTitle('Test Owner').click();
  await expect(page.getByText('owner@example.test', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login/);

  await page.getByLabel('Email').fill('owner@example.test');
  await page.locator('#auth-password').fill('wrong-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Email or password is incorrect.');

  await page.locator('#auth-password').fill('testing123');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/studio/);
  await page.reload();
  await expect(page).toHaveURL(/\/studio/);
  await expect(page.getByTitle('Test Owner')).toBeVisible();
});
