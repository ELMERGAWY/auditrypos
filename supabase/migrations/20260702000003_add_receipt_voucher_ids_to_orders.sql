-- Add receipt_voucher_ids column to orders for simple voucher tracking
BEGIN;

-- Step 1: Add receipt_voucher_ids column to orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' 
    AND column_name = 'receipt_voucher_ids'
  ) THEN
    ALTER TABLE public.orders 
    ADD COLUMN receipt_voucher_ids UUID[] DEFAULT NULL;
  END IF;
END $$;

-- Step 2: Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_orders_receipt_voucher_ids ON public.orders USING GIN(receipt_voucher_ids);

COMMIT;

-- Log the changes
DO $$
BEGIN
  RAISE NOTICE '✅ Added receipt_voucher_ids column to orders';
  RAISE NOTICE '✅ Created GIN index for efficient array queries';
END $$;
