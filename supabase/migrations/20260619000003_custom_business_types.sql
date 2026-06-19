-- ============================================================
-- CUSTOM BUSINESS TYPES TABLE
-- ============================================================

BEGIN;

-- Create custom_business_types table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'custom_business_types'
  ) THEN
    CREATE TABLE public.custom_business_types (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      icon VARCHAR(50) DEFAULT '🏢',
      tabs TEXT[] NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      created_by UUID REFERENCES auth.users(id)
    );

    RAISE NOTICE '✅ Created custom_business_types table';
  ELSE
    RAISE NOTICE 'ℹ️ custom_business_types table already exists';
  END IF;
END
$$;

-- Add index for faster queries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'custom_business_types'
    AND indexname = 'idx_custom_business_types_name'
  ) THEN
    CREATE INDEX idx_custom_business_types_name ON public.custom_business_types(name);
    RAISE NOTICE '✅ Created index on custom_business_types.name';
  END IF;
END
$$;

-- Enable RLS
ALTER TABLE public.custom_business_types ENABLE ROW LEVEL SECURITY;

-- Create policy: Only super admins can read/write custom business types
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'custom_business_types'
    AND policyname = 'super_admin_full_access'
  ) THEN
    CREATE POLICY super_admin_full_access ON public.custom_business_types
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.user_roles
          WHERE user_roles.user_id = auth.uid()
          AND user_roles.role = 'super_admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.user_roles
          WHERE user_roles.user_id = auth.uid()
          AND user_roles.role = 'super_admin'
        )
      );

    RAISE NOTICE '✅ Created RLS policy for custom_business_types';
  END IF;
END
$$;

-- Add custom_business_type_id column to restaurants table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'restaurants'
    AND column_name = 'custom_business_type_id'
  ) THEN
    ALTER TABLE public.restaurants
    ADD COLUMN custom_business_type_id UUID REFERENCES public.custom_business_types(id) ON DELETE SET NULL;

    RAISE NOTICE '✅ Added custom_business_type_id column to restaurants table';
  ELSE
    RAISE NOTICE 'ℹ️ custom_business_type_id column already exists in restaurants table';
  END IF;
END
$$;

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '✅ Migration completed: custom_business_types table and restaurants column added';
END
$$;
