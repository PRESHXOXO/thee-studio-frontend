import { getSupabase, hasSupabaseConfig, readSupabaseConfig } from '../lib/supabase.js';

export async function adminTelemetryRequest(action, payload = {}) {
  if (!hasSupabaseConfig()) throw new Error('Admin telemetry requires cloud mode.');
  const { data, error } = await getSupabase().functions.invoke('thee-admin-telemetry', {
    body: { action, ...payload },
  });
  if (error) throw new Error(error.message || 'Admin telemetry request failed.');
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function fetchAdminAccess() {
  try {
    const data = await adminTelemetryRequest('access');
    return { allowed: Boolean(data?.allowed), role: data?.role || null };
  } catch {
    return { allowed: false, role: null };
  }
}

export async function downloadTelemetryCsv(exportType, periodStart) {
  const db = getSupabase();
  const { publishableKey, url: supabaseUrl } = readSupabaseConfig(import.meta.env);
  const { data } = await db.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Admin session expired.');
  const endpoint = `${supabaseUrl}/functions/v1/thee-admin-telemetry`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      apikey: publishableKey,
    },
    body: JSON.stringify({ action: 'export_csv', exportType, periodStart }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`CSV export failed (${response.status}): ${detail.slice(0, 200)}`);
  }
  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition') || '';
  const filename = disposition.match(/filename="([^"]+)"/)?.[1] || `thee-studio-${exportType}.csv`;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
