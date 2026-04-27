-- ============================================================
-- DATABASE AUDIT & CLEANUP SYSTEM
-- This view helps identify tables that are NOT linked to a restaurant
-- which can cause data leaks or orphan records.
-- ============================================================

BEGIN;

CREATE OR REPLACE VIEW public.sys_unlinked_tables AS
SELECT 
    t.table_name,
    'Missing restaurant_id' as issue_type
FROM 
    information_schema.tables t
LEFT JOIN 
    information_schema.columns c ON t.table_name = c.table_name AND c.column_name IN ('restaurant_id', 'workspace_id', 'company_id')
WHERE 
    t.table_schema = 'public' 
    AND t.table_type = 'BASE TABLE'
    AND c.column_name IS NULL
    AND t.table_name NOT IN (
        -- System/Auth tables that shouldn't have restaurant_id
        'schema_migrations', 
        'restaurants',
        'companies',
        'workspaces',
        'business_profiles',
        'users',
        'profiles'
    );

COMMIT;
