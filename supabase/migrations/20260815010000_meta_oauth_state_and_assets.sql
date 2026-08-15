-- AuditryPOS Meta OAuth state and asset discovery foundation
-- Additive only. No customer, order, invoice, inventory, or accounting data is modified.

BEGIN;

ALTER TABLE public.social_media_oauth_config
  ADD COLUMN IF NOT EXISTS config_id TEXT;

CREATE TABLE IF NOT EXISTS public.social_media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  platform social_platform NOT NULL,
  external_id TEXT NOT NULL,
  asset_type TEXT NOT NULL,
  asset_name TEXT NOT NULL,
  asset_handle TEXT,
  parent_external_id TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'connected', 'disabled')),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (restaurant_id, platform, external_id)
);

CREATE INDEX IF NOT EXISTS idx_social_media_assets_scope
  ON public.social_media_assets (restaurant_id, platform, status);

ALTER TABLE public.social_media_assets ENABLE ROW LEVEL SECURITY;

-- No browser policies: asset tokens are consumed only by server-side functions.

CREATE TABLE IF NOT EXISTS public.social_oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_hash TEXT NOT NULL UNIQUE,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform social_platform NOT NULL,
  redirect_uri TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_oauth_states_expiry
  ON public.social_oauth_states (expires_at)
  WHERE consumed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_social_oauth_states_tenant
  ON public.social_oauth_states (restaurant_id, user_id, platform);

ALTER TABLE public.social_oauth_states ENABLE ROW LEVEL SECURITY;

-- Deliberately no anon/authenticated policies: only the server-side OAuth broker
-- (service role) can create, consume, or inspect state records.

COMMENT ON TABLE public.social_media_assets IS
  'Server-side discovered social assets. Provider tokens are never exposed to browser roles.';
COMMENT ON COLUMN public.social_media_assets.access_token IS
  'Server-side provider token for this discovered asset. Never select through the browser client.';
COMMENT ON TABLE public.social_oauth_states IS
  'One-time server-side OAuth state records. Never expose raw state hashes or provider tokens to client queries.';
COMMENT ON COLUMN public.social_media_oauth_config.config_id IS
  'Optional Meta Login for Business configuration ID, read only by the server-side OAuth broker.';

COMMIT;
