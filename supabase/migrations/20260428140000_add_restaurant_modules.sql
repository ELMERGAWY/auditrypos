-- Add modules column to track enabled ERP features for each business
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS enabled_modules JSONB DEFAULT '[]'::jsonb;

-- Update existing restaurants to have a default module based on their type
UPDATE public.restaurants 
SET enabled_modules = jsonb_build_array(business_type)
WHERE enabled_modules = '[]'::jsonb;
