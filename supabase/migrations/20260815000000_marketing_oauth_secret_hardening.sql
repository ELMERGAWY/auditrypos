-- AuditryPOS marketing OAuth secret hardening
-- Additive security change. No customer, order, invoice, inventory, or accounting data is modified.
-- OAuth secrets and provider tokens are server-side concerns and must not be exposed
-- through the browser's Supabase client.

BEGIN;

-- Remove broad table grants first. Re-grant only the identity columns that the
-- existing account cards need. Row-level policies still apply to every statement.
REVOKE SELECT ON TABLE public.social_media_accounts FROM anon, authenticated;
GRANT SELECT (
  id, restaurant_id, platform, account_id, account_name, account_handle,
  account_avatar_url, token_expires_at, scopes, is_active, is_primary,
  last_synced_at, last_posted_at, created_at, updated_at
) ON TABLE public.social_media_accounts TO authenticated;

-- The browser may deactivate an account or change its primary marker, but it may
-- never insert, rotate, or overwrite provider tokens directly.
REVOKE INSERT ON TABLE public.social_media_accounts FROM anon, authenticated;
REVOKE UPDATE ON TABLE public.social_media_accounts FROM anon, authenticated;
GRANT UPDATE (is_active, is_primary, updated_at)
  ON TABLE public.social_media_accounts TO authenticated;
REVOKE DELETE ON TABLE public.social_media_accounts FROM anon, authenticated;

-- OAuth application secrets are never a tenant-user field. The server-side OAuth
-- broker uses the service role and is not affected by these browser revokes.
REVOKE ALL ON TABLE public.social_media_oauth_config FROM anon, authenticated;

-- Legacy Facebook-specific account storage has token-shaped columns as well.
-- Keep the existing account/page UI usable through explicit safe fields while
-- preventing accidental SELECT * exposure.
REVOKE SELECT ON TABLE public.marketing_facebook_accounts FROM anon, authenticated;
GRANT SELECT (
  id, restaurant_id, business_id, account_name, token_expires_at,
  is_active, is_connected, permissions, metadata, created_at, updated_at, created_by
) ON TABLE public.marketing_facebook_accounts TO authenticated;
REVOKE INSERT ON TABLE public.marketing_facebook_accounts FROM anon, authenticated;
REVOKE UPDATE ON TABLE public.marketing_facebook_accounts FROM anon, authenticated;
GRANT UPDATE (is_active, is_connected, updated_at)
  ON TABLE public.marketing_facebook_accounts TO authenticated;
REVOKE DELETE ON TABLE public.marketing_facebook_accounts FROM anon, authenticated;

-- Existing helper placeholders are not a token vault. Make their purpose explicit
-- for future migrations without changing any existing token values here.
COMMENT ON COLUMN public.social_media_accounts.access_token IS
  'Server-side provider token. Never select or expose through the browser client.';
COMMENT ON COLUMN public.social_media_accounts.refresh_token IS
  'Server-side provider refresh token. Never select or expose through the browser client.';
COMMENT ON COLUMN public.social_media_oauth_config.client_secret IS
  'Server-side OAuth application secret. Never expose through the browser client.';

COMMIT;
