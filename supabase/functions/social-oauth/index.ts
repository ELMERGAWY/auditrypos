import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

const GRAPH_VERSION = Deno.env.get('META_GRAPH_VERSION') || 'v26.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type PlatformConfig = {
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
  isMeta?: boolean;
};

type OAuthConfigRow = {
  client_id: string;
  client_secret: string;
  restaurant_id: string | null;
  redirect_uri: string | null;
  config_id: string | null;
};

type OAuthStateRow = {
  id: string;
  restaurant_id: string;
  user_id: string;
  platform: string;
  redirect_uri: string;
  expires_at: string;
  consumed_at: string | null;
};

const PLATFORMS: Record<string, PlatformConfig> = {
  facebook: {
    authUrl: `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`,
    tokenUrl: `${GRAPH_BASE}/oauth/access_token`,
    scopes: [
      'public_profile',
      'pages_show_list',
      'pages_read_engagement',
      'pages_manage_metadata',
      'pages_manage_posts',
      'business_management',
    ],
    isMeta: true,
  },
  instagram: {
    authUrl: `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`,
    tokenUrl: `${GRAPH_BASE}/oauth/access_token`,
    scopes: [
      'instagram_basic',
      'instagram_content_publish',
      'instagram_manage_comments',
      'instagram_manage_insights',
      'pages_show_list',
      'pages_read_engagement',
    ],
    isMeta: true,
  },
  google: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['https://www.googleapis.com/auth/youtube.readonly', 'openid', 'email', 'profile'],
  },
  youtube: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['https://www.googleapis.com/auth/youtube.readonly', 'openid', 'email', 'profile'],
  },
  linkedin: {
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    scopes: ['openid', 'profile', 'w_member_social'],
  },
  tiktok: {
    authUrl: 'https://www.tiktok.com/v2/auth/authorize/',
    tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
    scopes: ['user.info.basic'],
  },
  twitter: {
    authUrl: 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    scopes: ['tweet.read', 'users.read'],
  },
  pinterest: {
    authUrl: 'https://www.pinterest.com/oauth/',
    tokenUrl: 'https://api.pinterest.com/v5/oauth/token',
    scopes: ['boards:read', 'pins:read'],
  },
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

function normalizeBase64Url(value: string): string {
  return value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
}

function randomState(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let raw = '';
  for (const byte of bytes) raw += String.fromCharCode(byte);
  return `${crypto.randomUUID()}.${btoa(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')}`;
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  let raw = '';
  for (const byte of new Uint8Array(digest)) raw += String.fromCharCode(byte);
  return btoa(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function validRedirectUri(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.pathname !== '/oauth/callback' || url.search || url.hash) return false;
    if (url.protocol === 'http:' && !['localhost', '127.0.0.1'].includes(url.hostname)) return false;

    const configuredOrigins = (Deno.env.get('OAUTH_ALLOWED_REDIRECT_ORIGINS') || '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
    if (configuredOrigins.length > 0) return configuredOrigins.includes(url.origin);
    return ['localhost', '127.0.0.1'].includes(url.hostname);
  } catch {
    return false;
  }
}

async function readJson(response: Response): Promise<any> {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return Object.fromEntries(new URLSearchParams(text));
  }
}

async function fetchGraph(path: string, token: string, init: RequestInit = {}): Promise<any> {
  const separator = path.includes('?') ? '&' : '?';
  const response = await fetch(`${GRAPH_BASE}${path}${separator}access_token=${encodeURIComponent(token)}`, init);
  const data = await readJson(response);
  if (!response.ok || data?.error) {
    throw new Error(data?.error?.message || `Meta request failed (${response.status})`);
  }
  return data;
}

async function getUser(req: Request, supabaseUrl: string, anonKey: string) {
  const authHeader = req.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const client = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data } = await client.auth.getUser();
  return data.user || null;
}

async function assertRestaurantAccess(admin: SupabaseClient, restaurantId: string, userId: string) {
  const { data: restaurant } = await admin
    .from('restaurants')
    .select('id, owner_id, company_id')
    .eq('id', restaurantId)
    .maybeSingle();
  if (!restaurant) throw new Error('Restaurant not found');
  if (restaurant.owner_id === userId) return restaurant;

  const { data: member } = await admin
    .from('company_users')
    .select('id')
    .eq('company_id', restaurant.company_id)
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();
  if (!member) throw new Error('Forbidden');
  return restaurant;
}

