// Playwright smoke crawl — walks every nav screen, captures console errors,
// failed network requests, and a screenshot. Not a test suite, a diagnostic.
import { chromium } from '@playwright/test';
import fs from 'fs';

const BASE = 'http://localhost:3000/studio';
const SCREENS = [
  { id: 'home', label: 'Studio' },
  { id: 'characters', label: 'Cast' },
  { id: 'memory', label: 'Creator Memory' },
  { id: 'images', label: 'New Creator' },
  { id: 'director', label: 'Thee Director' },
  { id: 'scenes', label: 'Scenes' },
  { id: 'references', label: 'References' },
  { id: 'campaigns', label: 'Campaigns' },
  { id: 'library', label: 'Library' },
  { id: 'history', label: 'History' },
  { id: 'exports', label: 'Exports' },
  { id: 'runs', label: 'Jobs' },
  { id: 'settings', label: 'Generation Settings' },
];

const OUT = './e2e-audit/results';
fs.mkdirSync(OUT, { recursive: true });

const report = [];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

// App is auth-gated now (RequireAuth on /studio). Seed a local test session
// before any navigation so the crawler lands in the app, not /auth.
await page.addInitScript(() => {
  localStorage.setItem('ts_auth_session', JSON.stringify({
    id: 'crawl-test', name: 'Crawler', email: 'crawl@test.local',
    signedInAt: new Date().toISOString(), provider: 'local-test',
  }));
});

let consoleErrors = [];
let pageErrors = [];
let failedRequests = [];

page.on('console', msg => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', err => {
  pageErrors.push(err.message);
});
page.on('requestfailed', req => {
  failedRequests.push(`${req.method()} ${req.url()} — ${req.failure()?.errorText}`);
});
page.on('response', res => {
  if (res.status() >= 400) failedRequests.push(`${res.status()} ${res.url()}`);
});

await page.goto(BASE, { waitUntil: 'networkidle' });

for (const screen of SCREENS) {
  consoleErrors = [];
  pageErrors = [];
  failedRequests = [];

  try {
    // Click the sidebar nav item by visible text
    const navBtn = page.locator('button', { hasText: screen.label }).first();
    await navBtn.click({ timeout: 5000 });
    await page.waitForTimeout(1200); // let async loads/effects settle
  } catch (e) {
    report.push({ screen: screen.id, label: screen.label, navError: String(e.message).slice(0, 300) });
    continue;
  }

  const shotPath = `${OUT}/${screen.id}.png`;
  await page.screenshot({ path: shotPath, fullPage: true }).catch(() => {});

  report.push({
    screen: screen.id,
    label: screen.label,
    consoleErrors: [...consoleErrors],
    pageErrors: [...pageErrors],
    failedRequests: [...failedRequests],
    screenshot: shotPath,
  });
}

await browser.close();

fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));

// Print compact summary to stdout
console.log('\n=== AUDIT SUMMARY ===\n');
for (const r of report) {
  const issues = (r.consoleErrors?.length || 0) + (r.pageErrors?.length || 0) + (r.failedRequests?.length || 0);
  const nav = r.navError ? ` NAV-FAIL: ${r.navError}` : '';
  console.log(`${issues > 0 || nav ? '✗' : '✓'} ${r.label.padEnd(20)} issues=${issues}${nav}`);
  if (r.consoleErrors?.length) r.consoleErrors.forEach(e => console.log(`    console: ${e.slice(0, 200)}`));
  if (r.pageErrors?.length) r.pageErrors.forEach(e => console.log(`    page:    ${e.slice(0, 200)}`));
  if (r.failedRequests?.length) r.failedRequests.forEach(e => console.log(`    net:     ${e.slice(0, 200)}`));
}
