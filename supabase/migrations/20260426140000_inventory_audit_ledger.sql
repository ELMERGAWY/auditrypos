-- ============================================================
-- AUDITRY POS: Advanced Inventory Audit & Ledger Sync
-- ============================================================

BEGIN;

-- 1. Create Inventory Audit Sessions
CREATE TABLE IF NOT EXISTS public.inventory_audit_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'open', -- 'open', 'completed', 'cancelled'
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  notes TEXT
);

-- 2. Create Inventory Audit Lines
CREATE TABLE IF NOT EXISTS public.inventory_audit_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.inventory_audit_sessions(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  book_quantity NUMERIC(15,3) NOT NULL,
  actual_quantity NUMERIC(15,3) NOT NULL,
  variance NUMERIC(15,3) GENERATED ALWAYS AS (actual_quantity - book_quantity) STORED,
  unit_cost NUMERIC(15,3) NOT NULL,
  total_variance_cost NUMERIC(15,3) GENERATED ALWAYS AS ((actual_quantity - book_quantity) * unit_cost) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Trigger to Update Product Quantity and Create Ledger Entry on Session Completion
CREATE OR REPLACE FUNCTION public.fn_complete_inventory_audit()
RETURNS trigger AS $$
DECLARE
  v_line RECORD;
  v_mapping JSONB;
  v_inventory_acc_id UUID;
  v_adjustment_acc_id UUID;
  v_entry_id UUID;
  v_entry_number VARCHAR(20);
  v_total_cost_change NUMERIC(15,3) := 0;
  v_company_id UUID;
BEGIN
  IF NEW.status = 'completed' AND OLD.status = 'open' THEN
    -- 1. Get Company ID
    SELECT company_id INTO v_company_id FROM public.restaurants WHERE id = NEW.restaurant_id;

    -- 2. Process each audit line
    FOR v_line IN SELECT * FROM public.inventory_audit_lines WHERE session_id = NEW.id LOOP
      -- Update Product Quantity
      UPDATE public.products 
      SET quantity = v_line.actual_quantity 
      WHERE id = v_line.product_id;

      -- Add Stock Movement
      INSERT INTO public.stock_movements (product_id, restaurant_id, type, quantity, reason)
      VALUES (v_line.product_id, NEW.restaurant_id, 
              CASE WHEN v_line.variance > 0 THEN 'in' ELSE 'out' END, 
              ABS(v_line.variance), 'تسوية جرد مخزني');
      
      v_total_cost_change := v_total_cost_change + v_line.total_variance_cost;
    END LOOP;

    -- 3. Create Journal Entry if there is a cost difference
    IF ABS(v_total_cost_change) > 0 THEN
      -- Get Accounts (1300 Inventory, 5200 Wastage/Adjustment)
      SELECT id INTO v_inventory_acc_id FROM public.chart_of_accounts WHERE restaurant_id = NEW.restaurant_id AND code = '1300' LIMIT 1;
      SELECT id INTO v_adjustment_acc_id FROM public.chart_of_accounts WHERE restaurant_id = NEW.restaurant_id AND code = '5200' LIMIT 1;

      IF v_inventory_acc_id IS NOT NULL AND v_adjustment_acc_id IS NOT NULL THEN
        -- Create Entry
        v_entry_number := 'IA-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || SUBSTR(NEW.id::text, 1, 4);
        
        INSERT INTO public.journal_entries (restaurant_id, company_id, entry_number, entry_date, description, source, total_debit, total_credit, is_posted)
        VALUES (NEW.restaurant_id, v_company_id, v_entry_number, NOW(), 'تسوية جرد مخزني - جلسة ' || NEW.id, 'auto', ABS(v_total_cost_change), ABS(v_total_cost_change), true)
        RETURNING id INTO v_entry_id;

        IF v_total_cost_change > 0 THEN
          -- Increase Inventory (Debit Inventory, Credit Adjustment)
          INSERT INTO public.journal_entry_lines (entry_id, account_id, debit, credit, description)
          VALUES 
            (v_entry_id, v_inventory_acc_id, v_total_cost_change, 0, 'زيادة مخزون - جرد'),
            (v_entry_id, v_adjustment_acc_id, 0, v_total_cost_change, 'تسوية زيادة مخزون');
        ELSE
          -- Decrease Inventory (Debit Adjustment, Credit Inventory)
          INSERT INTO public.journal_entry_lines (entry_id, account_id, debit, credit, description)
          VALUES 
            (v_entry_id, v_adjustment_acc_id, ABS(v_total_cost_change), 0, 'عجز مخزون - جرد'),
            (v_entry_id, v_inventory_acc_id, 0, ABS(v_total_cost_change), 'تسوية عجز مخزون');
        END IF;
      END IF;
    END IF;

    NEW.completed_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_complete_inventory_audit
BEFORE UPDATE ON public.inventory_audit_sessions
FOR EACH ROW
EXECUTE FUNCTION public.fn_complete_inventory_audit();

COMMIT;