async function loadConfig(admin: SupabaseClient, platform: string, restaurantId: string): Promise<OAuthConfigRow> {
  const { data, error } = await admin
    .from('social_media_oauth_config')
    .select('client_id, client_secret, restaurant_id, redirect_uri, config_id')
    .eq('platform', platform)
    .or(`restaurant_id.eq.${restaurantId},restaurant_id.is.null`);
  if (error) throw new Error('OAuth configuration unavailable');

  const configs = (data || []) as OAuthConfigRow[];
  const config = configs.find((row) => row.restaurant_id === restaurantId) || configs.find((row) => row.restaurant_id === null);
  if (!config?.client_id || !config.client_secret) throw new Error(`OAuth is not configured for ${platform}`);
  return config;
}

async function discoverMetaAssets(admin: SupabaseClient, restaurantId: string, userId: string, token: any, scopes: string[]) {
  const assets: any[] = [];
  const pages = await fetchGraph('/me/accounts?fields=id,name,access_token,category,link,tasks,instagram_business_account', token.access_token);

  for (const page of pages.data || []) {
    if (!page.id || !page.access_token) continue;
    assets.push({
      restaurant_id: restaurantId,
      platform: 'facebook',
      external_id: page.id,
      asset_type: 'facebook_page',
      asset_name: page.name || page.id,
      asset_handle: null,
      parent_external_id: null,
      access_token: page.access_token,
      refresh_token: null,
      token_expires_at: token.expires_in ? new Date(Date.now() + Number(token.expires_in) * 1000).toISOString() : null,
      scopes,
      status: 'pending',
      metadata: { category: page.category || null, link: page.link || null, tasks: page.tasks || [] },
      created_by: userId,
      updated_at: new Date().toISOString(),
    });

    const instagramId = page.instagram_business_account?.id;
    if (instagramId) {
      try {
        const instagram = await fetchGraph(`/${encodeURIComponent(instagramId)}?fields=id,username,name,profile_picture_url`, page.access_token);
        assets.push({
          restaurant_id: restaurantId,
          platform: 'instagram',
          external_id: instagram.id,
          asset_type: 'instagram_professional',
          asset_name: instagram.name || instagram.username || instagram.id,
          asset_handle: instagram.username || null,
          parent_external_id: page.id,
          access_token: page.access_token,
          refresh_token: null,
          token_expires_at: token.expires_in ? new Date(Date.now() + Number(token.expires_in) * 1000).toISOString() : null,
          scopes,
          status: 'pending',
          metadata: { profile_picture_url: instagram.profile_picture_url || null, facebook_page_id: page.id },
          created_by: userId,
          updated_at: new Date().toISOString(),
        });
      } catch (error) {
        console.warn('Instagram asset discovery skipped:', error instanceof Error ? error.message : 'unknown error');
      }
    }
  }

  try {
    const adAccounts = await fetchGraph('/me/adaccounts?fields=id,name,account_status,currency,account_id', token.access_token);
    for (const adAccount of adAccounts.data || []) {
      if (!adAccount.id) continue;
      assets.push({
        restaurant_id: restaurantId,
        platform: 'facebook',
        external_id: adAccount.id,
        asset_type: 'meta_ad_account',
        asset_name: adAccount.name || adAccount.account_id || adAccount.id,
        asset_handle: adAccount.account_id || null,
        parent_external_id: null,
        access_token: token.access_token,
        refresh_token: token.refresh_token || null,
        token_expires_at: token.expires_in ? new Date(Date.now() + Number(token.expires_in) * 1000).toISOString() : null,
        scopes,
        status: 'pending',
        metadata: { account_status: adAccount.account_status ?? null, currency: adAccount.currency || null },
        created_by: userId,
        updated_at: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.warn('Ad account discovery skipped:', error instanceof Error ? error.message : 'unknown error');
  }

  if (assets.length > 0) {
    const { error } = await admin.from('social_media_assets').upsert(assets, { onConflict: 'restaurant_id,platform,external_id' });
    if (error) throw new Error('Could not save discovered Meta assets');
  }

  return assets.map(({ access_token: _accessToken, refresh_token: _refreshToken, ...safeAsset }) => safeAsset);
}

function parseScopes(token: any, fallback: string[]): string[] {
  const value = token.scope || token.scopes;
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return value.split(/[\s,]+/).filter(Boolean);
  return fallback;
}

async function fetchProfile(platform: string, token: string) {
  if (platform === 'facebook' || platform === 'instagram') {
    const data = await fetchGraph('/me?fields=id,name,picture,username', token);
    return {
      account_id: data.id,
      account_name: data.name || data.username || data.id,
      account_handle: data.username || null,
      account_avatar_url: data.picture?.data?.url || null,
    };
  }
  if (platform === 'google' || platform === 'youtube') {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${token}` } });
    const data = await readJson(response);
    if (!response.ok || data.error) throw new Error('Provider profile lookup failed');
    return { account_id: data.sub, account_name: data.name || data.email, account_handle: data.email || null, account_avatar_url: data.picture || null };
  }
  return { account_id: 'pending', account_name: platform, account_handle: null, account_avatar_url: null };
}

async function consumeState(admin: SupabaseClient, rawState: string, redirectUri: string): Promise<OAuthStateRow> {
  if (!rawState || !validRedirectUri(redirectUri)) throw new Error('Invalid OAuth callback');
  const stateHash = await sha256(rawState);
  const { data: state, error } = await admin
    .from('social_oauth_states')
    .select('id, restaurant_id, user_id, platform, redirect_uri, expires_at, consumed_at')
    .eq('state_hash', stateHash)
    .is('consumed_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  if (error || !state || state.redirect_uri !== redirectUri) throw new Error('Invalid or expired OAuth state');

  const { data: consumed, error: consumeError } = await admin
    .from('social_oauth_states')
    .update({ consumed_at: new Date().toISOString() })
    .eq('id', state.id)
    .is('consumed_at', null)
    .select('id, restaurant_id, user_id, platform, redirect_uri, expires_at, consumed_at')
    .maybeSingle();
  if (consumeError || !consumed) throw new Error('OAuth state was already consumed');
  return consumed as OAuthStateRow;
}

async function connectAsset(admin: SupabaseClient, assetId: string, restaurantId: string, userId: string) {
  const { data: asset, error } = await admin
    .from('social_media_assets')
    .select('id, restaurant_id, platform, external_id, asset_type, asset_name, asset_handle, parent_external_id, access_token, refresh_token, token_expires_at, scopes, metadata, status')
    .eq('id', assetId)
    .eq('restaurant_id', restaurantId)
    .eq('created_by', userId)
    .eq('status', 'pending')
    .maybeSingle();
  if (error || !asset) throw new Error('Asset not found or no longer available');

  const { data: account, error: saveError } = await admin.from('social_media_accounts').upsert({
    restaurant_id: restaurantId,
    platform: asset.platform,
    account_id: asset.external_id,
    account_name: asset.asset_name,
    account_handle: asset.asset_handle,
    access_token: asset.access_token,
    refresh_token: asset.refresh_token,
    token_expires_at: asset.token_expires_at,
    scopes: asset.scopes,
    account_avatar_url: asset.metadata?.profile_picture_url || null,
    metadata: { ...asset.metadata, asset_type: asset.asset_type, parent_external_id: asset.parent_external_id },
    is_active: true,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'restaurant_id,platform,account_id' }).select('id, platform, account_id, account_name, account_handle, account_avatar_url, is_active, is_primary').maybeSingle();
  if (saveError || !account) throw new Error('Could not connect selected asset');

  await admin.from('social_media_assets').update({ status: 'connected', updated_at: new Date().toISOString() }).eq('id', asset.id);
  await admin.from('oauth_connection_logs').insert({
    restaurant_id: restaurantId,
    social_account_id: account.id,
    platform: asset.platform,
    action: 'connect',
    status: 'success',
    created_by: userId,
  });
  return account;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !anonKey || !serviceKey) return json({ error: 'OAuth service is not configured' }, 500);

    const user = await getUser(req, supabaseUrl, anonKey);
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || '');
    const requestedPlatform = String(body.platform || '');
    const requestedRestaurantId = String(body.restaurantId || '');
    const redirectUri = String(body.redirectUri || '');

    if (action === 'exchange') {
      const rawState = String(body.state || '');
      const code = String(body.code || '');
      if (!code || !rawState) return json({ error: 'OAuth callback is incomplete' }, 400);

      const state = await consumeState(admin, rawState, redirectUri);
      if (state.user_id !== user.id) return json({ error: 'OAuth state owner mismatch' }, 403);
      await assertRestaurantAccess(admin, state.restaurant_id, user.id);

      const platform = state.platform;
      const meta = PLATFORMS[platform];
      if (!meta) return json({ error: 'Unsupported platform' }, 400);
      const config = await loadConfig(admin, platform, state.restaurant_id);
      const tokenParams: Record<string, string> = {
        client_id: config.client_id,
        client_secret: config.client_secret,
        code,
        redirect_uri: redirectUri,
      };
      if (!meta.isMeta) tokenParams.grant_type = 'authorization_code';

      const tokenResponse = meta.isMeta
        ? await fetch(`${meta.tokenUrl}?${new URLSearchParams(tokenParams).toString()}`)
        : await fetch(meta.tokenUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(tokenParams) });
      const token = await readJson(tokenResponse);
      if (!tokenResponse.ok || !token.access_token) throw new Error('Provider token exchange failed');

      const scopes = parseScopes(token, meta.scopes);
      if (meta.isMeta) {
        const assets = await discoverMetaAssets(admin, state.restaurant_id, user.id, token, scopes);
        return json({ success: true, platform, assets, requiresAssetSelection: true });
      }

      const profile = await fetchProfile(platform, token.access_token);
      const { data: account, error: saveError } = await admin.from('social_media_accounts').upsert({
        restaurant_id: state.restaurant_id,
        platform,
        account_id: profile.account_id,
        account_name: profile.account_name,
        account_handle: profile.account_handle,
        account_avatar_url: profile.account_avatar_url,
        access_token: token.access_token,
        refresh_token: token.refresh_token || null,
        token_expires_at: token.expires_in ? new Date(Date.now() + Number(token.expires_in) * 1000).toISOString() : null,
        scopes,
        is_active: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'restaurant_id,platform,account_id' }).select('id, platform, account_id, account_name, account_handle, account_avatar_url, is_active, is_primary').maybeSingle();
      if (saveError || !account) throw new Error('Could not save connected account');
      await admin.from('oauth_connection_logs').insert({ restaurant_id: state.restaurant_id, social_account_id: account.id, platform, action: 'connect', status: 'success', created_by: user.id });
      return json({ success: true, platform, account });
    }

    if (!requestedRestaurantId) return json({ error: 'restaurantId is required' }, 400);
    await assertRestaurantAccess(admin, requestedRestaurantId, user.id);

    if (action === 'start') {
      const meta = PLATFORMS[requestedPlatform];
      if (!meta) return json({ error: 'Unsupported platform' }, 400);
      if (!validRedirectUri(redirectUri)) return json({ error: 'Invalid redirect URI' }, 400);
      const config = await loadConfig(admin, requestedPlatform, requestedRestaurantId);
      const rawState = randomState();
      const stateHash = await sha256(rawState);
      const { error: stateError } = await admin.from('social_oauth_states').insert({
        state_hash: stateHash,
        restaurant_id: requestedRestaurantId,
        user_id: user.id,
        platform: requestedPlatform,
        redirect_uri: redirectUri,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      });
      if (stateError) throw new Error('Could not initialize OAuth state');

      const params: Record<string, string> = {
        client_id: config.client_id,
        redirect_uri: redirectUri,
        response_type: 'code',
        state: rawState,
      };
      if (meta.isMeta && config.config_id) params.config_id = config.config_id;
      else params.scope = meta.scopes.join(' ');

      return json({ authUrl: `${meta.authUrl}?${new URLSearchParams(params).toString()}` });
    }

    if (action === 'list_assets') {
      const { data, error } = await admin
        .from('social_media_assets')
        .select('id, platform, external_id, asset_type, asset_name, asset_handle, parent_external_id, scopes, status, metadata, token_expires_at, created_at')
        .eq('restaurant_id', requestedRestaurantId)
        .eq('created_by', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw new Error('Could not load discovered assets');
      return json({ assets: data || [] });
    }

    if (action === 'connect_asset') {
      const account = await connectAsset(admin, String(body.assetId || ''), requestedRestaurantId, user.id);
      return json({ success: true, account });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (error) {
    console.error('social-oauth error:', error instanceof Error ? error.message : 'unknown error');
    return json({ error: error instanceof Error ? error.message : 'OAuth request failed' }, 400);
  }
});
