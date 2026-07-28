// Social Media OAuth Service
// Handles OAuth authentication for various social media platforms

export interface SocialPlatform {
  id: string;
  name: string;
  displayName: string;
  icon: string;
  color: string;
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
  requiresAppSecret: boolean;
  isBusinessApp?: boolean;
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  configId?: string; // Meta Business Login Configuration ID
}

export interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
}

export interface SocialAccount {
  id: string;
  platform: string;
  account_id: string;
  account_name: string;
  account_handle?: string;
  account_avatar_url?: string;
  is_active: boolean;
  is_primary: boolean;
}

// Platform configurations
export const SOCIAL_PLATFORMS: Record<string, SocialPlatform> = {
  facebook: {
    id: 'facebook',
    name: 'facebook',
    displayName: 'فيسبوك',
    icon: '📘',
    color: '#1877F2',
    authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
    scopes: ['business_management', 'pages_show_list', 'pages_read_engagement'],
    requiresAppSecret: true,
    isBusinessApp: true,
  },
  instagram: {
    id: 'instagram',
    name: 'instagram',
    displayName: 'إنستغرام',
    icon: '📷',
    color: '#E4405F',
    authUrl: 'https://api.instagram.com/oauth/authorize',
    tokenUrl: 'https://api.instagram.com/oauth/access_token',
    scopes: ['instagram_basic', 'instagram_content_publish', 'instagram_manage_insights'],
    requiresAppSecret: true,
  },
  google: {
    id: 'google',
    name: 'google',
    displayName: 'جوجل',
    icon: '🔍',
    color: '#4285F4',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/yt-analytics.readonly'],
    requiresAppSecret: true,
  },
  youtube: {
    id: 'youtube',
    name: 'youtube',
    displayName: 'يوتيوب',
    icon: '▶️',
    color: '#FF0000',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/yt-analytics.readonly'],
    requiresAppSecret: true,
  },
  linkedin: {
    id: 'linkedin',
    name: 'linkedin',
    displayName: 'لينكد إن',
    icon: '💼',
    color: '#0077B5',
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    scopes: ['w_member_social', 'r_liteprofile'],
    requiresAppSecret: true,
  },
  tiktok: {
    id: 'tiktok',
    name: 'tiktok',
    displayName: 'تيك توك',
    icon: '🎵',
    color: '#000000',
    authUrl: 'https://open.tiktokapis.com/v2/oauth/authorize/',
    tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
    scopes: ['video.publish', 'user.info.basic'],
    requiresAppSecret: true,
  },
  twitter: {
    id: 'twitter',
    name: 'twitter',
    displayName: 'تويتر (X)',
    icon: '🐦',
    color: '#1DA1F2',
    authUrl: 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    scopes: ['tweet.read', 'tweet.write', 'users.read'],
    requiresAppSecret: true,
  },
  pinterest: {
    id: 'pinterest',
    name: 'pinterest',
    displayName: 'بينتريست',
    icon: '📌',
    color: '#E60023',
    authUrl: 'https://www.pinterest.com/oauth/',
    tokenUrl: 'https://api.pinterest.com/v5/oauth/token',
    scopes: ['boards:read', 'boards:write', 'pins:read', 'pins:write'],
    requiresAppSecret: true,
  },
};

