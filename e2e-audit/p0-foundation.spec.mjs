import { test, expect } from '@playwright/test';

const session = {
  id: 'p0-test-user',
  name: 'P0 Tester',
  email: 'p0@test.local',
  provider: 'local-test',
  signedInAt: new Date().toISOString(),
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(value => {
    localStorage.clear();
    localStorage.setItem('ts_auth_session', JSON.stringify(value));
  }, session);
});

test('new accounts receive a useful sample campaign', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000/studio/campaigns');
  await expect(page.getByRole('heading', { name: 'Campaigns' })).toBeVisible();
  const sample = page.getByRole('heading', { name: 'Welcome Campaign' });
  await expect(sample).toHaveCount(1);
  await expect(page.getByText('Studio Muse')).toBeVisible();
  await sample.click();
  await expect(page.getByRole('heading', { name: 'Editorial introduction' })).toBeVisible();
});

test('interrupted jobs recover, retry, and consume managed credits once', async ({ page }) => {
  await page.addInitScript(userId => {
    const old = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    localStorage.setItem(`ts_production_v1:${userId}`, JSON.stringify({
      creators: [{ id: 'creator-1', user_id: userId, name: 'Test Muse', created_at: old, updated_at: old }],
      identities: [{ id: 'identity-1', user_id: userId, creator_id: 'creator-1', identity_notes: 'Consistent face', locked_traits: [], do_not_change_notes: '', realism_orientation: 'luxury_high_realism', created_at: old, updated_at: old }],
      references: [],
      projects: [{ id: 'project-1', user_id: userId, creator_id: 'creator-1', title: 'Test Campaign', brief: '', status: 'draft', default_aspect_ratio: '4:5', created_at: old, updated_at: old }],
      shots: [{ id: 'shot-1', user_id: userId, project_id: 'project-1', title: 'Retry portrait', shot_type: 'portrait', prompt_template: 'Natural portrait', framing: 'Chest up', environment: 'Studio', styling_notes: '', lighting_notes: '', realism_notes: '', motion_plan: '', negative_constraints: '', aspect_ratio: '4:5', position: 1, created_at: old, updated_at: old }],
      generations: [], assets: [], reviews: [], selections: [], clips: [], exports: [],
      runs: [{
        id: 'run-old', user_id: userId, provider_type: 'still', provider_key: 'local-preview-still',
        operation: 'generate_candidates', status: 'running',
        request_payload: { shotId: 'shot-1', candidateCount: 2 },
        response_payload: null, external_run_id: null, error_code: null, error_message: null,
        started_at: old, completed_at: null, created_at: old, progress: 5,
        retry_of: null, attempt: 1, cancel_requested_at: null, idempotency_key: 'old-key',
      }],
      events: [],
      usage: { included: 200, used: 0 },
    }));
  }, session.id);

  await page.goto('http://127.0.0.1:3000/studio/runs');
  await expect(page.getByRole('heading', { name: 'Jobs' })).toBeVisible();
  await expect(page.getByText('Generation was interrupted and can be retried.')).toBeVisible();
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByText('succeeded').first()).toBeVisible();
  await expect(page.getByText('196 credits')).toBeVisible();

  const state = await page.evaluate(userId => JSON.parse(localStorage.getItem(`ts_production_v1:${userId}`)), session.id);
  expect(state.runs).toHaveLength(2);
  expect(state.runs.filter(run => run.status === 'succeeded')).toHaveLength(1);
  expect(state.usage.used).toBe(4);
});

test('managed generation is primary and BYOK stays advanced', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000/studio/settings');
  await expect(page.getByRole('heading', { name: 'Generation Settings' })).toBeVisible();
  await expect(page.getByText('200 credits remaining')).toBeVisible();
  await expect(page.getByText('OpenAI API Key')).toBeHidden();
  await page.getByRole('button', { name: 'Advanced provider setup' }).click();
  await expect(page.getByText('OpenAI API Key')).toBeVisible();
});

test('cloud document bootstrap hydrates cache and mirrors writes', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000/');
  const result = await page.evaluate(async () => {
    const writes = [];
    const rows = [{ document_key: 'ts_characters', payload: { value: '[{"id":"cloud-creator"}]' } }];
    const db = {
      from(table) {
        return {
          select() {
            return { in: async () => ({ data: rows, error: null }) };
          },
          async upsert(payload) {
            writes.push({ table, payload });
            return { error: null };
          },
          insert() {
            return Promise.resolve({ error: null });
          },
        };
      },
    };
    const store = await import('/src/lib/cloudStore.js');
    await store.bootstrapCloudStore(db, 'cloud-user');
    await store.persistCloudDocument('ts_library', '[{"id":"asset-1"}]');
    return {
      characters: localStorage.getItem('ts_characters'),
      writes,
    };
  });
  expect(result.characters).toBe('[{"id":"cloud-creator"}]');
  expect(result.writes).toContainEqual({
    table: 'studio_documents',
    payload: {
      user_id: 'cloud-user',
      document_key: 'ts_library',
      payload: { value: '[{"id":"asset-1"}]' },
    },
  });
});
