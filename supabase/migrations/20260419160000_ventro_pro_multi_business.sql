
-- ============================================================
-- VENTRO PRO TRANSFORMATION: Multi-Business Architecture
-- ============================================================
-- This migration transforms Auditry POS into a world-class
-- multi-business POS system similar to Ventro Pro
-- ============================================================

-- 1. EXTEND RESTAURANTS TABLE WITH BUSINESS CONFIGURATION
-- ============================================================

-- Add business configuration columns
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS business_category VARCHAR(50) DEFAULT 'restaurant',
  ADD COLUMN IF NOT EXISTS tax_number VARCHAR(50) DEFAULT '',
  ADD COLUMN IF NOT EXISTS commercial_registration VARCHAR(100) DEFAULT '',
  ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS phone VARCHAR(20) DEFAULT '',
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'egp',
  ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Africa/Cairo',
  ADD COLUMN IF NOT EXISTS receipt_footer TEXT DEFAULT 'شكراً لزيارتكم!',
  ADD COLUMN IF NOT EXISTS receipt_header TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS auto_print_receipt BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS enable_kitchen_print BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS enable_customer_display BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS layout_config JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS feature_flags JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS theme_settings JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS quick_actions JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS printer_settings JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS payment_gateways JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tax_settings JSONB DEFAULT '{"enabled": false, "rate": 0, "included": true}';

-- 2. CREATE BUSINESS WORKSPACES (Multi-location support)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  type VARCHAR(50) DEFAULT 'main', -- main, branch, warehouse, kiosk
  is_active BOOLEAN DEFAULT true,
  address TEXT DEFAULT '',
  phone VARCHAR(20) DEFAULT '',
  manager_id UUID REFERENCES auth.users(id),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- 3. CREATE POS LAYOUTS TABLE (Per-workspace custom layouts)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pos_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(100) NOT NULL,
  layout_type VARCHAR(50) NOT NULL, -- 'restaurant', 'retail', 'grocery', 'services', 'pharmacy'
  config JSONB NOT NULL DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pos_layouts ENABLE ROW LEVEL SECURITY;

-- 4. CREATE TERMINALS TABLE (POS devices)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.terminals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(100) NOT NULL,
  device_id VARCHAR(100) UNIQUE NOT NULL,
  device_type VARCHAR(50) DEFAULT 'desktop', -- desktop, tablet, mobile, kiosk
  is_active BOOLEAN DEFAULT true,
  last_seen_at TIMESTAMPTZ,
  settings JSONB DEFAULT '{}',
  current_shift_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.terminals ENABLE ROW LEVEL SECURITY;

-- 5. EXTEND ORDERS WITH WORKSPACE SUPPORT
-- ============================================================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id),
  ADD COLUMN IF NOT EXISTS terminal_id UUID REFERENCES public.terminals(id),
  ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'pos', -- pos, online, qr, api, mobile
  ADD COLUMN IF NOT EXISTS table_section VARCHAR(50) DEFAULT '',
  ADD COLUMN IF NOT EXISTS guest_count INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS service_charge NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS round_amount NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_refunded BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS refund_reason TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS void_reason TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_voided BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS fiscal_invoice_number VARCHAR(100) DEFAULT '',
  ADD COLUMN IF NOT EXISTS fiscal_status VARCHAR(50) DEFAULT '', -- pending, sent, failed
  ADD COLUMN IF NOT EXISTS split_bill_info JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS merge_bill_info JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS merged_from JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS preparation_time INTEGER DEFAULT 0; -- in minutes

-- 6. CREATE ORDER MODIFICATIONS TABLE (Audit trail)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.order_modifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  modified_by UUID REFERENCES auth.users(id),
  modification_type VARCHAR(50) NOT NULL, -- item_added, item_removed, qty_changed, discount_added, etc
  old_value JSONB,
  new_value JSONB,
  reason TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.order_modifications ENABLE ROW LEVEL SECURITY;

