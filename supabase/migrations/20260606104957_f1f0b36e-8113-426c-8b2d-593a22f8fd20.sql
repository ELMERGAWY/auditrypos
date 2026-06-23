
-- Extend purchase_invoices
ALTER TABLE public.purchase_invoices
  ADD COLUMN IF NOT EXISTS tax_amount numeric(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_amount numeric(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_amount numeric(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_credit boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS status varchar(20) NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS goods_received_at timestamptz,
  ADD COLUMN IF NOT EXISTS inventory_receipt_id uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- New line-items table that supports inventory OR GL posting per line
CREATE TABLE IF NOT EXISTS public.purchase_invoice_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id uuid NOT NULL REFERENCES public.purchase_invoices(id) ON DELETE CASCADE,
  line_type varchar(20) NOT NULL DEFAULT 'inventory', -- 'inventory' | 'gl'
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  gl_account_id uuid REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL,
  description text NOT NULL DEFAULT '',
  quantity numeric(15,3) NOT NULL DEFAULT 1,
  unit_cost numeric(15,4) NOT NULL DEFAULT 0,
  total numeric(15,2) NOT NULL DEFAULT 0,
  tax_amount numeric(15,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT purchase_invoice_items_line_type_chk CHECK (line_type IN ('inventory','gl'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_invoice_items TO authenticated;
GRANT ALL ON public.purchase_invoice_items TO service_role;

ALTER TABLE public.purchase_invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY pii_owner_all ON public.purchase_invoice_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.purchase_invoices p
      WHERE p.id = purchase_invoice_items.invoice_id
        AND (is_restaurant_owner(auth.uid(), p.restaurant_id) OR has_role(auth.uid(), 'super_admin'::app_role))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.purchase_invoices p
      WHERE p.id = purchase_invoice_items.invoice_id
        AND (is_restaurant_owner(auth.uid(), p.restaurant_id) OR has_role(auth.uid(), 'super_admin'::app_role))
    )
  );

CREATE INDEX IF NOT EXISTS idx_pii_invoice ON public.purchase_invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_pii_product ON public.purchase_invoice_items(product_id);
CREATE INDEX IF NOT EXISTS idx_pii_gl_account ON public.purchase_invoice_items(gl_account_id);
