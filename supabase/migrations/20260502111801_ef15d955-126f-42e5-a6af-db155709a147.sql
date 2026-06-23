
ALTER TABLE public.delivery_agents
  ADD COLUMN IF NOT EXISTS session_token text,
  ADD COLUMN IF NOT EXISTS session_expires_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_delivery_agents_session_token
  ON public.delivery_agents(session_token)
  WHERE session_token IS NOT NULL;
