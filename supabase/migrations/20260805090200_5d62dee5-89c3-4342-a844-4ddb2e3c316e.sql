DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT o.* FROM public.orders o
    WHERE o.status <> 'cancelled'
      AND COALESCE(o.total,0) > 0
      AND NOT EXISTS (
        SELECT 1 FROM public.journal_entries j
        WHERE j.restaurant_id=o.restaurant_id
          AND j.reference_type='order'
          AND j.reference_id=o.id
      )
  LOOP
    PERFORM public.fn_upsert_doc_journal(
      r.restaurant_id,'order',r.id,COALESCE(r.created_at::date,CURRENT_DATE),
      'إعادة ترحيل آلي - طلب رقم '||r.order_number,'sales',
      jsonb_build_array(
        jsonb_build_object('account_id',public.get_accounts_receivable(r.restaurant_id),'debit',r.total,'credit',0,'description','طلب آجل '||r.order_number),
        jsonb_build_object('account_id',public.get_sales_account(r.restaurant_id),'debit',0,'credit',r.total,'description','مبيعات طلب '||r.order_number)
      )
    );
  END LOOP;
END $$;