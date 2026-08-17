import { test, expect } from '@playwright/test';

const PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEAQH/6ZcmWQAAAABJRU5ErkJggg==';
const REFERENCE_SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="48"><rect width="32" height="48" fill="#8b5e3c"/></svg>');

async function seedSession(page) {
  await page.addInitScript(() => {
    localStorage.setItem('ts_auth_session', JSON.stringify({
      id: 'qa-test', name: 'QA Test', email: 'qa@test.local',
      signedInAt: new Date().toISOString(), provider: 'local-test',
    }));
  });
}

test('Cast treats a lone primary upload as identity-only', async ({ page }) => {
  await seedSession(page);
  let analysisPayload = '';
  let anchorImage = '';

  await page.route('**/gradio_api/run/analyze_character', route => {
    analysisPayload = route.request().postDataJSON().data[0];
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [JSON.stringify({
        face: 'Oval face', hair: 'Dark hair', body: 'Balanced build',
        wardrobe: 'Minimal', tone: 'Warm', personality: 'Confident', niche: 'Lifestyle',
      })] }),
    });
  });
  await page.route('**/gradio_api/run/face_anchor_extract', route => {
    anchorImage = route.request().postDataJSON().data[0];
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [JSON.stringify({ faceAnchor: 'Stable facial geometry' })] }),
    });
  });

  await page.goto('http://127.0.0.1:3000/studio/cast');
  await page.getByRole('button', { name: 'Create from Scratch' }).click();
  await page.locator('input[type="file"]').first().setInputFiles({
    name: 'portrait-with-wrong-mime.png',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from(PIXEL.split(',')[1], 'base64'),
  });

  expect(analysisPayload).toBe('');
  await expect(page.getByPlaceholder(/High cheekbones/)).toHaveValue('');
  await page.getByRole('button', { name: 'Analyze Complete Set (1)' }).click();
  await expect.poll(() => analysisPayload).not.toBe('');
  const references = JSON.parse(analysisPayload).references;
  expect(references).toHaveLength(1);
  expect(references[0].role).toBe('identity');
  expect(references[0].image).toMatch(/^data:image\/jpeg;base64,/);
  expect(anchorImage).toMatch(/^data:image\/jpeg;base64,/);
  await expect(page.getByText(/Analysis:/)).toHaveCount(0);
  await expect(page.getByPlaceholder(/High cheekbones/)).toHaveValue('Oval face');
  await expect(page.getByPlaceholder(/Minimal luxury/)).toHaveValue('');
});

test('Cast waits for the complete import set and analyzes every reference together', async ({ page }) => {
  await seedSession(page);
  let analysisCalls = 0;
  let analysisPayload = '';

  await page.route('**/gradio_api/run/analyze_character', route => {
    analysisCalls += 1;
    analysisPayload = route.request().postDataJSON().data[0];
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [JSON.stringify({
        face: 'Oval face', hair: 'Dark hair', body: 'Balanced build',
        wardrobe: 'Tailored neutrals', tone: 'Warm', personality: 'Confident', niche: 'Lifestyle',
      })] }),
    });
  });
  await page.route('**/gradio_api/run/face_anchor_extract', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ data: [JSON.stringify({ faceAnchor: 'Stable facial geometry' })] }),
  }));

  await page.goto('http://127.0.0.1:3000/studio/cast');
  await page.getByRole('button', { name: 'Import from Photos' }).click();
  await page.locator('input[type="file"]').first().setInputFiles([
    { name: 'identity.svg', mimeType: 'image/svg+xml', buffer: REFERENCE_SVG },
    { name: 'outfit-one.svg', mimeType: 'image/svg+xml', buffer: REFERENCE_SVG },
    { name: 'outfit-two.svg', mimeType: 'image/svg+xml', buffer: REFERENCE_SVG },
    { name: 'outfit-three.svg', mimeType: 'image/svg+xml', buffer: REFERENCE_SVG },
    { name: 'outfit-four.svg', mimeType: 'image/svg+xml', buffer: REFERENCE_SVG },
  ]);

  await expect(page.getByText('5/5 ready. Fields stay empty until you confirm this is the complete set.')).toBeVisible();
  expect(analysisCalls).toBe(0);
  await expect(page.getByPlaceholder(/High cheekbones/)).toHaveCount(0);

  await page.getByRole('button', { name: /Analyze Complete Set \(5\)/ }).click();
  await expect.poll(() => analysisCalls).toBe(1);
  const references = JSON.parse(analysisPayload).references;
  expect(references).toHaveLength(5);
  expect(references.map(reference => reference.role)).toEqual(['identity', 'supporting', 'supporting', 'supporting', 'supporting']);
  expect(references.every(reference => /^data:image\/jpeg;base64,/.test(reference.image))).toBe(true);
  const dimensions = await page.evaluate(src => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = reject;
    image.src = src;
  }), references[0].image);
  expect(dimensions).toEqual({ width: 32, height: 48 });
  await expect(page.getByPlaceholder(/Minimal luxury/)).toHaveValue('Tailored neutrals');
});

