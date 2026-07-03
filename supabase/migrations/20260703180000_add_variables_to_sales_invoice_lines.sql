-- Add variables column to sales_invoice_lines table
BEGIN;

-- Add variables column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales_invoice_lines'
    AND column_name = 'variables'
  ) THEN
    ALTER TABLE public.sales_invoice_lines
    ADD COLUMN variables JSONB DEFAULT NULL;
  END IF;
END $$;

COMMIT;
