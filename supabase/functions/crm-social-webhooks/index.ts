import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

const GRAPH_VERSION = Deno.env.get('META_GRAPH_VERSION') || 'v26.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-token, x-hub-signature-256',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function readJson(response: Response): Promise<any> {
  const text = await response.text();
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

async function fetchMeta(path: string, token: string) {
  const separator = path.includes('?') ? '&' : '?';
  const response = await fetch(`${GRAPH_BASE}${path}${separator}access_token=${encodeURIComponent(token)}`);
  const data = await readJson(response);
  if (!response.ok || data?.error) throw new Error(data?.error?.message || `Meta request failed (${response.status})`);
  return data;
}

function firstField(fieldData: any[], names: string[]): string {
  const field = (fieldData || []).find((entry) => names.includes(String(entry.field_name || entry.name || entry.column_id)));
  return String(field?.values?.[0] ?? field?.string_value ?? '').trim();
}

function metaPageIdFromPayload(body: any): string | null {
  const entry = Array.isArray(body?.entry) ? body.entry.find((candidate: any) => candidate?.id) : null;
  return entry?.id ? String(entry.id) : null;
}

async function resolveRestaurantId(admin: SupabaseClient, requestedRestaurantId: string | null, pageId: string | null): Promise<string | null> {
  if (!pageId) return requestedRestaurantId;

  const { data, error } = await admin.from('social_media_accounts')
    .select('restaurant_id')
    .eq('platform', 'facebook')
    .eq('account_id', pageId)
    .eq('is_active', true)
    .limit(2);
  if (error) throw new Error('Could not resolve Meta Page tenant');
  const restaurantIds = Array.from(new Set((data || []).map((row: any) => String(row.restaurant_id)).filter(Boolean)));
  if (restaurantIds.length > 1) throw new Error('Meta Page is connected to more than one restaurant');
  const resolvedRestaurantId = restaurantIds[0] || null;
  if (requestedRestaurantId && resolvedRestaurantId && requestedRestaurantId !== resolvedRestaurantId) {
    throw new Error('Meta Page does not belong to the requested restaurant');
  }
  return requestedRestaurantId || resolvedRestaurantId;
}

async function loadPlatformConfig(admin: SupabaseClient, restaurantId: string | null, platform: string) {
  if (restaurantId) {
    const { data } = await admin.from('crm_platform_configs')
      .select('api_secret, webhook_verify_token, is_active')
      .eq('restaurant_id', restaurantId)
      .eq('platform', platform)
      .maybeSingle();
    if (data) return data;
  }
  const { data } = await admin.from('crm_platform_configs')
    .select('api_secret, webhook_verify_token, is_active')
    .is('restaurant_id', null)
    .eq('platform', platform)
    .maybeSingle();
  return data;
}

async function loadOauthSecret(admin: SupabaseClient, restaurantId: string | null): Promise<string | null> {
  if (restaurantId) {
    const { data } = await admin.from('social_media_oauth_config')
      .select('client_secret')
      .eq('platform', 'facebook')
      .eq('restaurant_id', restaurantId)
      .maybeSingle();
    if (data?.client_secret) return data.client_secret;
  }
  const { data } = await admin.from('social_media_oauth_config')
    .select('client_secret')
    .eq('platform', 'facebook')
    .is('restaurant_id', null)
    .maybeSingle();
  return data?.client_secret || null;
}

async function getMetaPageToken(admin: SupabaseClient, restaurantId: string, pageId: string): Promise<string | null> {
  const { data } = await admin.from('social_media_accounts')
    .select('access_token, metadata')
    .eq('restaurant_id', restaurantId)
    .eq('platform', 'facebook')
    .eq('account_id', pageId)
    .eq('is_active', true)
    .maybeSingle();
  return data?.access_token || null;
}

async function loadLeadData(admin: SupabaseClient, restaurantId: string, leadId: string, pageId: string, fallback: any) {
  const pageToken = await getMetaPageToken(admin, restaurantId, pageId);
  if (!pageToken) throw new Error('No active Meta Page token for Lead Ads event');
  const lead = await fetchMeta(`/${encodeURIComponent(leadId)}?fields=id,created_time,field_data,ad_id,adset_id,campaign_id,form_id`, pageToken);
  const fieldData = lead.field_data || [];
  const name = firstField(fieldData, ['full_name', 'name']) || [
    firstField(fieldData, ['first_name']),
    firstField(fieldData, ['last_name']),
  ].filter(Boolean).join(' ') || 'Meta Lead';
  return {
    restaurant_id: restaurantId,
    lead_code: `META-${lead.id}`.slice(0, 50),
    name,
    phone: firstField(fieldData, ['phone_number', 'phone']),
    email: firstField(fieldData, ['email']),
    source: 'social_media',
    stage: 'new',
    platform: 'facebook',
    campaign_name: lead.campaign_id || fallback?.campaign_name || 'Meta Lead Ad',
    external_lead_id: lead.id,
    external_ad_id: lead.ad_id || null,
    external_adset_id: lead.adset_id || null,
    external_campaign_id: lead.campaign_id || null,
    external_form_id: lead.form_id || null,
    source_details: { provider: 'meta', page_id: pageId, received: fallback, fetched: lead },
    raw_social_data: lead,
  };
}

async function upsertLead(admin: SupabaseClient, lead: any) {
  const { data: existing } = await admin.from('crm_leads')
    .select('id')
    .eq('restaurant_id', lead.restaurant_id)
    .eq('source', lead.source)
    .eq('external_lead_id', lead.external_lead_id)
    .maybeSingle();
  if (existing) return { id: existing.id, created: false };

  const { data, error } = await admin.from('crm_leads').insert(lead).select('id').single();
  if (error) {
    if (error.code === '23505') {
      const { data: duplicate } = await admin.from('crm_leads').select('id').eq('restaurant_id', lead.restaurant_id).eq('external_lead_id', lead.external_lead_id).maybeSingle();
      if (duplicate) return { id: duplicate.id, created: false };
    }
    throw error;
  }
  return { id: data.id, created: true };
}

async function insertInboxMessage(admin: SupabaseClient, message: any) {
  if (!message.external_message_id) return null;
  const { data: existing } = await admin.from('crm_social_messages')
    .select('id')
    .eq('restaurant_id', message.restaurant_id)
    .eq('platform', message.platform)
    .eq('external_message_id', message.external_message_id)
    .maybeSingle();
  if (existing) return { id: existing.id, created: false };
  const { data, error } = await admin.from('crm_social_messages').insert(message).select('id').single();
  if (error) {
    if (error.code === '23505') return { created: false };
    throw error;
  }
  return { id: data.id, created: true };
}

async function saveEvent(admin: SupabaseClient, event: any) {
  const { data: existing } = await admin.from('social_webhook_events').select('id, status').eq('restaurant_id', event.restaurant_id).eq('event_key', event.event_key).maybeSingle();
  if (existing) return { ...existing, duplicate: true };
  const { data, error } = await admin.from('social_webhook_events').insert(event).select('id, status').single();
  if (error && error.code === '23505') return { duplicate: true };
  if (error) throw error;
  return { ...data, duplicate: false };
}

async function markEvent(admin: SupabaseClient, eventId: string, status: string, errorMessage?: string) {
  await admin.from('social_webhook_events').update({
    status,
    error_message: errorMessage || null,
    processed_at: status === 'processed' || status === 'ignored' ? new Date().toISOString() : null,
  }).eq('id', eventId);
}

async function processMetaEntry(admin: SupabaseClient, restaurantId: string, entry: any, index: number) {
  const pageId = String(entry.id || '');
  const items: Array<{ type: string; externalId: string; payload: any }> = [];

  for (const messageEvent of entry.messaging || []) {
    const messageId = String(messageEvent.message?.mid || `${entry.time || Date.now()}-${index}`);
    items.push({ type: 'message', externalId: messageId, payload: messageEvent });
  }
  for (const change of entry.changes || []) {
    const value = change.value || {};
    const externalId = String(value.leadgen_id || value.comment_id || value.post_id || value.item_id || `${entry.time || Date.now()}-${index}`);
    items.push({ type: String(change.field || 'change'), externalId, payload: change });
  }

  for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
    const item = items[itemIndex];
    const eventKey = `meta:${pageId}:${item.type}:${item.externalId}:${itemIndex}`;
    const event = await saveEvent(admin, {
      restaurant_id: restaurantId,
      platform: 'meta',
      event_key: eventKey,
      event_type: item.type,
      external_event_id: item.externalId,
      payload: item.payload,
      signature_valid: true,
      status: 'received',
    });
    if (event.duplicate || !event.id) continue;

    try {
      if (item.type === 'leadgen' && item.payload.value?.leadgen_id) {
        const lead = await loadLeadData(admin, restaurantId, String(item.payload.value.leadgen_id), pageId, item.payload.value);
        await upsertLead(admin, lead);
        await markEvent(admin, event.id, 'processed');
        continue;
      }

      if (item.type === 'message' && item.payload.message?.text) {
        const senderId = String(item.payload.sender?.id || '');
        await insertInboxMessage(admin, {
          restaurant_id: restaurantId,
          sender_name: senderId || 'Meta user',
          sender_external_id: senderId,
          message_content: String(item.payload.message.text).slice(0, 10000),
          platform: 'meta',
          external_message_id: item.externalId,
          conversation_id: `${pageId}:${senderId}`,
          external_account_id: pageId,
          source_event_id: event.id,
          message_type: 'message',
          metadata: item.payload,
          status: 'unread',
        });
        await markEvent(admin, event.id, 'processed');
        continue;
      }

      if (item.type === 'feed') {
        const value = item.payload.value || {};
        const messageText = value.message || value.item || '';
        if (messageText) {
          await insertInboxMessage(admin, {
            restaurant_id: restaurantId,
            sender_name: value.from?.name || 'Meta user',
            sender_external_id: value.from?.id || null,
            message_content: String(messageText).slice(0, 10000),
            platform: 'meta',
            external_message_id: String(value.comment_id || item.externalId),
            conversation_id: `${pageId}:${value.from?.id || 'feed'}`,
            external_account_id: pageId,
            source_event_id: event.id,
            message_type: 'comment',
            metadata: value,
            status: 'unread',
          });
        }
        await markEvent(admin, event.id, 'processed');
        continue;
      }

      await markEvent(admin, event.id, 'ignored');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Webhook event processing failed';
      await markEvent(admin, event.id, 'failed', message.slice(0, 1000));
      throw error;
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const url = new URL(req.url);
  const platform = url.searchParams.get('platform') || 'meta';
  const requestedRestaurantId = url.searchParams.get('restaurant_id');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return jsonResponse({ error: 'Server not configured' }, 500);
  const admin = createClient(supabaseUrl, serviceKey);

  let body: any = null;
  let rawBody = '';
  if (req.method === 'POST') {
    rawBody = await req.text();
    try { body = JSON.parse(rawBody); } catch { return jsonResponse({ error: 'Invalid JSON payload' }, 400); }
  }
  const pageId = platform === 'meta' ? metaPageIdFromPayload(body) : null;
  const restaurantId = await resolveRestaurantId(admin, requestedRestaurantId, pageId);
  if (!restaurantId && req.method === 'POST') return jsonResponse({ error: 'restaurant_id is required until the Meta Page is connected' }, 400);

  const platformConfig = await loadPlatformConfig(admin, restaurantId, platform);
  const oauthSecret = platform === 'meta' ? await loadOauthSecret(admin, restaurantId) : null;
  const config = {
    api_secret: platformConfig?.api_secret || oauthSecret || null,
    webhook_verify_token: platformConfig?.webhook_verify_token || Deno.env.get('META_WEBHOOK_VERIFY_TOKEN') || null,
    is_active: platformConfig?.is_active ?? true,
  };
  if (config.is_active === false || (!config.api_secret && platform === 'meta') || !config.webhook_verify_token) {
    return jsonResponse({ error: 'Webhook not configured' }, 403);
  }

  if (req.method === 'GET' && platform === 'meta') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    if (mode === 'subscribe' && challenge && config.webhook_verify_token && token === config.webhook_verify_token) {
      return new Response(challenge, { status: 200 });
    }
    return jsonResponse({ error: 'Verification failed' }, 403);
  }
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  if (platform === 'meta') {
    const signature = req.headers.get('x-hub-signature-256') || '';
    if (!config.api_secret || !signature.startsWith('sha256=')) return jsonResponse({ error: 'Invalid signature' }, 401);
    const expected = await hmacSha256Hex(config.api_secret, rawBody);
    if (signature.slice(7).toLowerCase() !== expected.toLowerCase()) return jsonResponse({ error: 'Invalid signature' }, 401);
  } else {
    const provided = req.headers.get('x-webhook-token') || url.searchParams.get('token') || '';
    if (!config.webhook_verify_token || provided !== config.webhook_verify_token) return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  try {
    if (platform === 'meta' && body.object === 'page') {
      for (const [index, entry] of (body.entry || []).entries()) {
        await processMetaEntry(admin, restaurantId, entry, index);
      }
    }
    return jsonResponse({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook processing failed';
    console.error('Webhook error:', message);
    return jsonResponse({ error: 'Webhook processing failed' }, 500);
  }
});
