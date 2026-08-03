import React from 'react';
import { supabase } from '../lib/supabase.js';

export const ACCESS_FIELDS = [
  'allowed',
  'reason',
  'role',
  'account_type',
  'plan_key',
  'billing_exempt',
  'credit_deduction_enabled',
  'usage_tracking_enabled',
  'all_features',
  'admin_access_enabled',
  'enforcement_enabled',
];

export function normalizeAccess(value) {
  if (!value || typeof value !== 'object' || typeof value.allowed !== 'boolean') {
    throw new Error('Access service returned an invalid response.');
  }
  return Object.fromEntries(ACCESS_FIELDS.map(field => [field, value[field] ?? null]));
}

async function responsePayload(error) {
  const response = error?.context;
  if (!response || typeof response.clone !== 'function') return null;
  try { return await response.clone().json(); } catch { return null; }
}

export async function fetchStudioAccess(client = supabase) {
  if (!client) throw new Error('Staging connection is not configured.');
  const { data, error } = await client.functions.invoke('thee-access', {
    body: { feature: 'studio' },
  });
  if (!error) return normalizeAccess(data);

  const payload = await responsePayload(error);
  if (payload && typeof payload.allowed === 'boolean') return normalizeAccess(payload);
  if (error?.context?.status === 401) {
    return normalizeAccess({ allowed: false, reason: 'unauthenticated' });
  }
  throw new Error('The access service is unavailable.');
}

export function accessView(access, error = '') {
  if (error) return { state: 'network_failure', title: 'Service unavailable', detail: 'Thee Studio could not verify access. Try again shortly.' };
  if (!access) return { state: 'loading', title: 'Connecting…', detail: '' };
  if (access.allowed) return { state: 'allowed', title: 'Connected', detail: '' };
  if (access.reason === 'unauthenticated') return { state: 'unauthenticated', title: 'Sign-in required', detail: '' };
  if (access.reason === 'pricing_required') return { state: 'pricing_required', title: 'Access required', detail: 'This account does not currently include Studio access.' };
  if (access.reason === 'feature_not_entitled') return { state: 'feature_not_entitled', title: 'Feature unavailable', detail: 'This plan does not include Studio access.' };
  if (String(access.reason).includes('suspended')) return { state: 'suspended', title: 'Account suspended', detail: 'Contact support to restore access.' };
  return { state: 'denied', title: 'Access denied', detail: 'This account cannot open Studio.' };
}

export function accessBadgeLabel(access) {
  if (access?.account_type === 'internal' && access?.credit_deduction_enabled === false) {
    return access.role === 'owner' ? 'Owner access · usage tracked' : 'Internal access · usage tracked';
  }
  return access?.plan_key ? `${access.plan_key} access` : 'Studio access';
}

export function useStudioAccess(session, client = supabase) {
  const [access, setAccess] = React.useState(null);
  const [loading, setLoading] = React.useState(Boolean(session));
  const [error, setError] = React.useState('');
  const [revision, setRevision] = React.useState(0);

  React.useEffect(() => {
    let active = true;
    if (!session) {
      setAccess(null);
      setError('');
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    setError('');
    fetchStudioAccess(client).then(value => {
      if (active) setAccess(value);
    }).catch(() => {
      if (active) {
        setAccess(null);
        setError('network_failure');
      }
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [client, session?.access_token, revision]);

  return {
    access,
    loading,
    error,
    refresh: React.useCallback(() => setRevision(value => value + 1), []),
  };
}