-- 7. CREATE CASH DRAWERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cash_drawers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  terminal_id UUID REFERENCES public.terminals(id),
  name VARCHAR(100) NOT NULL,
  current_balance NUMERIC(12,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  last_reconciled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cash_drawers ENABLE ROW LEVEL SECURITY;

-- 8. CREATE CASH TRANSACTIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cash_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drawer_id UUID REFERENCES public.cash_drawers(id) ON DELETE CASCADE NOT NULL,
  transaction_type VARCHAR(50) NOT NULL, -- sale, refund, payout, payin, opening, closing
  amount NUMERIC(12,2) NOT NULL,
  reference_type VARCHAR(50), -- order, shift, expense, etc
  reference_id UUID,
  notes TEXT DEFAULT '',
  performed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cash_transactions ENABLE ROW LEVEL SECURITY;

-- 9. CREATE PRINTER CONFIGURATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.printer_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(100) NOT NULL,
  printer_type VARCHAR(50) DEFAULT 'thermal', -- thermal, laser, inkjet
  connection_type VARCHAR(50) DEFAULT 'network', -- network, usb, bluetooth, cloud
  ip_address VARCHAR(50) DEFAULT '',
  port INTEGER DEFAULT 9100,
  categories JSONB DEFAULT '[]', -- which categories print here
  print_receipts BOOLEAN DEFAULT true,
  print_kitchen BOOLEAN DEFAULT false,
  print_bar BOOLEAN DEFAULT false,
  paper_width INTEGER DEFAULT 80, -- mm
  header_text TEXT DEFAULT '',
  footer_text TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.printer_configs ENABLE ROW LEVEL SECURITY;

-- 10. CREATE FAVORITES/QUICK ACCESS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  favorite_type VARCHAR(50) NOT NULL, -- item, customer, action
  item_id UUID,
  item_type VARCHAR(50), -- menu_item, product, customer
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

-- 11. CREATE SCREEN LAYOUTS PRESETS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.screen_layout_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  layout_type VARCHAR(50) NOT NULL,
  business_category VARCHAR(50) NOT NULL,
  config JSONB NOT NULL,
  is_system_preset BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default presets for different business types
INSERT INTO public.screen_layout_presets (name, layout_type, business_category, config, is_system_preset) VALUES
('مطعم - الكلاسيكي', 'pos', 'restaurant', '{
  "posLayout": {
    "showTableGrid": true,
    "showCategoriesSidebar": true,
    "itemGridCols": 4,
    "showItemImages": true,
    "cartPosition": "right",
    "quickActions": ["split_bill", "merge_tables", "transfer_table", "discount", "void"]
  },
  "orderTypes": ["dine_in", "takeaway", "delivery"],
  "features": ["tables", "kitchen_display", "waiter_calls", "qr_menu", "reservations"]
}', true),

('مطعم - سريع', 'pos', 'restaurant', '{
  "posLayout": {
    "showTableGrid": false,
    "showCategoriesSidebar": false,
    "itemGridCols": 6,
    "showItemImages": true,
    "cartPosition": "right",
    "quickActions": ["quick_sale", "discount", "hold", "print"]
  },
  "orderTypes": ["takeaway", "dine_in"],
  "features": ["quick_sale", "kitchen_display"]
}', true),

('تجزئة - متجر', 'pos', 'retail', '{
  "posLayout": {
    "showTableGrid": false,
    "showCategoriesSidebar": true,
    "itemGridCols": 5,
    "showItemImages": true,
    "cartPosition": "right",
    "quickActions": ["barcode", "customer", "discount", "hold", "layaway"],
    "showBarcodeScanner": true
  },
  "orderTypes": ["pickup", "delivery"],
  "features": ["barcode", "inventory", "customers", "layaway", "gift_cards"]
}', true),

('بقالة - سوبر ماركت', 'pos', 'grocery', '{
  "posLayout": {
    "showTableGrid": false,
    "showCategoriesSidebar": true,
    "itemGridCols": 6,
    "showItemImages": true,
    "cartPosition": "right",
    "quickActions": ["barcode", "scale", "customer", "discount", "hold"],
    "showBarcodeScanner": true,
    "showScale": true
  },
  "orderTypes": ["pickup"],
  "features": ["barcode", "scale", "expiry_tracking", "inventory", "loyalty"]
}', true),

('صيدلية', 'pos', 'pharmacy', '{
  "posLayout": {
    "showTableGrid": false,
    "showCategoriesSidebar": true,
    "itemGridCols": 4,
    "showItemImages": true,
    "cartPosition": "right",
    "quickActions": ["barcode", "prescription", "insurance", "customer", "discount"],
    "showBarcodeScanner": true
  },
  "orderTypes": ["pickup", "delivery"],
  "features": ["barcode", "prescriptions", "insurance", "expiry_tracking", "inventory"]
}', true),

('خدمات - مغسلة/صيانة', 'pos', 'services', '{
  "posLayout": {
    "showTableGrid": false,
    "showCategoriesSidebar": true,
    "itemGridCols": 4,
    "showItemImages": true,
    "cartPosition": "right",
    "quickActions": ["service_ticket", "customer", "pickup_time", "delivery_time", "status"]
  },
  "orderTypes": ["pickup", "delivery"],
  "features": ["service_tracking", "pickup_delivery", "customer_history", "status_board"]
}', true),

('جملة', 'pos', 'wholesale', '{
  "posLayout": {
    "showTableGrid": false,
    "showCategoriesSidebar": true,
    "itemGridCols": 4,
    "showItemImages": false,
    "cartPosition": "right",
    "quickActions": ["customer", "credit_limit", "installments", "discount", "invoice"],
    "showPrices": "tiered"
  },
  "orderTypes": ["pickup", "delivery"],
  "features": ["credit", "installments", "price_tiers", "invoicing", "statements"]
}', true)
ON CONFLICT DO NOTHING;

-- 12. RLS POLICIES
-- ============================================================

-- Workspaces policies
CREATE POLICY "Owner reads workspaces" ON public.workspaces 
  FOR SELECT TO authenticated USING (
    public.is_restaurant_owner(auth.uid(), restaurant_id) OR 
    public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Owner manages workspaces" ON public.workspaces 
  FOR ALL TO authenticated USING (
    public.is_restaurant_owner(auth.uid(), restaurant_id) OR 
    public.has_role(auth.uid(), 'super_admin')
  );

-- POS Layouts policies
CREATE POLICY "Owner reads layouts" ON public.pos_layouts 
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND 
      (public.is_restaurant_owner(auth.uid(), w.restaurant_id) OR public.has_role(auth.uid(), 'super_admin')))
  );

