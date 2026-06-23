-- ============================================================
-- ADD CONTRACTORS/WORKERS SYSTEM FOR SERVICE BUSINESSES
-- ============================================================

BEGIN;

-- 1. Create contractors table (الصنايعية)
CREATE TABLE IF NOT EXISTS public.contractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  specialty TEXT, -- التخصص (مثال: سباك، كهربائي، نجار)
  payment_type TEXT NOT NULL DEFAULT 'fixed', -- 'fixed' (مبلغ مقطوع) or 'percentage' (نسبة)
  payment_value DECIMAL(10,2) NOT NULL DEFAULT 0, -- المبلغ المقطوع أو النسبة
  balance DECIMAL(10,2) DEFAULT 0, -- الرصيد المستحق
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create contractor_services table (الخدمات المنفذة للصنايعية)
CREATE TABLE IF NOT EXISTS public.contractor_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES public.sales_invoices(id) ON DELETE SET NULL,
  service_name TEXT NOT NULL,
  service_amount DECIMAL(10,2) NOT NULL, -- قيمة الخدمة الأصلية
  contractor_amount DECIMAL(10,2) NOT NULL, -- المستحق للصنايعي
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'approved', 'paid'
  completion_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create contractor_payments table (مدفوعات الصنايعية)
CREATE TABLE IF NOT EXISTS public.contractor_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_date TIMESTAMPTZ DEFAULT NOW(),
  payment_method TEXT, -- 'cash', 'bank_transfer', 'check'
  reference TEXT, -- رقم الإيصال
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable RLS
ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_payments ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for contractors
CREATE POLICY "Restaurant manages contractors" ON public.contractors
  FOR ALL TO authenticated
  USING (is_restaurant_owner(auth.uid(), restaurant_id) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (is_restaurant_owner(auth.uid(), restaurant_id) OR has_role(auth.uid(), 'super_admin'::app_role));

-- 6. Create RLS policies for contractor_services
CREATE POLICY "Restaurant manages contractor services" ON public.contractor_services
  FOR ALL TO authenticated
  USING (is_restaurant_owner(auth.uid(), restaurant_id) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (is_restaurant_owner(auth.uid(), restaurant_id) OR has_role(auth.uid(), 'super_admin'::app_role));

-- 7. Create RLS policies for contractor_payments
CREATE POLICY "Restaurant manages contractor payments" ON public.contractor_payments
  FOR ALL TO authenticated
  USING (is_restaurant_owner(auth.uid(), restaurant_id) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (is_restaurant_owner(auth.uid(), restaurant_id) OR has_role(auth.uid(), 'super_admin'::app_role));

-- 8. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contractors_restaurant_id ON public.contractors(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_contractor_services_restaurant_id ON public.contractor_services(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_contractor_services_contractor_id ON public.contractor_services(contractor_id);
CREATE INDEX IF NOT EXISTS idx_contractor_services_status ON public.contractor_services(status);
CREATE INDEX IF NOT EXISTS idx_contractor_payments_restaurant_id ON public.contractor_payments(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_contractor_payments_contractor_id ON public.contractor_payments(contractor_id);

-- 9. Create function to calculate contractor payment
CREATE OR REPLACE FUNCTION public.calculate_contractor_payment(
  p_service_amount DECIMAL,
  p_payment_type TEXT,
  p_payment_value DECIMAL
) RETURNS DECIMAL AS $$
BEGIN
  IF p_payment_type = 'fixed' THEN
    RETURN p_payment_value;
  ELSIF p_payment_type = 'percentage' THEN
    RETURN (p_service_amount * p_payment_value / 100);
  ELSE
    RETURN 0;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 10. Create function to get contractor balance
CREATE OR REPLACE FUNCTION public.get_contractor_balance(p_contractor_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  v_balance DECIMAL;
BEGIN
  SELECT COALESCE(SUM(contractor_amount), 0) INTO v_balance
  FROM public.contractor_services
  WHERE contractor_id = p_contractor_id
  AND status IN ('completed', 'approved', 'paid');

  RETURN v_balance - COALESCE((SELECT COALESCE(SUM(amount), 0) FROM public.contractor_payments WHERE contractor_id = p_contractor_id), 0);
END;
$$ LANGUAGE plpgsql;

-- 11. Create trigger to update contractor balance
CREATE OR REPLACE FUNCTION public.update_contractor_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.status IN ('completed', 'approved', 'paid') THEN
      UPDATE public.contractors
      SET balance = get_contractor_balance(NEW.contractor_id),
          updated_at = NOW()
      WHERE id = NEW.contractor_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.contractors
    SET balance = get_contractor_balance(OLD.contractor_id),
        updated_at = NOW()
    WHERE id = OLD.contractor_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 12. Create trigger for contractor_services
CREATE TRIGGER contractor_services_balance_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.contractor_services
  FOR EACH ROW EXECUTE FUNCTION public.update_contractor_balance();

-- 13. Create trigger for contractor_payments
CREATE TRIGGER contractor_payments_balance_trigger
  AFTER INSERT ON public.contractor_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_contractor_balance();

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '✅ Contractors system added:';
  RAISE NOTICE '✅ - contractors table created';
  RAISE NOTICE '✅ - contractor_services table created';
  RAISE NOTICE '✅ - contractor_payments table created';
  RAISE NOTICE '✅ - RLS policies created';
  RAISE NOTICE '✅ - Indexes created';
  RAISE NOTICE '✅ - Helper functions created';
  RAISE NOTICE '✅ - Balance update triggers created';
END
$$;
