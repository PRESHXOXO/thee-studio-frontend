const DEFAULT_API_BASE = '/api';

function cleanBase(value) {
  return String(value || DEFAULT_API_BASE).replace(/\/$/, '') || DEFAULT_API_BASE;
}

function apiSession(user) {
  if (!user) return null;
  return {
    access_token: 'api-session',
    user: {
      id: user.id,
      email: user.email,
      user_metadata: user.userMetadata || user.user_metadata || {},
      app_metadata: user.appMetadata || user.app_metadata || {},
    },
  };
}

function accessFromUser(user) {
  const app = user?.appMetadata || user?.app_metadata || {};
  const rawRole = app.role || (Array.isArray(app.roles) ? app.roles[0] : '') || 'user';
  const role = String(rawRole).toLowerCase();
  const admin = role === 'owner' || role === 'admin' || app.admin === true || app.isAdmin === true;
  return {
    allowed: true,
    reason: null,
    role,
    account_type: admin ? 'internal' : 'customer',
    plan_key: app.planKey || app.plan_key || null,
    billing_exempt: admin,
    credit_deduction_enabled: !admin,
    usage_tracking_enabled: true,
    all_features: admin || app.allFeatures === true || app.all_features === true,
    admin_access_enabled: admin,
    enforcement_enabled: true,
  };
}

export function createApiSupabaseClient(baseUrl = DEFAULT_API_BASE, fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== 'function') throw new Error('Fetch is unavailable.');
  const base = cleanBase(baseUrl);
  let csrfToken = '';
  const listeners = new Set();

  async function refreshCsrf() {
    const response = await fetchImpl(`${base}/auth/csrf`, { credentials: 'include' });
    if (!response.ok) throw new Error('Could not initialize the secure session.');
    const payload = await response.json();
    csrfToken = payload?.csrfToken || '';
    return csrfToken;
  }

  async function request(path, options = {}) {
    const method = options.method || 'GET';
    const headers = {
      ...(options.body instanceof FormData ? {} : { 'content-type': 'application/json' }),
      ...(options.headers || {}),
    };
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
      && path !== '/auth/login'
      && path !== '/auth/signup') {
      headers['x-csrf-token'] = csrfToken || await refreshCsrf();
    }
    const response = await fetchImpl(`${base}${path}`, {
      ...options,
      method,
      headers,
      credentials: 'include',
    });
    let payload = {};
    try { payload = await response.json(); } catch { /* non-JSON responses are handled below */ }
    if (response.ok) return { data: payload, error: null };
    const error = new Error(payload?.error || payload?.message || 'Request failed');
    error.context = response;
    return { data: null, error };
  }

  function query(table, state = {}) {
    const next = patch => query(table, { ...state, ...patch });
    const executeRead = async () => {
      let path = `/compat/${encodeURIComponent(table)}`;
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(state.filters || {})) params.set(key, value);
      if (params.size) path += `?${params}`;
      const result = await request(path);
      return { data: result.data?.rows || result.data || [], error: result.error };
    };
    const builder = {
      select: () => next({}),
      eq: (key, value) => next({ filters: { ...(state.filters || {}), [key]: value } }),
      order: () => next({}),
      limit: () => next({}),
      maybeSingle: async () => {
        const result = await executeRead();
        return { data: Array.isArray(result.data) ? result.data[0] || null : result.data, error: result.error };
      },
      single: async () => {
        const result = await executeRead();
        return { data: Array.isArray(result.data) ? result.data[0] : result.data, error: result.error };
      },
      insert: value => next({ write: { method: 'POST', value } }),
      update: value => next({ write: { method: 'PATCH', value } }),
      delete: () => next({ write: { method: 'DELETE', value: {} } }),
    };
    builder.then = async (resolve, reject) => {
      try {
        const result = state.write
          ? await request(`/compat/${encodeURIComponent(table)}`, {
            method: state.write.method,
            body: JSON.stringify(state.write.value || {}),
          })
          : await executeRead();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    };
    return builder;
  }

  const auth = {
    getSession: async () => {
      const result = await request('/auth/session');
      return { data: { session: apiSession(result.data?.user) }, error: result.error };
    },
    getUser: async () => {
      const result = await request('/auth/session');
      return { data: { user: result.data?.user || null }, error: result.error };
    },
    signInWithPassword: async ({ email, password }) => {
      const result = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (result.error) return { data: {}, error: result.error };
      await refreshCsrf();
      const session = apiSession(result.data?.user);
      listeners.forEach(listener => listener('SIGNED_IN', session));
      return { data: { session }, error: null };
    },
    signUp: async ({ email, password, options }) => {
      const result = await request('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password, name: options?.data?.name }),
      });
      return { data: { session: null }, error: result.error };
    },
    signOut: async () => {
      const result = await request('/auth/logout', { method: 'POST', body: '{}' });
      if (!result.error) listeners.forEach(listener => listener('SIGNED_OUT', null));
      return { error: result.error };
    },
    onAuthStateChange: listener => {
      listeners.add(listener);
      auth.getSession().then(({ data }) => listener('INITIAL_SESSION', data.session));
      return { data: { subscription: { unsubscribe: () => listeners.delete(listener) } } };
    },
  };

  return {
    __api: true,
    auth,
    from: table => query(table),
    storage: {
      from: bucket => ({
        createSignedUrl: async path => ({
          data: { signedUrl: `${base}/assets/download/${encodeURIComponent(bucket)}/${path}` },
          error: null,
        }),
        download: async path => {
          const response = await fetchImpl(`${base}/assets/download/${encodeURIComponent(bucket)}/${path}`, { credentials: 'include' });
          return {
            data: response.ok ? await response.blob() : null,
            error: response.ok ? null : new Error('Download failed'),
          };
        },
      }),
    },
    functions: {
      invoke: async (name, options = {}) => {
        const body = options.body || {};
        if (name === 'thee-access') {
          const me = await request('/auth/me');
          if (me.error) return { data: null, error: me.error };
          return { data: accessFromUser(me.data?.user || me.data), error: null };
        }
        if (name === 'crisp-generate-stills') {
          return request('/generation', {
            method: 'POST',
            body: JSON.stringify({
              prompt: body.prompt,
              creatorId: body.creatorId,
              providerRunId: body.runId,
              stillGenerationId: body.generationId,
              idempotencyKey: options.headers?.['idempotency-key'],
            }),
          });
        }
        if (name === 'library-items') {
          if (body.action === 'update_review') {
            return request(`/library/${body.itemId}/review`, {
              method: 'PATCH',
              body: JSON.stringify({ status: body.status, notes: body.notes }),
            });
          }
          if (body.action === 'delete') return request(`/library/${body.itemId}`, { method: 'DELETE' });
          if (body.action === 'restore') return request(`/library/${body.itemId}/restore`, { method: 'POST', body: '{}' });
          return request('/library');
        }
        return { data: null, error: new Error(`Unsupported API operation: ${name}`) };
      },
    },
  };
}