class OAuthService {
  private supabase: any;
  private platformConfigs: Map<string, OAuthConfig> = new Map();

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
  }

  // Set OAuth configuration for a platform
  setPlatformConfig(platform: string, config: OAuthConfig) {
    this.platformConfigs.set(platform, config);
  }

  // Get OAuth configuration for a platform
  getPlatformConfig(platform: string): OAuthConfig | undefined {
    return this.platformConfigs.get(platform);
  }

  // Generate OAuth authorization URL
  generateAuthUrl(platform: string, state: string): string {
    const platformConfig = SOCIAL_PLATFORMS[platform];
    const oauthConfig = this.platformConfigs.get(platform);

    if (!platformConfig || !oauthConfig) {
      throw new Error(`Platform ${platform} not configured`);
    }

    // Ensure scopes are never empty - use default if needed
    const scopes = platformConfig.scopes && platformConfig.scopes.length > 0
      ? platformConfig.scopes.join(' ')
      : 'email public_profile';

    // Debug: Log scopes being used
    console.log('OAuth Service Debug - Platform:', platform);
    console.log('OAuth Service Debug - Scopes:', scopes);
    console.log('OAuth Service Debug - Platform Config Scopes:', platformConfig.scopes);
    console.log('OAuth Service Debug - Scopes length:', scopes?.length);

    const params = new URLSearchParams();
    params.append('client_id', oauthConfig.clientId);
    params.append('redirect_uri', oauthConfig.redirectUri);
    params.append('scope', scopes);
    params.append('response_type', 'code');
    params.append('state', state);

    // Add config_id for Meta Business Login if available
    if (oauthConfig.configId && platformConfig.isBusinessApp) {
      params.append('config_id', oauthConfig.configId);
      console.log('OAuth Service Debug - Config ID:', oauthConfig.configId);
    }

    const finalUrl = `${platformConfig.authUrl}?${params.toString()}`;
    console.log('OAuth Service Debug - Final URL:', finalUrl);
    console.log('OAuth Service Debug - URL contains scope:', finalUrl.includes('scope='));
    
    return finalUrl;
  }

  // Exchange authorization code for access token
  async exchangeCodeForToken(
    platform: string,
    code: string,
    state: string
  ): Promise<OAuthTokenResponse> {
    const platformConfig = SOCIAL_PLATFORMS[platform];
    const oauthConfig = this.platformConfigs.get(platform);

    if (!platformConfig || !oauthConfig) {
      throw new Error(`Platform ${platform} not configured`);
    }

    const response = await fetch(platformConfig.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: oauthConfig.clientId,
        client_secret: oauthConfig.clientSecret,
        code: code,
        redirect_uri: oauthConfig.redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to exchange code for token: ${response.statusText}`);
    }

    return await response.json();
  }

  // Refresh access token
  async refreshToken(platform: string, refreshToken: string): Promise<OAuthTokenResponse> {
    const platformConfig = SOCIAL_PLATFORMS[platform];
    const oauthConfig = this.platformConfigs.get(platform);

    if (!platformConfig || !oauthConfig) {
      throw new Error(`Platform ${platform} not configured`);
    }

    const response = await fetch(platformConfig.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: oauthConfig.clientId,
        client_secret: oauthConfig.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to refresh token: ${response.statusText}`);
    }

    return await response.json();
  }

  // Save social media account to database
  async saveSocialAccount(
    restaurantId: string,
    platform: string,
    tokenResponse: OAuthTokenResponse,
    accountData: {
      account_id: string;
      account_name: string;
      account_handle?: string;
      account_avatar_url?: string;
    }
  ): Promise<void> {
    const expiresAt = tokenResponse.expires_in
      ? new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString()
      : null;

    const { error } = await this.supabase.from('social_media_accounts').upsert({
      restaurant_id: restaurantId,
      platform: platform,
      account_id: accountData.account_id,
      account_name: accountData.account_name,
      account_handle: accountData.account_handle,
      account_avatar_url: accountData.account_avatar_url,
      access_token: tokenResponse.access_token,
      refresh_token: tokenResponse.refresh_token,
      token_expires_at: expiresAt,
      scopes: tokenResponse.scope?.split(' ') || [],
      is_active: true,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      throw new Error(`Failed to save social account: ${error.message}`);
    }

    // Log the connection
    await this.logOAuthEvent(restaurantId, platform, 'connect', 'success');
  }

  // Get social media accounts for a restaurant
  async getSocialAccounts(restaurantId: string): Promise<SocialAccount[]> {
    const { data, error } = await this.supabase
      .from('social_media_accounts')
      .select('id, platform, account_id, account_name, account_handle, account_avatar_url, is_active, is_primary')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true);

    if (error) {
      throw new Error(`Failed to fetch social accounts: ${error.message}`);
    }

    return data || [];
  }

  // Delete social media account
  async deleteSocialAccount(accountId: string, restaurantId: string): Promise<void> {
    // First get the account to log the disconnection
    const { data: account } = await this.supabase
      .from('social_media_accounts')
      .select('platform')
      .eq('id', accountId)
      .single();

    const { error } = await this.supabase
      .from('social_media_accounts')
      .delete()
      .eq('id', accountId)
      .eq('restaurant_id', restaurantId);

    if (error) {
      throw new Error(`Failed to delete social account: ${error.message}`);
    }

    // Log the disconnection
    if (account) {
      await this.logOAuthEvent(restaurantId, account.platform, 'disconnect', 'success');
    }
  }

  // Log OAuth event
  private async logOAuthEvent(
    restaurantId: string,
    platform: string,
    action: string,
    status: string,
    errorMessage?: string
  ): Promise<void> {
    const { error } = await this.supabase.from('oauth_connection_logs').insert({
      restaurant_id: restaurantId,
      platform: platform,
      action: action,
      status: status,
      error_message: errorMessage,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Failed to log OAuth event:', error);
    }
  }

  // Check if token needs refresh
  needsRefresh(tokenExpiresAt: string | null): boolean {
    if (!tokenExpiresAt) return false;
    const expiresAt = new Date(tokenExpiresAt);
    const now = new Date();
    const timeUntilExpiry = expiresAt.getTime() - now.getTime();
    // Refresh if token expires in less than 5 minutes
    return timeUntilExpiry < 5 * 60 * 1000;
  }

  // Get encrypted access token
  async getAccessToken(accountId: string): Promise<string> {
    const { data, error } = await this.supabase
      .from('social_media_accounts')
      .select('access_token, token_expires_at, platform, refresh_token')
      .eq('id', accountId)
      .single();

    if (error || !data) {
      throw new Error('Failed to fetch access token');
    }

    // Check if token needs refresh
    if (this.needsRefresh(data.token_expires_at) && data.refresh_token) {
      try {
        const newToken = await this.refreshToken(data.platform, data.refresh_token);
        await this.supabase
          .from('social_media_accounts')
          .update({
            access_token: newToken.access_token,
            refresh_token: newToken.refresh_token || data.refresh_token,
            token_expires_at: newToken.expires_in
              ? new Date(Date.now() + newToken.expires_in * 1000).toISOString()
              : data.token_expires_at,
          })
          .eq('id', accountId);
        return newToken.access_token;
      } catch (error) {
        console.error('Failed to refresh token:', error);
      }
    }

    return data.access_token;
  }
}

export default OAuthService;
