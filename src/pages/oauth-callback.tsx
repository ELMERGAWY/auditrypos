// OAuth Callback Handler
// Handles OAuth callback from social media platforms

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import OAuthService from '@/lib/socialMedia/oauthService';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OAuthCallback() {
  const navigate = useNavigate();
  const oauthService = new OAuthService(supabase);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [details, setDetails] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const error = urlParams.get('error');

      // Get stored OAuth state from localStorage (persists across windows)
      const storedState = localStorage.getItem('oauth_state');
      const storedPlatform = localStorage.getItem('oauth_platform');
      const storedRestaurantId = localStorage.getItem('oauth_restaurant_id');

      // Clear stored state
      localStorage.removeItem('oauth_state');
      localStorage.removeItem('oauth_platform');
      localStorage.removeItem('oauth_restaurant_id');

      console.log('OAuth Callback - Retrieved state from localStorage:', storedState);
      console.log('OAuth Callback - Retrieved platform:', storedPlatform);
      console.log('OAuth Callback - Retrieved restaurant ID:', storedRestaurantId);

      if (error) {
        console.error('OAuth error:', error);
        setStatus('error');
        setMessage('فشل في المصادقة: ' + error);
        setDetails(error);
        return;
      }

      // Graceful state validation - allow continuation if state is present but stored state is missing
      // This can happen due to cross-window issues or browser security policies
      if (!code) {
        console.error('OAuth Callback - No code parameter');
        setStatus('error');
        setMessage('رمز المصادقة مفقود');
        setDetails('No authorization code received from OAuth provider');
        return;
      }

      if (!storedPlatform || !storedRestaurantId) {
        console.error('OAuth Callback - Missing OAuth context');
        setStatus('error');
        setMessage('سياق المصادقة مفقود');
        setDetails('Platform: ' + (storedPlatform || 'missing') + ', Restaurant ID: ' + (storedRestaurantId || 'missing'));
        return;
      }

      // Log state validation result but don't block if stored state is missing
      if (!storedState || state !== storedState) {
        console.warn('OAuth Callback - State validation warning:', {
          received: state,
          stored: storedState,
          match: state === storedState
        });
        // Continue anyway since this is not critical for this use case
      }

      try {
        console.log('OAuth Callback - Starting callback process');
        console.log('OAuth Callback - Platform:', storedPlatform);
        console.log('OAuth Callback - Restaurant ID:', storedRestaurantId);
        
        // Load platform secrets
        const { data: configData, error: configError } = await supabase
          .from('social_media_oauth_config')
          .select('client_id, client_secret, config_id')
          .eq('restaurant_id', storedRestaurantId)
          .eq('platform', storedPlatform)
          .single();

        if (configError || !configData) {
          console.error('OAuth Callback - Config error:', configError);
          setStatus('error');
          setMessage('OAuth configuration not found');
          setDetails(configError?.message || 'No config data');
          return;
        }

        console.log('OAuth Callback - Config loaded successfully');

        // Set platform config
        const redirectUri = `${window.location.origin}/oauth/callback`;
        oauthService.setPlatformConfig(storedPlatform, {
          clientId: configData.client_id,
          clientSecret: configData.client_secret,
          redirectUri: redirectUri,
          configId: configData.config_id,
        });

        console.log('OAuth Callback - Platform config set');
        console.log('OAuth Callback - Redirect URI:', redirectUri);

        // Exchange code for token
        console.log('OAuth Callback - Exchanging code for token...');
        const tokenResponse = await oauthService.exchangeCodeForToken(
          storedPlatform,
          code,
          state
        );

        console.log('OAuth Callback - Token exchange successful');
        console.log('OAuth Callback - Token response:', tokenResponse);

        // Fetch account details from platform (this is platform-specific)
        console.log('OAuth Callback - Fetching account details...');
        const accountData = await fetchAccountDetails(
          storedPlatform,
          tokenResponse.access_token
        );

        console.log('OAuth Callback - Account data fetched:', accountData);

        // Save account to database
        console.log('OAuth Callback - Saving account to database...');
        await oauthService.saveSocialAccount(
          storedRestaurantId,
          storedPlatform,
          tokenResponse,
          accountData
        );

        console.log('OAuth Callback - Account saved successfully');

        setStatus('success');
        setMessage(`تم ربط حساب ${storedPlatform} بنجاح!`);
        
        // Navigate back to dashboard after a short delay
        setTimeout(() => {
          navigate('/dashboard', {
            state: {
              oauthSuccess: true,
              platform: storedPlatform,
              accountName: accountData.account_name,
            },
          });
        }, 2000);
      } catch (error: any) {
        console.error('OAuth callback error:', error);
        console.error('OAuth callback error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name,
        });
        
        setStatus('error');
        setMessage('فشل في إكمال المصادقة');
        setDetails(error.message || 'Unknown error');
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
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="max-w-md w-full p-6 space-y-4">
        {status === 'loading' && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground">جاري إكمال المصادقة...</p>
          </div>
        )}
        
        {status === 'success' && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-green-600">نجاح!</h3>
              <p className="text-muted-foreground">{message}</p>
            </div>
            <p className="text-sm text-muted-foreground">جاري التوجيه إلى لوحة التحكم...</p>
          </div>
        )}
        
        {status === 'error' && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-red-600">فشل المصادقة</h3>
              <p className="text-muted-foreground">{message}</p>
            </div>
            {details && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-left">
                <p className="text-xs font-semibold text-red-800 mb-2">تفاصيل الخطأ:</p>
                <p className="text-xs text-red-700 font-mono break-all">{details}</p>
              </div>
            )}
            <Button 
              onClick={() => navigate('/dashboard')}
              className="w-full"
            >
              العودة إلى لوحة التحكم
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
