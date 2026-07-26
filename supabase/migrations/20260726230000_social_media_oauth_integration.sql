-- Social Media OAuth Integration Schema
-- This migration adds tables for managing social media accounts via OAuth

-- Social media platforms enum
CREATE TYPE social_platform AS ENUM ('facebook', 'instagram', 'google', 'youtube', 'linkedin', 'tiktok', 'twitter', 'pinterest');

-- Social media accounts table
CREATE TABLE IF NOT EXISTS public.social_media_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  platform social_platform NOT NULL,
  account_id TEXT NOT NULL, -- Platform-specific account ID
  account_name TEXT NOT NULL, -- Display name (e.g., page name, channel name)
  account_handle TEXT, -- @handle or username
  account_avatar_url TEXT,
  access_token TEXT NOT NULL, -- OAuth access token (encrypted)
  refresh_token TEXT, -- OAuth refresh token (encrypted)
  token_expires_at TIMESTAMP WITH TIME ZONE,
  scopes TEXT[], -- Granted OAuth scopes
  is_active BOOLEAN DEFAULT true,
  is_primary BOOLEAN DEFAULT false, -- Primary account for this platform
  last_synced_at TIMESTAMP WITH TIME ZONE,
  last_posted_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}', -- Additional platform-specific data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(restaurant_id, platform, account_id)
);

-- Social media posts table
CREATE TABLE IF NOT EXISTS public.social_media_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  social_account_id UUID NOT NULL REFERENCES public.social_media_accounts(id) ON DELETE CASCADE,
  platform_post_id TEXT, -- Platform-specific post ID
  content TEXT NOT NULL,
  media_urls TEXT[], -- Array of image/video URLs
  post_type TEXT DEFAULT 'post', -- post, story, reel, etc.
  status TEXT DEFAULT 'draft', -- draft, scheduled, published, failed
  scheduled_at TIMESTAMP WITH TIME ZONE,
  published_at TIMESTAMP WITH TIME ZONE,
  metrics JSONB DEFAULT '{}', -- likes, comments, shares, views, etc.
  error_message TEXT,
  created_by UUID REFERENCES public.auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Social media analytics cache
CREATE TABLE IF NOT EXISTS public.social_media_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  social_account_id UUID NOT NULL REFERENCES public.social_media_accounts(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  followers_count INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,2) DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  posts_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  clicks_count INTEGER DEFAULT 0,
  profile_views INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(social_account_id, metric_date)
);

-- OAuth connection logs
CREATE TABLE IF NOT EXISTS public.oauth_connection_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  social_account_id UUID REFERENCES public.social_media_accounts(id) ON DELETE SET NULL,
  platform social_platform NOT NULL,
  action TEXT NOT NULL, -- connect, disconnect, refresh_token, error
  status TEXT NOT NULL, -- success, failed
  error_message TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_by UUID REFERENCES public.auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- OAuth configuration storage for each platform
