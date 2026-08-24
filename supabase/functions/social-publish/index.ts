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
  if (error || data !== true) throw new Error('Insufficient marketing permission');
  return restaurant;
}

async function addEvent(admin: SupabaseClient, post: any, actorId: string, action: string, note?: string, metadata: Record<string, unknown> = {}) {
  await admin.from('social_media_approval_events').insert({
    restaurant_id: post.restaurant_id,
    post_id: post.id,
    actor_id: actorId,
    action,
    note: note || null,
    metadata,
  });
}

async function getSocialMessage(admin: SupabaseClient, messageId: string, restaurantId: string) {
  const { data, error } = await admin.from('crm_social_messages')
    .select('id, restaurant_id, platform, sender_external_id, message_content, message_type, external_message_id, external_account_id, created_at, status')
    .eq('id', messageId)
    .eq('restaurant_id', restaurantId)
    .maybeSingle();
  if (error || !data) throw new Error('Social message not found');
  return data;
}

async function graphJsonPost(path: string, token: string, payload: Record<string, unknown>) {
  const url = new URL(`${GRAPH_BASE}${path}`);
  url.searchParams.set('access_token', token);
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await readJson(response);
  if (!response.ok || data?.error) throw new Error(data?.error?.message || `Meta message failed (${response.status})`);
  return data;
}

async function replyToSocialMessage(admin: SupabaseClient, message: any, text: string) {
  if (message.platform !== 'meta' && message.platform !== 'facebook') throw new Error('Replies are currently supported for Facebook Page messages and comments');
  if (!message.external_message_id || !message.external_account_id || !message.sender_external_id) throw new Error('The inbound Meta event does not contain a reply target');
  const { data: account, error } = await admin.from('social_media_accounts')
    .select('id, platform, account_id, access_token, metadata, is_active')
    .eq('restaurant_id', message.restaurant_id)
    .eq('platform', 'facebook')
    .eq('account_id', message.external_account_id)
    .eq('is_active', true)
    .maybeSingle();
  if (error || !account?.access_token) throw new Error('Active Facebook Page connection not found');

  if (message.message_type === 'message') {
    const createdAt = message.created_at ? new Date(message.created_at).getTime() : NaN;
    if (!Number.isFinite(createdAt) || Date.now() - createdAt > 24 * 60 * 60 * 1000) {
      throw new Error('Messenger replies are allowed only within Meta\'s 24-hour response window');
    }
    return graphJsonPost(`/${encodeURIComponent(account.account_id)}/messages`, account.access_token, {
      recipient: { id: message.sender_external_id },
      messaging_type: 'RESPONSE',
      message: { text },
    });
  }

  return graphPost(`/${encodeURIComponent(message.external_message_id)}`, account.access_token, { message: text });
}

async function getPost(admin: SupabaseClient, postId: string) {
  const { data, error } = await admin.from('social_media_posts').select(
    'id, restaurant_id, social_account_id, content, media_urls, post_type, status, scheduled_at, published_at, approval_status, approved_by, approved_at, attempt_count, last_attempt_at, error_message'
  ).eq('id', postId).maybeSingle();
  if (error || !data) throw new Error('Post not found');
  return data;
}

async function createDelivery(admin: SupabaseClient, post: any) {
  const key = `post:${post.id}:account:${post.social_account_id}`;
  const { data, error } = await admin.from('social_media_post_deliveries').upsert({
    restaurant_id: post.restaurant_id,
    post_id: post.id,
    social_account_id: post.social_account_id,
    idempotency_key: key,
    status: 'queued',
    next_attempt_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'post_id,social_account_id' }).select('id, status, idempotency_key').maybeSingle();
  if (error || !data) throw new Error('Could not create publishing delivery');
  return data;
}

