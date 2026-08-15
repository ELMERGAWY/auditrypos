import type { SupabaseClient } from '@supabase/supabase-js';

export interface SocialPlatform {
  id: string;
  name: string;
  displayName: string;
  icon: string;
  color: string;
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

export const SOCIAL_PLATFORMS: Record<string, SocialPlatform> = {
  facebook: { id: 'facebook', name: 'facebook', displayName: 'فيسبوك', icon: '📘', color: '#1877F2' },
  instagram: { id: 'instagram', name: 'instagram', displayName: 'إنستغرام', icon: '📷', color: '#E4405F' },
  google: { id: 'google', name: 'google', displayName: 'جوجل', icon: '🔍', color: '#4285F4' },
  youtube: { id: 'youtube', name: 'youtube', displayName: 'يوتيوب', icon: '▶️', color: '#FF0000' },
  linkedin: { id: 'linkedin', name: 'linkedin', displayName: 'لينكد إن', icon: '💼', color: '#0077B5' },
  tiktok: { id: 'tiktok', name: 'tiktok', displayName: 'تيك توك', icon: '🎵', color: '#000000' },
  twitter: { id: 'twitter', name: 'twitter', displayName: 'تويتر (X)', icon: '🐦', color: '#1DA1F2' },
  pinterest: { id: 'pinterest', name: 'pinterest', displayName: 'بينتريست', icon: '📌', color: '#E60023' },
};

class OAuthService {
  constructor(private readonly supabase: SupabaseClient) {}

  async getSocialAccounts(restaurantId: string): Promise<SocialAccount[]> {
    const { data, error } = await this.supabase
      .from('social_media_accounts')
      .select('id, platform, account_id, account_name, account_handle, account_avatar_url, is_active, is_primary')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .order('is_primary', { ascending: false })
      .order('account_name', { ascending: true });

    if (error) throw new Error(`Failed to fetch social accounts: ${error.message}`);
    return (data || []) as SocialAccount[];
  }

  async deleteSocialAccount(accountId: string, restaurantId: string): Promise<void> {
    const { error } = await this.supabase
      .from('social_media_accounts')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', accountId)
      .eq('restaurant_id', restaurantId);

    if (error) throw new Error(`Failed to disconnect social account: ${error.message}`);
  }
}

export default OAuthService;
