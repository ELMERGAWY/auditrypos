import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

const GRAPH_VERSION = Deno.env.get('META_GRAPH_VERSION') || 'v26.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

async function readJson(response: Response): Promise<any> {
  const text = await response.text();
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

async function getUser(req: Request, url: string, anonKey: string) {
  const authHeader = req.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const client = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data } = await client.auth.getUser();
  return data.user || null;
}

async function getRestaurant(admin: SupabaseClient, restaurantId: string) {
  const { data, error } = await admin.from('restaurants').select('id, owner_id, company_id').eq('id', restaurantId).maybeSingle();
  if (error || !data) throw new Error('Restaurant not found');
  return data;
}

async function assertPermission(admin: SupabaseClient, restaurantId: string, userId: string, permission: string) {
  const restaurant = await getRestaurant(admin, restaurantId);
  if (restaurant.owner_id === userId) return restaurant;
  const { data, error } = await admin.rpc('check_user_permission', {
    p_user_id: userId,
    p_company_id: restaurant.company_id,
    p_permission_code: permission,
  });
  if (error || data !== true) throw new Error('Insufficient marketing ads permission');
  return restaurant;
}

async function graphGet(path: string, token: string, params: Record<string, string> = {}) {
  const url = new URL(`${GRAPH_BASE}${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  url.searchParams.set('access_token', token);
  const response = await fetch(url);
  const data = await readJson(response);
  if (!response.ok || data?.error) throw new Error(data?.error?.message || `Meta Ads request failed (${response.status})`);
  return data;
}

async function graphPost(path: string, token: string, params: Record<string, string>) {
  const response = await fetch(`${GRAPH_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...params, access_token: token }),
  });
  const data = await readJson(response);
  if (!response.ok || data?.error) throw new Error(data?.error?.message || `Meta Ads update failed (${response.status})`);
  return data;
}

async function loadAdAccount(admin: SupabaseClient, restaurantId: string, socialAccountId: string) {
  const { data, error } = await admin.from('social_media_accounts')
    .select('id, account_id, account_name, access_token, metadata, is_active, token_expires_at')
    .eq('id', socialAccountId)
    .eq('restaurant_id', restaurantId)
    .eq('platform', 'facebook')
    .eq('is_active', true)
    .maybeSingle();
  if (error || !data || !data.access_token) throw new Error('Active Meta ad account connection not found');
  if (data.metadata?.asset_type && data.metadata.asset_type !== 'meta_ad_account') throw new Error('Selected connection is not a Meta ad account');
  return data;
}

function providerAccountId(accountId: string) {
  return accountId.startsWith('act_') ? accountId : `act_${accountId}`;
}

function sumActions(actions: any[], names: string[]) {
  return (actions || []).filter((action) => names.includes(String(action.action_type))).reduce((sum, action) => sum + Number(action.value || 0), 0);
}

function numberOrZero(value: any) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function isoDate(value: string | undefined, fallback: string) {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString().slice(0, 10);
}