async function graphPost(path: string, token: string, params: Record<string, string>) {
  const response = await fetch(`${GRAPH_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...params, access_token: token }),
  });
  const data = await readJson(response);
  if (!response.ok || data?.error) throw new Error(data?.error?.message || `Meta publish failed (${response.status})`);
  return data;
}

async function publishMeta(post: any, account: any) {
  const metadata = account.metadata || {};
  const assetType = metadata.asset_type;
  if (assetType === 'meta_ad_account') throw new Error('An ad account cannot receive organic posts');

  const mediaUrls = Array.isArray(post.media_urls) ? post.media_urls.filter(Boolean) : [];
  const platform = String(account.platform);
  if (platform === 'facebook') {
    if (mediaUrls.length > 0) {
      return graphPost(`/${encodeURIComponent(account.account_id)}/photos`, account.access_token, {
        url: mediaUrls[0],
        caption: post.content || '',
      });
    }
    return graphPost(`/${encodeURIComponent(account.account_id)}/feed`, account.access_token, {
      message: post.content || '',
    });
  }

  if (platform === 'instagram') {
    if (mediaUrls.length === 0) throw new Error('Instagram publishing requires at least one public media URL');
    const container = await graphPost(`/${encodeURIComponent(account.account_id)}/media`, account.access_token, {
      image_url: mediaUrls[0],
      caption: post.content || '',
    });
    return graphPost(`/${encodeURIComponent(account.account_id)}/media_publish`, account.access_token, {
      creation_id: container.id,
    });
  }

  throw new Error(`Publishing is not enabled for ${platform} yet`);
}

async function publishDelivery(admin: SupabaseClient, post: any, deliveryId: string, actorId: string) {
  const { data: delivery, error: deliveryError } = await admin.from('social_media_post_deliveries')
    .select('id, post_id, social_account_id, status, attempt_count')
    .eq('id', deliveryId)
    .eq('post_id', post.id)
    .maybeSingle();
  if (deliveryError || !delivery) throw new Error('Delivery not found');
  if (delivery.status === 'published') return { status: 'published', externalPostId: null };
  if (delivery.status === 'publishing') throw new Error('Delivery is already being published');

  const attempts = Number(delivery.attempt_count || 0) + 1;
  const { data: claimed, error: claimError } = await admin.from('social_media_post_deliveries')
    .update({ status: 'publishing', attempt_count: attempts, last_attempt_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString() })
    .eq('id', delivery.id)
    .in('status', ['queued', 'failed'])
    .select('id')
    .maybeSingle();
  if (claimError || !claimed) throw new Error('Delivery is already being processed');

  const { data: account, error: accountError } = await admin.from('social_media_accounts')
    .select('id, platform, account_id, access_token, metadata, is_active, token_expires_at')
    .eq('id', post.social_account_id)
    .eq('is_active', true)
    .maybeSingle();
  if (accountError || !account || !account.access_token) throw new Error('Connected social account is unavailable');

  try {
    const result = await publishMeta(post, account);
    const externalPostId = result?.id || result?.post_id || null;
    await admin.from('social_media_post_deliveries').update({
      status: 'published',
      external_post_id: externalPostId,
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: { provider_response_keys: Object.keys(result || {}) },
    }).eq('id', delivery.id);
    await admin.from('social_media_posts').update({
      status: 'published',
      published_at: new Date().toISOString(),
      error_message: null,
      last_attempt_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', post.id);
    await addEvent(admin, post, actorId, 'published', undefined, { delivery_id: delivery.id, external_post_id: externalPostId });
    return { status: 'published', externalPostId };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Provider publish failed';
    const retryable = attempts < 3;
    await admin.from('social_media_post_deliveries').update({
      status: retryable ? 'failed' : 'cancelled',
      last_error: message.slice(0, 1000),
      next_attempt_at: retryable ? new Date(Date.now() + attempts * 5 * 60 * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    }).eq('id', delivery.id);
    await admin.from('social_media_posts').update({
      status: 'failed',
      error_message: message.slice(0, 1000),
      last_attempt_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', post.id);
    await addEvent(admin, post, actorId, 'failed', message.slice(0, 500), { delivery_id: delivery.id, retryable });
    throw new Error(retryable ? 'Provider publish failed; retry is available' : 'Provider publish failed after three attempts');
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !anonKey || !serviceKey) return json({ error: 'Publishing service is not configured' }, 500);
    const user = await getUser(req, supabaseUrl, anonKey);
    if (!user) return json({ error: 'Unauthorized' }, 401);
    const admin = createClient(supabaseUrl, serviceKey);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || '');
    const restaurantId = String(body.restaurantId || '');
    if (action === 'reply_message') {
      if (!restaurantId) return json({ error: 'restaurantId is required' }, 400);
      await assertPermission(admin, restaurantId, user.id, 'marketing.content.publish');
      const messageId = String(body.messageId || '');
      const text = String(body.text || '').trim();
      if (!messageId || !text || text.length > 2000) return json({ error: 'messageId and a reply up to 2000 characters are required' }, 400);
      const message = await getSocialMessage(admin, messageId, restaurantId);
      const result = await replyToSocialMessage(admin, message, text);
      const { error: updateError } = await admin.from('crm_social_messages').update({ status: 'replied', updated_at: new Date().toISOString() }).eq('id', message.id).eq('restaurant_id', restaurantId);
      if (updateError) throw updateError;
      return json({ success: true, externalReplyId: result?.id || result?.message_id || null });
    }

    const postId = String(body.postId || '');
    if (!postId) return json({ error: 'postId is required' }, 400);
    const post = await getPost(admin, postId);

    if (action === 'submit') {
      await assertPermission(admin, post.restaurant_id, user.id, 'marketing.content.create');
      if (post.approval_status !== 'draft' && post.approval_status !== 'rejected') return json({ error: 'Post is not editable for submission' }, 409);
      const { error } = await admin.from('social_media_posts').update({
        approval_status: 'pending_review',
        submitted_at: new Date().toISOString(),
        submitted_by: user.id,
        rejected_at: null,
        rejected_by: null,
        rejection_reason: null,
        updated_at: new Date().toISOString(),
      }).eq('id', post.id);
      if (error) throw new Error('Could not submit post for review');
      await addEvent(admin, post, user.id, 'submitted');
      return json({ success: true, approvalStatus: 'pending_review' });
    }

    if (action === 'approve' || action === 'reject') {
      await assertPermission(admin, post.restaurant_id, user.id, 'marketing.content.approve');
      if (post.approval_status !== 'pending_review') return json({ error: 'Post is not waiting for review' }, 409);
      const approved = action === 'approve';
      const update = approved ? {
        approval_status: 'approved', approved_at: new Date().toISOString(), approved_by: user.id,
        rejected_at: null, rejected_by: null, rejection_reason: null, status: 'scheduled', updated_at: new Date().toISOString(),
      } : {
        approval_status: 'rejected', rejected_at: new Date().toISOString(), rejected_by: user.id,
        rejection_reason: String(body.note || 'تم الرفض من المراجع').slice(0, 1000), status: 'draft', updated_at: new Date().toISOString(),
      };
      const { error } = await admin.from('social_media_posts').update(update).eq('id', post.id);
      if (error) throw new Error('Could not update review decision');
      if (approved) await createDelivery(admin, post);
      await addEvent(admin, post, user.id, approved ? 'approved' : 'rejected', body.note);
      return json({ success: true, approvalStatus: approved ? 'approved' : 'rejected' });
    }

    if (action === 'publish' || action === 'retry') {
      await assertPermission(admin, post.restaurant_id, user.id, 'marketing.content.publish');
      if (post.approval_status !== 'approved') return json({ error: 'Post must be approved before publishing' }, 409);
      const delivery = await createDelivery(admin, post);
      const result = await publishDelivery(admin, post, delivery.id, user.id);
      return json({ success: true, ...result });
    }

    return json({ error: 'Unknown publishing action' }, 400);
  } catch (error) {
    console.error('social-publish error:', error instanceof Error ? error.message : 'unknown error');
    return json({ error: error instanceof Error ? error.message : 'Publishing request failed' }, 400);
  }
});