CREATE POLICY "Owner manages layouts" ON public.pos_layouts 
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND 
      (public.is_restaurant_owner(auth.uid(), w.restaurant_id) OR public.has_role(auth.uid(), 'super_admin')))
  );

-- Terminals policies
CREATE POLICY "Owner reads terminals" ON public.terminals 
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND 
      (public.is_restaurant_owner(auth.uid(), w.restaurant_id) OR public.has_role(auth.uid(), 'super_admin')))
  );

CREATE POLICY "Owner manages terminals" ON public.terminals 
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND 
      (public.is_restaurant_owner(auth.uid(), w.restaurant_id) OR public.has_role(auth.uid(), 'super_admin')))
  );

-- Order modifications policies
CREATE POLICY "Owner reads modifications" ON public.order_modifications 
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND 
      (public.is_restaurant_owner(auth.uid(), o.restaurant_id) OR public.has_role(auth.uid(), 'super_admin')))
  );

CREATE POLICY "Owner creates modifications" ON public.order_modifications 
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND 
      public.is_restaurant_owner(auth.uid(), o.restaurant_id))
  );

-- Cash drawers policies
CREATE POLICY "Owner reads drawers" ON public.cash_drawers 
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND 
      (public.is_restaurant_owner(auth.uid(), w.restaurant_id) OR public.has_role(auth.uid(), 'super_admin')))
  );

CREATE POLICY "Owner manages drawers" ON public.cash_drawers 
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND 
      (public.is_restaurant_owner(auth.uid(), w.restaurant_id) OR public.has_role(auth.uid(), 'super_admin')))
  );

-- Cash transactions policies
CREATE POLICY "Owner reads transactions" ON public.cash_transactions 
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.cash_drawers d WHERE d.id = drawer_id AND 
      EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = d.workspace_id AND 
        (public.is_restaurant_owner(auth.uid(), w.restaurant_id) OR public.has_role(auth.uid(), 'super_admin'))))
  );

-- Printer configs policies
CREATE POLICY "Owner reads printers" ON public.printer_configs 
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND 
      (public.is_restaurant_owner(auth.uid(), w.restaurant_id) OR public.has_role(auth.uid(), 'super_admin')))
  );

