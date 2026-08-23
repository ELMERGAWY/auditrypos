-- Manager API2 secret reference guard.
-- Additive-only: constrains metadata; never stores or prints a token.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'manager_integrations_token_secret_ref_format'
      AND conrelid = 'public.manager_integrations'::regclass
  ) THEN
    ALTER TABLE public.manager_integrations
      ADD CONSTRAINT manager_integrations_token_secret_ref_format
      CHECK (token_secret_ref ~ '^MANAGER_API_TOKEN(?:_[A-Z0-9_]+)?$');
  END IF;
END;
$$;

COMMENT ON CONSTRAINT manager_integrations_token_secret_ref_format ON public.manager_integrations
  IS 'Only server-side Manager API token env names are allowed; arbitrary env lookup is forbidden.';

COMMIT;
