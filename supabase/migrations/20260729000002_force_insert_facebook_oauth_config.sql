-- Force Insert Facebook OAuth Configuration
-- This migration deletes any existing Facebook config and inserts a fresh global config

-- First, delete any existing Facebook configurations (both restaurant-specific and global)
DELETE FROM public.social_media_oauth_config 
WHERE platform = 'facebook'::social_platform;

-- Then insert the global Facebook OAuth config
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
  '1447986463460447', -- Facebook App ID
  '31840b9196da911b65fa91dacfeda56f', -- Facebook App Secret
  NULL,
  true,
  NOW(),
  NOW()
);

-- Verification query (run this to confirm the insert worked)
-- SELECT * FROM public.social_media_oauth_config WHERE platform = 'facebook';