async function syncInsights(admin: SupabaseClient, restaurantId: string, userId: string, account: any, dateFrom: string, dateTo: string) {
  const adAccountId = providerAccountId(account.account_id);
  const run = await admin.from('social_ads_sync_runs').insert({
    restaurant_id: restaurantId,
    platform: 'facebook',
    ad_account_id: adAccountId,
    date_from: dateFrom,
    date_to: dateTo,
    status: 'running',
    started_by: userId,
  }).select('id').single();
  if (run.error || !run.data) throw new Error('Could not create ads sync run');
  const runId = run.data.id;
  let campaignsSynced = 0;
  let insightsSynced = 0;
  let spendTotal = 0;

  try {
    const campaigns = await graphGet(`/${adAccountId}/campaigns`, account.access_token, {
      fields: 'id,name,status,objective,start_time,stop_time,daily_budget,lifetime_budget',
      limit: '100',
    });
    for (const campaign of campaigns.data || []) {
      if (!campaign.id) continue;
      const localCampaign = await admin.from('marketing_ad_campaigns').upsert({
        restaurant_id: restaurantId,
        campaign_id: String(campaign.id),
        campaign_name: campaign.name || campaign.id,
        platform: 'facebook',
        campaign_status: campaign.status || 'UNKNOWN',
        start_date: isoDate(campaign.start_time, dateFrom),
        end_date: campaign.stop_time ? isoDate(campaign.stop_time, dateTo) : null,
        daily_budget: campaign.daily_budget ? Number(campaign.daily_budget) / 100 : null,
        lifetime_budget: campaign.lifetime_budget ? Number(campaign.lifetime_budget) / 100 : null,
        campaign_objective: campaign.objective || null,
        external_ad_account_id: adAccountId,
        last_synced_at: new Date().toISOString(),
        sync_status: 'synced',
        sync_error: null,
        metadata: { provider: 'meta', raw_campaign: campaign },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'restaurant_id,platform,campaign_id' }).select('id, campaign_id, campaign_name').single();
      if (localCampaign.error || !localCampaign.data) throw localCampaign.error || new Error('Could not save campaign');
      campaignsSynced += 1;

      const insights = await graphGet(`/${encodeURIComponent(String(campaign.id))}/insights`, account.access_token, {
        fields: 'campaign_id,campaign_name,date_start,date_stop,impressions,reach,clicks,ctr,spend,cpc,cpm,actions,action_values,purchase_roas',
        time_range: JSON.stringify({ since: dateFrom, until: dateTo }),
        time_increment: '1',
        limit: '500',
      });

      for (const row of insights.data || []) {
        const impressions = numberOrZero(row.impressions);
        const clicks = numberOrZero(row.clicks);
        const spend = numberOrZero(row.spend);
        const conversions = sumActions(row.actions, ['lead', 'onsite_conversion.lead_grouped', 'complete_registration', 'purchase']);
        const revenue = sumActions(row.action_values, ['purchase', 'omni_purchase']);
        const roas = numberOrZero(row.purchase_roas?.[0]?.value) || (spend > 0 ? revenue / spend : 0);
        const metricDate = String(row.date_start || dateFrom).slice(0, 10);
        const { error: performanceError } = await admin.from('marketing_ad_performance').upsert({
          restaurant_id: restaurantId,
          campaign_id: localCampaign.data.id,
          metric_date: metricDate,
          platform: 'facebook',
          campaign_name: row.campaign_name || localCampaign.data.campaign_name,
          external_campaign_id: String(campaign.id),
          external_ad_account_id: adAccountId,
          impressions,
          reach: numberOrZero(row.reach),
          clicks,
          click_through_rate: numberOrZero(row.ctr),
          engagements: sumActions(row.actions, ['post_engagement', 'page_engagement', 'onsite_conversion.post_save']),
          engagement_rate: impressions > 0 ? (sumActions(row.actions, ['post_engagement', 'page_engagement']) / impressions) * 100 : 0,
          conversions,
          conversion_rate: impressions > 0 ? (conversions / impressions) * 100 : 0,
          spend,
          cost_per_click: numberOrZero(row.cpc) || (clicks > 0 ? spend / clicks : 0),
          cost_per_conversion: conversions > 0 ? spend / conversions : 0,
          cost_per_thousand_impressions: numberOrZero(row.cpm) || (impressions > 0 ? spend / impressions * 1000 : 0),
          revenue,
          return_on_ad_spend: roas,
          attribution_window: 'provider_default',
          raw_data: row,
          synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: userId,
        }, { onConflict: 'campaign_id,metric_date' });
        if (performanceError) throw performanceError;
        insightsSynced += 1;
        spendTotal += spend;
      }
    }

    await admin.from('social_ads_sync_runs').update({
      status: 'completed', campaigns_synced: campaignsSynced, insights_synced: insightsSynced, spend_total: spendTotal, completed_at: new Date().toISOString(),
    }).eq('id', runId);
    return { runId, campaignsSynced, insightsSynced, spendTotal };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Meta Insights sync failed';
    await admin.from('social_ads_sync_runs').update({ status: 'failed', campaigns_synced: campaignsSynced, insights_synced: insightsSynced, spend_total: spendTotal, error_message: message.slice(0, 1000), completed_at: new Date().toISOString() }).eq('id', runId);
    throw error;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !anonKey || !serviceKey) return json({ error: 'Ads service is not configured' }, 500);
    const user = await getUser(req, supabaseUrl, anonKey);
    if (!user) return json({ error: 'Unauthorized' }, 401);
    const admin = createClient(supabaseUrl, serviceKey);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || '');
    const restaurantId = String(body.restaurantId || '');
    const socialAccountId = String(body.socialAccountId || '');
    if (!restaurantId) return json({ error: 'restaurantId is required' }, 400);

    if (action === 'list_ad_accounts') {
      await assertPermission(admin, restaurantId, user.id, 'marketing.ads.read');
      const { data: accounts, error } = await admin.from('social_media_accounts')
        .select('id, account_id, account_name, account_handle, account_avatar_url, token_expires_at, is_active, metadata')
        .eq('restaurant_id', restaurantId)
        .eq('platform', 'facebook')
        .eq('is_active', true);
      if (error) throw new Error('Could not load Meta ad accounts');
      return json({ accounts: (accounts || []).filter((account: any) => account.metadata?.asset_type === 'meta_ad_account').map((account: any) => ({
        id: account.id,
        account_id: account.account_id,
        account_name: account.account_name,
        account_handle: account.account_handle,
        account_avatar_url: account.account_avatar_url,
        token_expires_at: account.token_expires_at,
      })) });
    }

    if (action === 'sync') {
      if (!socialAccountId) return json({ error: 'socialAccountId is required' }, 400);
      await assertPermission(admin, restaurantId, user.id, 'marketing.ads.read');
      const account = await loadAdAccount(admin, restaurantId, socialAccountId);
      const today = new Date().toISOString().slice(0, 10);
      const from = String(body.dateFrom || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
      const to = String(body.dateTo || today);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) return json({ error: 'Invalid date range' }, 400);
      return json({ success: true, ...(await syncInsights(admin, restaurantId, user.id, account, from, to)) });
    }

    if (action === 'update_status') {
      await assertPermission(admin, restaurantId, user.id, 'marketing.ads.manage');
      const campaignId = String(body.campaignId || '');
      const status = String(body.status || '').toUpperCase();
      if (!campaignId || !['ACTIVE', 'PAUSED'].includes(status)) return json({ error: 'Only ACTIVE and PAUSED campaign states are allowed' }, 400);
      const { data: campaign } = await admin.from('marketing_ad_campaigns').select('id, campaign_id, external_ad_account_id').eq('id', campaignId).eq('restaurant_id', restaurantId).maybeSingle();
      if (!campaign) return json({ error: 'Campaign not found' }, 404);
      const { data: accounts } = await admin.from('social_media_accounts').select('id, account_id, access_token, metadata').eq('restaurant_id', restaurantId).eq('platform', 'facebook').eq('is_active', true);
      const account = (accounts || []).find((item: any) => providerAccountId(item.account_id) === campaign.external_ad_account_id && item.metadata?.asset_type === 'meta_ad_account');
      if (!account?.access_token) return json({ error: 'Ad account connection not found' }, 404);
      const result = await graphPost(`/${encodeURIComponent(campaign.campaign_id)}`, account.access_token, { status });
      await admin.from('marketing_ad_campaigns').update({ campaign_status: status, updated_at: new Date().toISOString(), sync_error: null }).eq('id', campaign.id);
      return json({ success: true, status, provider: { keys: Object.keys(result || {}) } });
    }

    return json({ error: 'Unknown ads action' }, 400);
  } catch (error) {
    console.error('social-ads error:', error instanceof Error ? error.message : 'unknown error');
    return json({ error: error instanceof Error ? error.message : 'Ads request failed' }, 400);
  }
});
