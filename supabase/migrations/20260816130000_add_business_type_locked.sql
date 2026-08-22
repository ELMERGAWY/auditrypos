-- AuditryPOS: restore the column used by the SuperAdmin restaurant-creation flow.
-- Additive only: no DROP, TRUNCATE, DELETE, or data rewrite.
BEGIN;

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS business_type_locked boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.restaurants.business_type_locked
  IS 'When true, the tenant business type is locked by an administrator.';

COMMIT;
