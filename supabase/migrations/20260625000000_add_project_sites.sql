-- Add project_sites table for project hierarchy (Client → Project → Site → Block)
CREATE TABLE IF NOT EXISTS project_sites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE
);

-- Add site_id to project_blocks with backward compatibility
ALTER TABLE project_blocks 
  ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES project_sites(id) ON DELETE CASCADE;

-- Add site_id to expenses table for tracking expenses per site
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES project_sites(id) ON DELETE SET NULL;

-- Add site_id to sales_invoices table for tracking revenues per site
ALTER TABLE sales_invoices
  ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES project_sites(id) ON DELETE SET NULL;

-- Add site_id to purchase_invoices table for tracking purchases per site
ALTER TABLE purchase_invoices
  ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES project_sites(id) ON DELETE SET NULL;
