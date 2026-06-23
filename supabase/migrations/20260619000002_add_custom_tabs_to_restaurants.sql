-- Add custom_tabs column to restaurants to support super admin customization of tabs
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS custom_tabs JSONB DEFAULT '[]'::jsonb;
