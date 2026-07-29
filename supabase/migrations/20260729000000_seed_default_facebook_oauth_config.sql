-- Seed Default Facebook OAuth Configuration
-- This migration adds a global Facebook OAuth configuration that can be used by all restaurants

-- Insert global Facebook OAuth config (restaurant_id IS NULL)
INSERT INTO public.social_media_oauth_config (
  id,
  restaurant_id,
  platform,
  client_id,
  client_secret,
  redirect_uri,
  is_active,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  NULL, -- NULL means this is a global config
  'facebook'::social_platform,
  '1447986463460447', -- Default Facebook App ID
  'your_client_secret_here', -- This should be replaced with actual secret from environment
  NULL,
  true,
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;

-- Note: The client_secret should be replaced with the actual value from environment variables
-- or updated manually after deployment for security reasons
