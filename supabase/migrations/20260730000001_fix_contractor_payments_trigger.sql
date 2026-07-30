-- Fix contractor_payments trigger to handle missing status field
-- contractor_payments table doesn't have a status field, but the trigger function checks for it

BEGIN;

-- Drop the existing trigger
DROP TRIGGER IF EXISTS contractor_payments_balance_trigger ON public.contractor_payments;

-- Create a separate function for contractor_payments that doesn't check status
CREATE OR REPLACE FUNCTION public.update_contractor_balance_from_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.contractors
    SET balance = get_contractor_balance(NEW.contractor_id),
        updated_at = NOW()
    WHERE id = NEW.contractor_id;
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

-- Recreate the trigger with the new function
CREATE TRIGGER contractor_payments_balance_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.contractor_payments
FOR EACH ROW EXECUTE FUNCTION public.update_contractor_balance_from_payment();

COMMIT;