CREATE POLICY "Owner manages printers" ON public.printer_configs 
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND 
      (public.is_restaurant_owner(auth.uid(), w.restaurant_id) OR public.has_role(auth.uid(), 'super_admin')))
  );

-- User favorites policies
CREATE POLICY "Users read own favorites" ON public.user_favorites 
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users manage own favorites" ON public.user_favorites 
  FOR ALL TO authenticated USING (user_id = auth.uid());

-- Screen layout presets (public read for all authenticated users)
CREATE POLICY "Authenticated reads presets" ON public.screen_layout_presets 
  FOR SELECT TO authenticated USING (true);

-- 13. FUNCTIONS
-- ============================================================

-- Function to get default workspace for restaurant
CREATE OR REPLACE FUNCTION public.get_default_workspace(p_restaurant_id UUID)
RETURNS UUID
LANGUAGE sql STABLE
AS $$
  SELECT id FROM public.workspaces 
  WHERE restaurant_id = p_restaurant_id AND is_active = true 
  ORDER BY created_at ASC LIMIT 1;
$$;

-- Function to auto-create workspace when restaurant is created
CREATE OR REPLACE FUNCTION public.auto_create_workspace()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.workspaces (restaurant_id, name, code, type, is_active)
  VALUES (NEW.id, NEW.name, 'MAIN-' || SUBSTRING(NEW.id::text, 1, 8), 'main', true);
  
  -- Also create a default cash drawer
  INSERT INTO public.cash_drawers (workspace_id, name, current_balance, is_active)
  VALUES (
    (SELECT id FROM public.workspaces WHERE restaurant_id = NEW.id LIMIT 1),
    'الدرج الرئيسي',
    0,
    true
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for auto workspace creation
DROP TRIGGER IF EXISTS trg_auto_create_workspace ON public.restaurants;
CREATE TRIGGER trg_auto_create_workspace
  AFTER INSERT ON public.restaurants
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_workspace();

-- Function to calculate order totals with tax
CREATE OR REPLACE FUNCTION public.calculate_order_totals(
  p_subtotal NUMERIC,
  p_discount NUMERIC,
  p_tax_rate NUMERIC,
  p_service_charge_rate NUMERIC,
  p_tax_included BOOLEAN DEFAULT true
)
RETURNS TABLE (
  subtotal NUMERIC,
  discount NUMERIC,
  tax_amount NUMERIC,
  service_charge NUMERIC,
  total NUMERIC
)
LANGUAGE sql STABLE
AS $$
  SELECT 
    p_subtotal,
    p_discount,
    CASE 
      WHEN p_tax_included THEN (p_subtotal - p_discount) * p_tax_rate / (100 + p_tax_rate)
      ELSE (p_subtotal - p_discount) * p_tax_rate / 100
    END as tax_amount,
    (p_subtotal - p_discount) * p_service_charge_rate / 100 as service_charge,
    CASE 
      WHEN p_tax_included THEN p_subtotal - p_discount + ((p_subtotal - p_discount) * p_service_charge_rate / 100)
      ELSE (p_subtotal - p_discount) * (1 + p_tax_rate/100) + ((p_subtotal - p_discount) * p_service_charge_rate / 100)
    END as total
$$;

-- 14. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_workspaces_restaurant ON public.workspaces(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_pos_layouts_workspace ON public.pos_layouts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_terminals_workspace ON public.terminals(workspace_id);
CREATE INDEX IF NOT EXISTS idx_orders_workspace ON public.orders(workspace_id);
CREATE INDEX IF NOT EXISTS idx_orders_terminal ON public.orders(terminal_id);
CREATE INDEX IF NOT EXISTS idx_order_modifications_order ON public.order_modifications(order_id);
CREATE INDEX IF NOT EXISTS idx_cash_drawers_workspace ON public.cash_drawers(workspace_id);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_drawer ON public.cash_transactions(drawer_id);
CREATE INDEX IF NOT EXISTS idx_printer_configs_workspace ON public.printer_configs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_user ON public.user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_layout_presets_category ON public.screen_layout_presets(business_category);

-- 15. ENABLE REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.workspaces;
ALTER PUBLICATION supabase_realtime ADD TABLE public.terminals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cash_drawers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cash_transactions;

-- Migration complete
-- ============================================================
