import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

const GRAPH_VERSION = Deno.env.get('META_GRAPH_VERSION') || 'v26.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

async function readJson(response: Response): Promise<any> {
  const text = await response.text();
  try { return JSON.parse(text); } catch { return { raw: text }; }
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
  const assetType = account.metadata?.asset_type;
  if (assetType === 'meta_ad_account') throw new Error('An ad account cannot receive organic posts');
  const mediaUrls = Array.isArray(post.media_urls) ? post.media_urls.filter(Boolean) : [];
  if (account.platform === 'facebook') {
    return mediaUrls.length > 0
      ? graphPost(`/${encodeURIComponent(account.account_id)}/photos`, account.access_token, { url: mediaUrls[0], caption: post.content || '' })
      : graphPost(`/${encodeURIComponent(account.account_id)}/feed`, account.access_token, { message: post.content || '' });
  }
  if (account.platform === 'instagram') {
    if (mediaUrls.length === 0) throw new Error('Instagram publishing requires a public media URL');
    const container = await graphPost(`/${encodeURIComponent(account.account_id)}/media`, account.access_token, { image_url: mediaUrls[0], caption: post.content || '' });
    return graphPost(`/${encodeURIComponent(account.account_id)}/media_publish`, account.access_token, { creation_id: container.id });
  }
  throw new Error(`Publishing is not enabled for ${account.platform}`);
}

async function addEvent(admin: SupabaseClient, post: any, action: string, metadata: Record<string, unknown>) {
  const actorId = post.approved_by || post.submitted_by;
  if (!actorId) return;
  await admin.from('social_media_approval_events').insert({
    restaurant_id: post.restaurant_id,
    post_id: post.id,
    actor_id: actorId,
    action,
    metadata,
  });
}

async function processDelivery(admin: SupabaseClient, delivery: any) {
  const post = delivery.post;
  if (!post || post.approval_status !== 'approved' || post.status === 'published') return { status: 'ignored' };
  if (post.scheduled_at && new Date(post.scheduled_at).getTime() > Date.now()) return { status: 'not_due' };

  const attempts = Number(delivery.attempt_count || 0) + 1;
  const { data: claimed, error: claimError } = await admin.from('social_media_post_deliveries')
    .update({ status: 'publishing', attempt_count: attempts, last_attempt_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString() })
    .eq('id', delivery.id)
    .in('status', ['queued', 'failed'])
    .select('id')
    .maybeSingle();
  if (claimError || !claimed) return { status: 'busy' };

  try {
    const { data: account, error: accountError } = await admin.from('social_media_accounts')
      .select('id, platform, account_id, access_token, metadata, is_active')
      .eq('id', delivery.social_account_id)
      .eq('restaurant_id', delivery.restaurant_id)
      .eq('is_active', true)
      .maybeSingle();
    if (accountError || !account?.access_token) throw new Error('Connected social account is unavailable');
    const result = await publishMeta(post, account);
    const externalPostId = result?.id || result?.post_id || null;
    await admin.from('social_media_post_deliveries').update({ status: 'published', external_post_id: externalPostId, published_at: new Date().toISOString(), updated_at: new Date().toISOString(), metadata: { provider_response_keys: Object.keys(result || {}) } }).eq('id', delivery.id);
    await admin.from('social_media_posts').update({ status: 'published', published_at: new Date().toISOString(), error_message: null, last_attempt_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', post.id);
    await addEvent(admin, post, 'published', { delivery_id: delivery.id, worker: true, external_post_id: externalPostId });
    return { status: 'published' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Provider publish failed';
    const retryable = attempts < 3;
    await admin.from('social_media_post_deliveries').update({ status: retryable ? 'failed' : 'cancelled', last_error: message.slice(0, 1000), next_attempt_at: retryable ? new Date(Date.now() + attempts * 5 * 60 * 1000).toISOString() : null, updated_at: new Date().toISOString() }).eq('id', delivery.id);
    await admin.from('social_media_posts').update({ status: 'failed', error_message: message.slice(0, 1000), last_attempt_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', post.id);
    await addEvent(admin, post, 'failed', { delivery_id: delivery.id, worker: true, retryable });
    return { status: 'failed', error: message.slice(0, 500) };
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  const expectedSecret = Deno.env.get('SOCIAL_PUBLISH_WORKER_SECRET');
  const providedSecret = req.headers.get('x-social-worker-secret');
  if (!expectedSecret || !providedSecret || providedSecret !== expectedSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized worker request' }), { status: 401 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return new Response(JSON.stringify({ error: 'Worker is not configured' }), { status: 500 });
  const admin = createClient(supabaseUrl, serviceKey);
  const body = await req.json().catch(() => ({}));
  const batchSize = Math.min(Math.max(Number(body.batchSize || 25), 1), 100);
  const now = new Date().toISOString();
  const { data: deliveries, error } = await admin.from('social_media_post_deliveries')
    .select('id, restaurant_id, social_account_id, attempt_count, status, post:social_media_posts!inner(id, restaurant_id, social_account_id, content, media_urls, status, approval_status, scheduled_at, approved_by, submitted_by)')
    .in('status', ['queued', 'failed'])
    .or(`next_attempt_at.is.null,next_attempt_at.lte.${now}`)
    .order('created_at', { ascending: true })
    .limit(batchSize);
  if (error) return new Response(JSON.stringify({ error: 'Could not load publishing queue' }), { status: 500 });

  const results = [];
  for (const delivery of deliveries || []) results.push(await processDelivery(admin, delivery));
  return new Response(JSON.stringify({ success: true, processed: results.length, results }), { status: 200, headers: { 'Content-Type': 'application/json' } });
});
