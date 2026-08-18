import { chromium } from '@playwright/test';

const baseUrl = process.env.STAGING_BASE_URL;
const email = process.env.STAGING_SMOKE_EMAIL;
const password = process.env.STAGING_SMOKE_PASSWORD;
if (!baseUrl || !email || !password) {
  throw new Error('STAGING_BASE_URL, STAGING_SMOKE_EMAIL, and STAGING_SMOKE_PASSWORD are required.');
}

const routes = [
  ['home', 'Studio'],
  ['characters', 'Cast'],
  ['memory', 'Creator Memory'],
  ['images', 'New Creator'],
  ['director/guided', 'Thee Director'],
  ['director/describe-it', 'Thee Director'],
  ['director/scene-flow', 'Thee Director'],
  ['scenes', 'Scenes'],
  ['references', 'References'],
  ['campaigns', 'Campaigns'],
  ['library', 'Library'],
  ['history', 'History'],
  ['exports', 'Exports'],
  ['runs', 'Jobs'],
  ['settings', 'Usage & Credits'],
];

const forbiddenText = [
  'This screen ran into a problem.',
  'This action needs local studio services and is unavailable in cloud. Coming soon.',
  'Cloud video generation is not enabled in Scene Flow yet.',
];

let stage = 'launch';
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1365, height: 900 } });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(String(error?.message || error)));

  stage = 'login';
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Email').fill(email);
  await page.locator('#auth-password').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(url => url.pathname.startsWith('/studio') || url.pathname === '/plans', { timeout: 20_000 });
  if (new URL(page.url()).pathname === '/plans') {
    throw new Error('Dedicated staging smoke account does not currently have Studio access.');
  }

  stage = 'route crawl';
  for (const [route, label] of routes) {
    stage = `route:${route}`;
    await page.goto(`${baseUrl}/studio/${route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const pathname = new URL(page.url()).pathname;
    if (/\/plans|\/login|\/auth/.test(pathname)) {
      throw new Error(`Route ${route} redirected out of Studio to ${pathname}.`);
    }
    await page.getByText(label, { exact: true }).first().waitFor({ timeout: 15_000 });
    for (const text of forbiddenText) {
      if (await page.getByText(text, { exact: true }).count()) {
        throw new Error(`Route ${route} exposed forbidden cloud fallback: ${text}`);
      }
    }
  }

  stage = 'refresh persistence';
  await page.goto(`${baseUrl}/studio/library`, { waitUntil: 'domcontentloaded' });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByText('Library', { exact: true }).first().waitFor({ timeout: 15_000 });
  if (/\/plans|\/login|\/auth/.test(new URL(page.url()).pathname)) {
    throw new Error('Authenticated Studio session did not survive refresh.');
  }

  if (pageErrors.length) {
    throw new Error(`Browser page errors occurred: ${pageErrors.slice(0, 5).join(' | ')}`);
  }

  console.log('STAGING_CLOUD_SMOKE=passed');
  console.log(`ROUTES_CERTIFIED=${routes.length}`);
  console.log('SESSION_REFRESH=passed');
} catch (error) {
  const safe = String(error?.message || error)
    .replaceAll(email, '[smoke-email]')
    .replace(/https?:\/\/\S+/g, '[url]')
    .slice(0, 1200);
  console.error(`STAGING_CLOUD_SMOKE=failed stage=${stage} error=${safe}`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