CREATE TABLE IF NOT EXISTS public.social_media_oauth_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  platform social_platform NOT NULL,
  client_id TEXT NOT NULL,
  client_secret TEXT NOT NULL,
  redirect_uri TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(restaurant_id, platform)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_social_media_accounts_restaurant ON public.social_media_accounts(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_social_media_accounts_platform ON public.social_media_accounts(platform);
CREATE INDEX IF NOT EXISTS idx_social_media_accounts_active ON public.social_media_accounts(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_social_media_posts_account ON public.social_media_posts(social_account_id);
CREATE INDEX IF NOT EXISTS idx_social_media_posts_status ON public.social_media_posts(status);
CREATE INDEX IF NOT EXISTS idx_social_media_posts_scheduled ON public.social_media_posts(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_social_media_analytics_account ON public.social_media_analytics(social_account_id);
CREATE INDEX IF NOT EXISTS idx_social_media_analytics_date ON public.social_media_analytics(metric_date);
CREATE INDEX IF NOT EXISTS idx_oauth_logs_restaurant ON public.oauth_connection_logs(restaurant_id);

-- RLS Policies
ALTER TABLE public.social_media_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_media_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_media_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_connection_logs ENABLE ROW LEVEL SECURITY;

-- Social media accounts RLS
CREATE POLICY "Users can view own restaurant social accounts"
  ON public.social_media_accounts FOR SELECT
  USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own restaurant social accounts"
  ON public.social_media_accounts FOR INSERT
  WITH CHECK (restaurant_id IN (SELECT id FROM public.restaurants WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own restaurant social accounts"
  ON public.social_media_accounts FOR UPDATE
  USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own restaurant social accounts"
  ON public.social_media_accounts FOR DELETE
  USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE user_id = auth.uid()));

-- Social media posts RLS
CREATE POLICY "Users can view own restaurant social posts"
  ON public.social_media_posts FOR SELECT
  USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own restaurant social posts"
  ON public.social_media_posts FOR INSERT
  WITH CHECK (restaurant_id IN (SELECT id FROM public.restaurants WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own restaurant social posts"
  ON public.social_media_posts FOR UPDATE
  USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own restaurant social posts"
  ON public.social_media_posts FOR DELETE
  USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE user_id = auth.uid()));

-- Social media analytics RLS
CREATE POLICY "Users can view own restaurant analytics"
  ON public.social_media_analytics FOR SELECT
  USING (
    social_account_id IN (
      SELECT id FROM public.social_media_accounts 
      WHERE restaurant_id IN (SELECT id FROM public.restaurants WHERE user_id = auth.uid())
    )
  );

-- OAuth logs RLS
CREATE POLICY "Users can view own restaurant oauth logs"
  ON public.oauth_connection_logs FOR SELECT
  USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own restaurant oauth logs"
  ON public.oauth_connection_logs FOR INSERT
  WITH CHECK (restaurant_id IN (SELECT id FROM public.restaurants WHERE user_id = auth.uid()));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- OAuth configuration storage RLS
ALTER TABLE public.social_media_oauth_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own restaurant oauth config"
  ON public.social_media_oauth_config FOR SELECT
  USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own restaurant oauth config"
  ON public.social_media_oauth_config FOR INSERT
  WITH CHECK (restaurant_id IN (SELECT id FROM public.restaurants WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own restaurant oauth config"
  ON public.social_media_oauth_config FOR UPDATE
  USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own restaurant oauth config"
  ON public.social_media_oauth_config FOR DELETE
  USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE user_id = auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_social_media_accounts_updated_at
  BEFORE UPDATE ON public.social_media_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_social_media_posts_updated_at
  BEFORE UPDATE ON public.social_media_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_social_media_oauth_config_updated_at
  BEFORE UPDATE ON public.social_media_oauth_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to encrypt OAuth tokens (using pgcrypto)
CREATE OR REPLACE FUNCTION public.encrypt_token(token TEXT)
RETURNS TEXT AS $$
BEGIN
  -- This is a placeholder. In production, use proper encryption
  -- For now, we'll store as-is but mark for encryption
  RETURN token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrypt OAuth tokens
CREATE OR REPLACE FUNCTION public.decrypt_token(encrypted_token TEXT)
RETURNS TEXT AS $$
BEGIN
  -- This is a placeholder. In production, use proper decryption
  RETURN encrypted_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to refresh expired tokens
CREATE OR REPLACE FUNCTION public.refresh_oauth_token(p_account_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_account RECORD;
  v_new_token TEXT;
  v_new_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT * INTO v_account FROM public.social_media_accounts WHERE id = p_account_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Social media account not found';
  END IF;
  
  -- This is a placeholder. In production, call the appropriate OAuth refresh endpoint
  -- based on the platform
  -- For now, just return false
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE public.social_media_accounts IS 'Stores OAuth-connected social media accounts';
COMMENT ON TABLE public.social_media_posts IS 'Stores social media posts and their status';
COMMENT ON TABLE public.social_media_analytics IS 'Cached analytics data for social media accounts';
COMMENT ON TABLE public.oauth_connection_logs IS 'Audit log for OAuth connection events';
