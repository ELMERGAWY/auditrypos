-- Fix the audit log trigger so it bypasses RLS on audit_log table.
-- By setting SECURITY DEFINER, the trigger function runs as the owner (superuser),
-- allowing it to insert into the audit_log table even though RLS blocks the
-- authenticated users from inserting directly.

BEGIN;

CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (restaurant_id, table_name, record_id, action, old_data, changed_by)
    VALUES (OLD.restaurant_id, TG_TABLE_NAME, OLD.id, 'DELETE', row_to_json(OLD), auth.uid());
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (restaurant_id, table_name, record_id, action, old_data, new_data, changed_by)
    VALUES (NEW.restaurant_id, TG_TABLE_NAME, NEW.id, 'UPDATE', row_to_json(OLD), row_to_json(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (restaurant_id, table_name, record_id, action, new_data, changed_by)
    VALUES (NEW.restaurant_id, TG_TABLE_NAME, NEW.id, 'INSERT', row_to_json(NEW), auth.uid());
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

COMMIT;
