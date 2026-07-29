-- Update Facebook Client Secret
-- This migration updates the Facebook OAuth config with the actual client secret

-- Update the global Facebook OAuth config with the actual client secret
UPDATE public.social_media_oauth_config
SET 
  client_secret = '31840b9196da911b65fa91dacfeda56f',
  updated_at = NOW()
WHERE 
  platform = 'facebook'::social_platform 
  AND restaurant_id IS NULL
  AND client_secret = 'your_client_secret_here';
