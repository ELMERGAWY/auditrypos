-- Expand the business_type enum to include all new modular ERP business types
ALTER TYPE public.business_type ADD VALUE IF NOT EXISTS 'shipping';
ALTER TYPE public.business_type ADD VALUE IF NOT EXISTS 'distribution';
ALTER TYPE public.business_type ADD VALUE IF NOT EXISTS 'hospital';
ALTER TYPE public.business_type ADD VALUE IF NOT EXISTS 'factory';
ALTER TYPE public.business_type ADD VALUE IF NOT EXISTS 'real_estate';
ALTER TYPE public.business_type ADD VALUE IF NOT EXISTS 'contracting';
ALTER TYPE public.business_type ADD VALUE IF NOT EXISTS 'finishing';
ALTER TYPE public.business_type ADD VALUE IF NOT EXISTS 'rental';
ALTER TYPE public.business_type ADD VALUE IF NOT EXISTS 'education';
ALTER TYPE public.business_type ADD VALUE IF NOT EXISTS 'law_firm';
ALTER TYPE public.business_type ADD VALUE IF NOT EXISTS 'marketing_agency';
ALTER TYPE public.business_type ADD VALUE IF NOT EXISTS 'gym';
ALTER TYPE public.business_type ADD VALUE IF NOT EXISTS 'beauty_salon';
ALTER TYPE public.business_type ADD VALUE IF NOT EXISTS 'auto_repair';
