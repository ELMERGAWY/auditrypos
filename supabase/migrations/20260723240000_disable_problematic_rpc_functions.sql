-- Disable problematic RPC functions that cause stack depth limit exceeded error
-- These functions are called recursively and cause infinite loops

-- Drop the problematic update_account_balance RPC function
DROP FUNCTION IF EXISTS public.update_account_balance CASCADE;

-- Note: Account balances will need to be updated manually or via a separate process
-- This is a temporary fix to allow journal entries to be created without errors
