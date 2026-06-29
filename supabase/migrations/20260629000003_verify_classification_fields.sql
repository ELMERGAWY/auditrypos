-- ============================================================
-- Verify Customer Classification Fields
-- This migration ensures all classification fields exist
-- ============================================================

BEGIN;

-- Add classification columns if they don't exist
DO $$
BEGIN
  -- Add risk_level
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'risk_level'
  ) THEN
    ALTER TABLE public.customers ADD COLUMN risk_level TEXT DEFAULT 'normal' CHECK (risk_level IN ('normal', 'medium', 'high', 'blocked'));
  END IF;

  -- Add warning_flags
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'warning_flags'
  ) THEN
    ALTER TABLE public.customers ADD COLUMN warning_flags INTEGER DEFAULT 0 CHECK (warning_flags >= 0 AND warning_flags <= 4);
  END IF;

  -- Add vip_status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'vip_status'
  ) THEN
    ALTER TABLE public.customers ADD COLUMN vip_status BOOLEAN DEFAULT false;
  END IF;
END $$;

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '✅ Customer classification fields verified/added';
END $$;