test('endpoint timeout remains active until the complete async operation settles', async ({ page }) => {
  await seedSession(page);
  await page.goto('http://127.0.0.1:3000/');

  const message = await page.evaluate(async () => {
    const { withEndpointTimeout } = await import('/src/api/studio.js');
    try {
      await withEndpointTimeout(signal => new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
      }), 25);
      return '';
    } catch (error) {
      return error.message;
    }
  });

  expect(message).toContain('Timed out');
  expect(message).toContain('backend');
});

test('History re-run restores the complete Guided settings snapshot', async ({ page }) => {
  await seedSession(page);
  await page.addInitScript(pixel => {
    localStorage.setItem('ts_characters', JSON.stringify([{
      id: 'creator-string-id',
      name: 'Nova',
      image: pixel,
      refImages: [pixel, pixel],
      locked: true,
    }]));
    localStorage.setItem('ts_library', JSON.stringify([{
      id: 'guided-rerun',
      url: pixel,
      savedAt: new Date().toISOString(),
      source: 'quick_shoot',
      character: 'creator-string-id',
      prompt: 'Full original rooftop prompt',
      scene: 'Rooftop',
      settings: {
        version: 1,
        workflow: 'guided',
        identityMode: 'lifestyle',
        scene: 'Rooftop',
        outfit: 'old_money',
        mood: 'Cinematic',
        lighting: 'Golden Hour',
        notes: 'Keep the skyline soft and candid.',
        engine: 'replicate_flux_schnell',
        batchSize: 2,
        activeRef: 1,
      },
    }]));
  }, PIXEL);

  await page.goto('http://127.0.0.1:3000/studio/history');
  await page.getByRole('button', { name: 'Re-run' }).click();

  await expect(page).toHaveURL(/\/studio\/director/);
  await expect(page.getByRole('tab', { name: 'Guided' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('combobox').filter({ hasText: 'Rooftop' })).toBeVisible();
  await expect(page.getByPlaceholder(/Anything specific for this shot/)).toHaveValue('Keep the skyline soft and candid.');
  await expect(page.getByRole('button', { name: 'Cinematic' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Golden Hour' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('combobox').filter({ hasText: 'Old Money' })).toBeVisible();
  await expect(page.getByRole('button', { name: '2 images' })).toHaveAttribute('aria-pressed', 'true');
});

test('History re-run opens Describe It with its original prompt-engine settings', async ({ page }) => {
  await seedSession(page);
  await page.addInitScript(pixel => {
    localStorage.setItem('ts_library', JSON.stringify([{
      id: 'describe-rerun',
      url: pixel,
      savedAt: new Date().toISOString(),
      source: 'prompt_lab',
      prompt: 'Engineered Marrakech courtyard prompt',
      settings: {
        version: 1,
        workflow: 'describe',
        rawInput: 'A creator reading beside intricate blue tilework',
        target: 'openai',
        format: 'Editorial',
        aspect: '4:5',
        lighting: 'Golden Hour',
        mood: 'Quiet Luxury',
        finish: 'Film Grain',
        activePrompt: 'Engineered Marrakech courtyard prompt',
        result: {
          prompt: 'Engineered Marrakech courtyard prompt',
          why_this_works: [],
          variants: [],
          moods: [],
        },
      },
    }]));
  }, PIXEL);

  await page.goto('http://127.0.0.1:3000/studio/history');
  await page.getByRole('button', { name: 'Re-run' }).click();

  await expect(page.getByRole('tab', { name: 'Describe It' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('textarea:visible').first()).toHaveValue('A creator reading beside intricate blue tilework');
  await expect(page.locator('pre')).toHaveText('Engineered Marrakech courtyard prompt');
});

test('pipeline filter is URL-backed, refresh-safe, and returns to All without stale state', async ({ page }) => {
  await seedSession(page);
  await page.addInitScript(pixel => {
    localStorage.setItem('ts_library', JSON.stringify([
      {
        id: 'review-me', url: pixel, prompt: 'Needs review image',
        source: 'director', status: 'unreviewed', savedAt: new Date().toISOString(),
      },
      {
        id: 'approved', url: pixel, prompt: 'Approved image',
        source: 'director', status: 'approved', savedAt: new Date().toISOString(),
      },
    ]));
  }, PIXEL);

  await page.goto('http://127.0.0.1:3000/studio/home');
  await page.getByRole('button', { name: /Needs review/ }).click();

  await expect(page).toHaveURL(/\/studio\/library\?filter=unreviewed$/);
  await expect(page.getByRole('img', { name: 'Needs review image' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Approved image' })).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole('img', { name: 'Needs review image' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Approved image' })).toHaveCount(0);

  await page.getByRole('navigation').getByRole('button', { name: /Studio/ }).click();
  await page.getByRole('navigation').getByRole('button', { name: /^Library/ }).click();
  await expect(page).toHaveURL(/\/studio\/library$/);
  await expect(page.getByRole('img', { name: 'Needs review image' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Approved image' })).toBeVisible();
});

test('new Guided generation sends the complete current direction only after explicit Generate', async ({ page }) => {
  await seedSession(page);
  let generationPayload;
  await page.route('**/config', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ components: [] }),
  }));
  await page.route('**/gradio_api/**/generate_image*', route => {
    generationPayload = route.request().postDataJSON();
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [[PIXEL], 'Complete'] }) });
  });

  await page.goto('http://127.0.0.1:3000/studio/director');
  const uniqueEnding = 'preserve this exact rare cerulean-lantern ending';
  const notes = `${'Layer the location with believable environmental detail. '.repeat(8)}${uniqueEnding}`;
  await page.getByPlaceholder(/Anything specific for this shot/).fill(notes);
  await page.getByRole('button', { name: 'Cinematic' }).click();
  await page.getByRole('button', { name: 'Golden Hour' }).click();
  expect(generationPayload).toBeUndefined();
  await page.getByRole('button', { name: 'Generate photo' }).click();
  await expect(page.getByRole('img', { name: 'Generated image 1' })).toBeVisible();
  const prompt = generationPayload.data[5];
  expect(prompt.length).toBeGreaterThan(160);
  expect(prompt).toContain(uniqueEnding);
  expect(prompt).toContain('Cinematic');
  expect(prompt).toContain('Golden Hour');
});

test('search includes stored rerun settings and full prompt content', async ({ page }) => {
  await seedSession(page);
  await page.addInitScript(pixel => {
    localStorage.setItem('ts_characters', JSON.stringify([{ id: 7, name: 'Nova' }]));
    localStorage.setItem('ts_library', JSON.stringify([{
      id: 'search-settings',
      url: pixel,
      source: 'prompt_lab',
      character: '7',
      savedAt: new Date().toISOString(),
      prompt: `A cinematic scene ${'with layered details '.repeat(20)}ending beside rare zellige tilework`,
      settings: {
        workflow: 'describe',
        rawInput: 'A quiet afternoon in Chefchaouen',
        lighting: 'Blue Hour',
      },
    }]));
  }, PIXEL);

  await page.goto('http://127.0.0.1:3000/studio/home');
  const matches = await page.evaluate(async () => {
    const { searchIndex } = await import('/src/lib/search.js');
    return {
      deepPrompt: searchIndex('zellige').length,
      rawInput: searchIndex('Chefchaouen').length,
      creatorAcrossIdTypes: searchIndex('Nova').length,
    };
  });

  expect(matches.deepPrompt).toBeGreaterThan(0);
  expect(matches.rawInput).toBeGreaterThan(0);
  expect(matches.creatorAcrossIdTypes).toBeGreaterThan(0);
});
