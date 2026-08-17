const USERS_KEY = 'thee-studio:e2e-users';
const SESSION_KEY = 'thee-studio:e2e-session';
const FUNCTION_CALLS_KEY = 'thee-studio:e2e-function-calls';
const PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEAQH/6ZcmWQAAAABJRU5ErkJggg==';

function read(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; }
}

function sessionFor(user) {
  return { access_token: `e2e-${user.id}`, user };
}

export function createE2eAuthClient() {
  const listeners = new Set();
  const emit = (event, session) => listeners.forEach(listener => listener(event, session));
  const current = () => {
    const stored = read(SESSION_KEY, null);
    if (stored?.user) return stored;
    const legacy = read('ts_auth_session', null);
    if (!legacy?.id) return null;
    return sessionFor({ id: legacy.id, email: legacy.email || 'qa@test.local', user_metadata: { name: legacy.name || 'QA Test' } });
  };
  const auth = {
    getSession: async () => ({ data: { session: current() }, error: null }),
    onAuthStateChange(callback) {
      listeners.add(callback);
      queueMicrotask(() => callback('INITIAL_SESSION', current()));
      return { data: { subscription: { unsubscribe: () => listeners.delete(callback) } } };
    },
    async signUp({ email, password, options }) {
      const users = read(USERS_KEY, []);
      if (users.some(user => user.email === email)) return { data: {}, error: new Error('User already registered') };
      const user = { id: crypto.randomUUID(), email, password, user_metadata: { name: options?.data?.name || email.split('@')[0] } };
      users.push(user); localStorage.setItem(USERS_KEY, JSON.stringify(users));
      const session = sessionFor(user); localStorage.setItem(SESSION_KEY, JSON.stringify(session)); emit('SIGNED_IN', session);
      return { data: { session }, error: null };
    },
    async signInWithPassword({ email, password }) {
      const user = read(USERS_KEY, []).find(item => item.email === email);
      if (!user || user.password !== password) return { data: {}, error: new Error('Invalid login credentials') };
      const session = sessionFor(user); localStorage.setItem(SESSION_KEY, JSON.stringify(session)); emit('SIGNED_IN', session);
      return { data: { session }, error: null };
    },
    async signOut() { localStorage.removeItem(SESSION_KEY); localStorage.removeItem('ts_auth_session'); emit('SIGNED_OUT', null); return { error: null }; },
    async updateUser() { return { data: { user: current()?.user || null }, error: null }; },
    async resetPasswordForEmail() { return { data: {}, error: null }; },
    async signInWithOAuth() { return { data: {}, error: null }; },
  };
  const libraryAction = body => {
    const items = read('ts_library', []);
    if (body?.action === 'list') return { items };
    if (body?.action === 'delete') {
      const item = items.find(entry => entry.id === body.itemId) || { id: body.itemId, deletedAt: new Date().toISOString() };
      localStorage.setItem('ts_library', JSON.stringify(items.filter(entry => entry.id !== body.itemId)));
      return { item };
    }
    if (body?.action === 'update_review') {
      const item = { ...items.find(entry => entry.id === body.itemId), status: body.status, note: body.notes };
      localStorage.setItem('ts_library', JSON.stringify(items.map(entry => entry.id === body.itemId ? item : entry)));
      return { item };
    }
    if (body?.action === 'save_generated' || body?.action === 'register_upload') {
      const existing = body.action === 'save_generated'
        ? items.find(entry => entry.parentBatchId === body.parentBatchId && Number(entry.slotIndex) === Number(body.slotIndex))
        : items.find(entry => entry.originalStoragePath === body.storagePath);
      if (existing) return { item: existing };
      const item = {
        id: crypto.randomUUID(), url: PIXEL, source: body.source || 'director',
        parentBatchId: body.parentBatchId || null, slotIndex: body.slotIndex ?? null,
        sceneShotId: body.sceneShotId || null, originalStoragePath: body.storagePath || null,
        prompt: body.prompt || '', settings: body.settings || {}, character: body.creatorId || null,
        status: 'unreviewed', savedAt: new Date().toISOString(),
      };
      localStorage.setItem('ts_library', JSON.stringify([item, ...items]));
      return { item };
    }
    return { item: null };
  };
  return {
    __e2e: true,
    auth,
    functions: {
      invoke: async (name, options = {}) => {
        const calls = read(FUNCTION_CALLS_KEY, []);
        calls.push({ name, body: options.body || null });
        localStorage.setItem(FUNCTION_CALLS_KEY, JSON.stringify(calls));
        if (name === 'thee-access') return { data: { allowed: true, reason: 'e2e', role: 'owner', account_type: 'internal', plan_key: 'e2e', billing_exempt: true, credit_deduction_enabled: false, usage_tracking_enabled: false, all_features: true, admin_access_enabled: true, enforcement_enabled: false }, error: null };
        if (name === 'cast-quick-shoot-recover') return { data: { status: 'none' }, error: null };
        if (name === 'cast-quick-shoot') {
          const count = Math.max(1, Math.min(5, Number(options.body?.batchSize) || 1));
          const parentBatchId = crypto.randomUUID();
          return { data: {
            status: 'succeeded', jobId: parentBatchId, parentBatchId, requestedCount: count,
            succeededCount: count, providerBlockedCount: 0, failedCount: 0, cancelledCount: 0,
            slots: Array.from({ length: count }, (_, slotIndex) => ({
              slotIndex, status: 'succeeded', imageUrl: PIXEL,
              sceneShotId: options.body?.sequenceShots?.[slotIndex]?.shotId || null,
              providerRequestId: `e2e-request-${slotIndex}`,
            })),
          }, error: null };
        }
        if (name === 'library-items') return { data: libraryAction(options.body), error: null };
        return { data: null, error: new Error(`Unexpected E2E function call: ${name}`) };
      },
    },
  };
}
