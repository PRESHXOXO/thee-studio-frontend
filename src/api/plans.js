import { supabase } from '../lib/supabase.js';

export async function fetchBillingCatalog(client = supabase, now = new Date()) {
  if (!client) throw new Error('The plan catalog is unavailable.');
  const [plansResult, versionsResult] = await Promise.all([
    client.from('billing_plans').select('id,plan_key,display_name,checkout_enabled').eq('active', true).eq('customer_visible', true).eq('internal_only', false),
    client.from('billing_plan_versions').select('id,plan_id,version,price_minor,currency,billing_interval,included_credits,effective_from,effective_to'),
  ]);
  if (plansResult.error || versionsResult.error) throw new Error('The plan catalog could not be loaded.');
  const instant = now.getTime();
  return (plansResult.data || []).map(plan => {
    const versions = (versionsResult.data || []).filter(version => version.plan_id === plan.id && new Date(version.effective_from).getTime() <= instant && (!version.effective_to || new Date(version.effective_to).getTime() > instant)).sort((a, b) => b.version - a.version);
    return { ...plan, version: versions[0] || null };
  }).filter(plan => plan.version).sort((a, b) => a.version.price_minor - b.version.price_minor);
}

export async function selectFreePlan(client = supabase) {
  if (!client) throw new Error('Sign in before selecting a plan.');
  const { data, error } = await client.rpc('select_free_plan');
  if (error || data?.allowed !== true) throw new Error('The Free plan could not be selected.');
  return data;
}
