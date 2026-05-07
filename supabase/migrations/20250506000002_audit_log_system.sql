-- ============================================================
-- AUDIT LOG SYSTEM - For Tracking Financial Operations
-- Logs all critical business operations for compliance & debugging
-- ============================================================

-- 1. Create audit_log table if not exists
CREATE TABLE IF NOT EXISTS public.operation_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  operation_type TEXT NOT NULL, -- 'order_created', 'order_cancelled', 'payment_received', 'inventory_adjustment', 'journal_entry', etc.
  entity_type TEXT NOT NULL, -- 'order', 'payment', 'inventory', 'journal_entry'
  entity_id UUID, -- ID of the affected entity
  details JSONB NOT NULL DEFAULT '{}', -- Flexible details storage
  amount NUMERIC(15,4), -- Monetary amount if applicable
  old_values JSONB, -- Previous values for updates
  new_values JSONB, -- New values after operation
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed', 'pending'))
);

-- 2. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_log_restaurant ON public.operation_audit_log(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON public.operation_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_operation ON public.operation_audit_log(operation_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON public.operation_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.operation_audit_log(created_at DESC);

-- 3. Enable RLS
ALTER TABLE public.operation_audit_log ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies - Owners and staff can read their audit logs
CREATE POLICY "Audit log owner access" 
ON public.operation_audit_log 
FOR ALL TO authenticated 
USING (
  public.is_restaurant_owner(auth.uid(), restaurant_id)
);

-- 5. Function to log operations
CREATE OR REPLACE FUNCTION public.log_operation(
  p_restaurant_id UUID,
  p_operation_type TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_details JSONB DEFAULT '{}',
  p_amount NUMERIC DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_status TEXT DEFAULT 'success'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
  v_user_email TEXT;
BEGIN
  -- Get current user email
  SELECT email INTO v_user_email 
  FROM auth.users 
  WHERE id = auth.uid();

  INSERT INTO public.operation_audit_log (
    restaurant_id,
    user_id,
    user_email,
    operation_type,
    entity_type,
    entity_id,
    details,
    amount,
    old_values,
    new_values,
    status
  ) VALUES (
    p_restaurant_id,
    auth.uid(),
    v_user_email,
    p_operation_type,
    p_entity_type,
    p_entity_id,
    p_details,
    p_amount,
    p_old_values,
    p_new_values,
    p_status
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION public.log_operation TO authenticated;

-- 7. Triggers to auto-log critical operations

-- 7.1 Auto-log order creation
CREATE OR REPLACE FUNCTION public.log_order_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.log_operation(
    NEW.restaurant_id,
    'order_created',
    'order',
    NEW.id,
    jsonb_build_object(
      'order_number', NEW.order_number,
      'status', NEW.status,
      'payment_method', NEW.payment_method,
      'customer_name', NEW.customer_name,
      'order_type', NEW.order_type
    ),
    NEW.total,
    NULL,
    to_jsonb(NEW)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_order_creation ON public.orders;
CREATE TRIGGER trg_log_order_creation
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.log_order_creation();

-- 7.2 Auto-log order status changes
CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.log_operation(
      NEW.restaurant_id,
      'order_status_changed',
      'order',
      NEW.id,
      jsonb_build_object(
        'order_number', NEW.order_number,
        'old_status', OLD.status,
        'new_status', NEW.status
      ),
      NEW.total,
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_order_status_change ON public.orders;
CREATE TRIGGER trg_log_order_status_change
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.log_order_status_change();

-- 7.3 Auto-log journal entries
CREATE OR REPLACE FUNCTION public.log_journal_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.log_operation(
    NEW.restaurant_id,
    CASE 
      WHEN NEW.is_posted THEN 'journal_entry_posted'
      ELSE 'journal_entry_created'
    END,
    'journal_entry',
    NEW.id,
    jsonb_build_object(
      'entry_number', NEW.entry_number,
      'source', NEW.source,
      'reference_type', NEW.reference_type,
      'reference_id', NEW.reference_id,
      'is_posted', NEW.is_posted
    ),
    NEW.total_debit,
    NULL,
    to_jsonb(NEW)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_journal_entry ON public.journal_entries;
CREATE TRIGGER trg_log_journal_entry
  AFTER INSERT ON public.journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.log_journal_entry();

-- 8. Views for common audit queries

-- 8.1 Daily operations summary
CREATE OR REPLACE VIEW public.v_daily_audit_summary AS
SELECT 
  restaurant_id,
  DATE(created_at) as operation_date,
  operation_type,
  entity_type,
  COUNT(*) as operation_count,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count,
  SUM(amount) as total_amount
FROM public.operation_audit_log
GROUP BY restaurant_id, DATE(created_at), operation_type, entity_type;

-- 8.2 Recent important operations
CREATE OR REPLACE VIEW public.v_recent_important_operations AS
SELECT 
  oal.*,
  r.name as restaurant_name
FROM public.operation_audit_log oal
JOIN public.restaurants r ON r.id = oal.restaurant_id
WHERE oal.operation_type IN ('order_created', 'order_cancelled', 'journal_entry_posted', 'payment_received')
ORDER BY oal.created_at DESC
LIMIT 100;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Audit Log System Installed Successfully!';
  RAISE NOTICE '✅ Tables: operation_audit_log';
  RAISE NOTICE '✅ Triggers: trg_log_order_creation, trg_log_order_status_change, trg_log_journal_entry';
  RAISE NOTICE '✅ Views: v_daily_audit_summary, v_recent_important_operations';
END $$;
