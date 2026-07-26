// OAuth Callback Handler
// Handles OAuth callback from social media platforms

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import OAuthService from '@/lib/socialMedia/oauthService';

export default function OAuthCallback() {
  const navigate = useNavigate();
  const oauthService = new OAuthService(supabase);

  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const error = urlParams.get('error');

      // Get stored OAuth state
      const storedState = sessionStorage.getItem('oauth_state');
      const storedPlatform = sessionStorage.getItem('oauth_platform');
      const storedRestaurantId = sessionStorage.getItem('oauth_restaurant_id');

      // Clear stored state
      sessionStorage.removeItem('oauth_state');
      sessionStorage.removeItem('oauth_platform');
      sessionStorage.removeItem('oauth_restaurant_id');

      if (error) {
        console.error('OAuth error:', error);
        navigate('/dashboard', { 
          state: { 
            oauthError: true, 
            message: 'فشل في المصادقة: ' + error 
          } 
        });
        return;
      }

      if (!code || !state || !storedState || state !== storedState) {
        console.error('Invalid OAuth callback');
        navigate('/dashboard', { 
          state: { 
            oauthError: true, 
            message: 'رمز المصادقة غير صالح' 
          } 
        });
        return;
      }

      if (!storedPlatform || !storedRestaurantId) {
        console.error('Missing OAuth context');
        navigate('/dashboard', { 
          state: { 
            oauthError: true, 
            message: 'سياق المصادقة مفقود' 
          } 
        });
        return;
      }

      try {
        // Load platform secrets
        const { data: configData } = await supabase
          .from('social_media_oauth_config')
          .select('client_id, client_secret')
          .eq('restaurant_id', storedRestaurantId)
          .eq('platform', storedPlatform)
          .single();

        if (!configData) {
          throw new Error('OAuth configuration not found');
        }

        // Set platform config
        oauthService.setPlatformConfig(storedPlatform, {
          clientId: configData.client_id,
          clientSecret: configData.client_secret,
          redirectUri: `${window.location.origin}/oauth/callback`,
        });

        // Exchange code for token
        const tokenResponse = await oauthService.exchangeCodeForToken(
          storedPlatform,
          code,
          state
        );

        // Fetch account details from platform (this is platform-specific)
        const accountData = await fetchAccountDetails(
          storedPlatform,
          tokenResponse.access_token
        );

        // Save account to database
        await oauthService.saveSocialAccount(
          storedRestaurantId,
          storedPlatform,
          tokenResponse,
          accountData
        );

        // Navigate back to dashboard with success
        navigate('/dashboard', {
          state: {
            oauthSuccess: true,
            platform: storedPlatform,
            accountName: accountData.account_name,
          },
        });
      } catch (error: any) {
        console.error('OAuth callback error:', error);
        navigate('/dashboard', {
          state: {
            oauthError: true,
            message: error.message || 'فشل في إكمال المصادقة',
          },
        });
      }
    };

    handleCallback();
  }, [navigate, oauthService]);

  // Platform-specific account detail fetching
  const fetchAccountDetails = async (
    platform: string,
    accessToken: string
  ): Promise<{
    account_id: string;
    account_name: string;
    account_handle?: string;
    account_avatar_url?: string;
  }> => {
    switch (platform) {
      case 'facebook':
        return fetchFacebookAccount(accessToken);
      case 'instagram':
        return fetchInstagramAccount(accessToken);
      case 'google':
      case 'youtube':
        return fetchGoogleAccount(accessToken);
      case 'linkedin':
        return fetchLinkedInAccount(accessToken);
      case 'tiktok':
        return fetchTikTokAccount(accessToken);
      case 'twitter':
        return fetchTwitterAccount(accessToken);
      case 'pinterest':
        return fetchPinterestAccount(accessToken);
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  };

  const fetchFacebookAccount = async (accessToken: string) => {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/me?fields=id,name,picture&access_token=${accessToken}`
    );
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }

    return {
      account_id: data.id,
      account_name: data.name,
      account_avatar_url: data.picture?.data?.url,
    };
  };

  const fetchInstagramAccount = async (accessToken: string) => {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/me?fields=id,username,profile_picture_url&access_token=${accessToken}`
    );
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }

    return {
      account_id: data.id,
      account_name: data.username,
      account_handle: data.username,
      account_avatar_url: data.profile_picture_url,
    };
  };

  const fetchGoogleAccount = async (accessToken: string) => {
    const response = await fetch(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    const data = await response.json();

    return {
      account_id: data.sub,
      account_name: data.name,
      account_handle: data.email,
      account_avatar_url: data.picture,
    };
  };

  const fetchLinkedInAccount = async (accessToken: string) => {
    const response = await fetch(
      'https://api.linkedin.com/v2/me',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    const data = await response.json();

    return {
      account_id: data.id,
      account_name: `${data.localizedFirstName} ${data.localizedLastName}`,
    };
  };

  const fetchTikTokAccount = async (accessToken: string) => {
    const response = await fetch(
      'https://open.tiktokapis.com/v2/user/info/',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    const data = await response.json();

    if (data.error?.code) {
      throw new Error(data.error.message);
    }

    return {
      account_id: data.data.user.open_id,
      account_name: data.data.user.display_name,
      account_handle: data.data.user.username,
      account_avatar_url: data.data.user.avatar_url,
    };
  };

  const fetchTwitterAccount = async (accessToken: string) => {
    const response = await fetch(
      'https://api.twitter.com/2/users/me',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    const data = await response.json();

    if (data.errors) {
      throw new Error(data.errors[0].message);
    }

    return {
      account_id: data.data.id,
      account_name: data.data.name,
      account_handle: data.data.username,
      account_avatar_url: data.data.profile_image_url,
    };
  };

  const fetchPinterestAccount = async (accessToken: string) => {
    const response = await fetch(
      'https://api.pinterest.com/v5/user_account',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    const data = await response.json();

    return {
      account_id: data.id,
      account_name: data.username,
      account_handle: data.username,
      account_avatar_url: data.profile_image,
    };
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-muted-foreground">جاري إكمال المصادقة...</p>
      </div>
    </div>
  );
}
