DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.restaurants LOOP
    PERFORM public._get_or_create_account(r.id,'1200','العملاء','asset','current_asset','accounts_receivable','debit',false,false);
    PERFORM public._get_or_create_account(r.id,'1300','المخزون','asset','current_asset','inventory','debit',false,false);
    PERFORM public._get_or_create_account(r.id,'2100','الموردون','liability','current_liability','accounts_payable','credit',false,false);
    PERFORM public._get_or_create_account(r.id,'2150','ضريبة القيمة المضافة المستحقة','liability','current_liability','tax_payable','credit',false,false);
    PERFORM public._get_or_create_account(r.id,'4100','إيرادات المبيعات','revenue','operating_revenue','sales','credit',false,false);
    PERFORM public._get_or_create_account(r.id,'4200','إيرادات الخدمات','revenue','operating_revenue','service_revenue','credit',false,false);
    PERFORM public._get_or_create_account(r.id,'5100','تكلفة المبيعات','expense','cost_of_sales','cogs','debit',false,false);
    PERFORM public._get_or_create_account(r.id,'5200','هالك وتسويات المخزون','expense','cost_of_sales','inventory_loss','debit',false,false);
  END LOOP;

  FOR r IN
    SELECT o.* FROM public.orders o
    WHERE o.status <> 'cancelled' AND COALESCE(o.total,0)>0
      AND NOT EXISTS (SELECT 1 FROM public.journal_entries j WHERE j.restaurant_id=o.restaurant_id AND j.reference_type='order' AND j.reference_id=o.id)
  LOOP
    UPDATE public.orders SET total=total WHERE id=r.id;
  END LOOP;
END $$;