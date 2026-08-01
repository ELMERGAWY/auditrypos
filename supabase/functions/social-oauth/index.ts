// Social media OAuth broker.
// Keeps client_secret server-side and can read global (restaurant_id IS NULL) configs
// that RLS hides from the browser.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const PLATFORMS: Record<string, { authUrl: string; tokenUrl: string; scopes: string[] }> = {
  facebook: {
    authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
    scopes: ['public_profile', 'email', 'pages_show_list', 'pages_read_engagement'],
  },
  instagram: {
    authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
    scopes: ['instagram_basic', 'pages_show_list'],
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
    scopes: ['w_member_social', 'r_liteprofile'],
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

async function fetchAccount(platform: string, token: string) {
  if (platform === 'facebook' || platform === 'instagram') {
    const r = await fetch(
      `https://graph.facebook.com/v18.0/me?fields=id,name,picture&access_token=${token}`,
    );
    const d = await r.json();
    if (d.error) throw new Error(d.error.message);
    return { account_id: d.id, account_name: d.name, account_avatar_url: d.picture?.data?.url };
  }
  if (platform === 'google' || platform === 'youtube') {
    const r = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const d = await r.json();
    return { account_id: d.sub, account_name: d.name || d.email, account_avatar_url: d.picture };
  }
  return { account_id: 'unknown', account_name: platform };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization') ?? '';

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || '');
    const platform = String(body.platform || '');
    const restaurantId = String(body.restaurantId || '');
    const redirectUri = String(body.redirectUri || '');

    const meta = PLATFORMS[platform];
    if (!meta) return json({ error: `Unsupported platform: ${platform}` }, 400);
    if (!restaurantId) return json({ error: 'restaurantId is required' }, 400);

    // Verify the caller may act for this restaurant.
    const { data: allowed } = await admin
      .from('restaurants')
      .select('id, owner_id, company_id')
      .eq('id', restaurantId)
      .maybeSingle();
    if (!allowed) return json({ error: 'Restaurant not found' }, 404);
    if (allowed.owner_id !== user.id) {
      const { data: member } = await admin
        .from('company_users')
        .select('id')
        .eq('company_id', allowed.company_id)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
      if (!member) return json({ error: 'Forbidden' }, 403);
    }

    // Load config: restaurant-specific wins, otherwise global row.
    const { data: configs } = await admin
      .from('social_media_oauth_config')
      .select('client_id, client_secret, restaurant_id')
      .eq('platform', platform)
      .or(`restaurant_id.eq.${restaurantId},restaurant_id.is.null`);

    const config =
      (configs || []).find((c: any) => c.restaurant_id === restaurantId) ||
      (configs || []).find((c: any) => c.restaurant_id === null);

    if (!config?.client_id || !config?.client_secret) {
      return json(
        { error: `لا توجد إعدادات OAuth للمنصة ${platform}. أضف Client ID و Client Secret أولاً.` },
        400,
      );
    }

    if (action === 'start') {
      const state = btoa(
        JSON.stringify({
          stateId: crypto.randomUUID(),
          platform,
          restaurantId,
        }),
      );
      const params = new URLSearchParams({
        client_id: config.client_id,
        redirect_uri: redirectUri,
        scope: meta.scopes.join(platform === 'facebook' || platform === 'instagram' ? ',' : ' '),
        response_type: 'code',
        state,
      });
      return json({ authUrl: `${meta.authUrl}?${params.toString()}`, state });
    }

    if (action === 'exchange') {
      const code = String(body.code || '');
      if (!code) return json({ error: 'code is required' }, 400);

      const tokenRes = await fetch(meta.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: config.client_id,
          client_secret: config.client_secret,
          code,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });
      const raw = await tokenRes.text();
      if (!tokenRes.ok) return json({ error: `Token exchange failed: ${raw}` }, 400);

      let token: any;
      try {
        token = JSON.parse(raw);
      } catch {
        token = Object.fromEntries(new URLSearchParams(raw));
      }
      if (!token.access_token) return json({ error: `No access_token returned: ${raw}` }, 400);

      const account = await fetchAccount(platform, token.access_token);

      const { error: saveErr } = await admin.from('social_media_accounts').upsert(
        {
          restaurant_id: restaurantId,
          platform,
          account_id: account.account_id,
          account_name: account.account_name,
          account_avatar_url: (account as any).account_avatar_url ?? null,
          access_token: token.access_token,
          refresh_token: token.refresh_token ?? null,
          token_expires_at: token.expires_in
            ? new Date(Date.now() + Number(token.expires_in) * 1000).toISOString()
            : null,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'restaurant_id,platform,account_id' },
      );
      if (saveErr) return json({ error: `Save failed: ${saveErr.message}` }, 400);

      await admin.from('oauth_connection_logs').insert({
        restaurant_id: restaurantId,
        platform,
        action: 'connect',
        status: 'success',
        created_at: new Date().toISOString(),
      });

      return json({ success: true, account });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
