-- ============================================================
-- CREATE DEFAULT WORKFLOW STAGES FUNCTION
-- ============================================================
-- This function creates default workflow stages for a restaurant
-- ============================================================

BEGIN;

-- Function to create default workflow stages for a restaurant
CREATE OR REPLACE FUNCTION create_default_workflow_stages(p_restaurant_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Check if stages already exist for this restaurant
  IF EXISTS (
    SELECT 1 FROM marketing_workflow_stages 
    WHERE restaurant_id = p_restaurant_id
  ) THEN
    RAISE NOTICE 'Workflow stages already exist for restaurant %', p_restaurant_id;
    RETURN;
  END IF;

  -- Insert default stages
  INSERT INTO marketing_workflow_stages (restaurant_id, stage_key, stage_name_ar, stage_name_en, description, order_index, default_duration_hours, requires_approval) VALUES
    (p_restaurant_id, 'briefing', 'استلام الطلب', 'Briefing', 'استلام متطلبات العميل وتحديد نطاق المشروع', 1, 24, true),
    (p_restaurant_id, 'strategy', 'الاستراتيجية', 'Strategy', 'وضع الاستراتيجية التسويقية وخطة العمل', 2, 48, true),
    (p_restaurant_id, 'creative', 'الإبداع والتصميم', 'Creative', 'مرحلة الإبداع والتصميم والإنتاج', 3, 72, true),
    (p_restaurant_id, 'review', 'المراجعة', 'Review', 'مراجعة العميل والتعديلات', 4, 24, true),
    (p_restaurant_id, 'delivery', 'التسليم', 'Delivery', 'التسليم النهائي للمشروع', 5, 8, false),
    (p_restaurant_id, 'followup', 'المتابعة', 'Follow-up', 'متابعة ما بعد التسليم', 6, 24, false);
  
  RAISE NOTICE 'Created default workflow stages for restaurant %', p_restaurant_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically create default stages when a new restaurant is created
-- Note: This assumes there's a restaurants table. Adjust as needed.
CREATE OR REPLACE FUNCTION on_restaurant_created()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_default_workflow_stages(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_create_default_workflow_stages ON restaurants;

-- Create trigger
CREATE TRIGGER trigger_create_default_workflow_stages
  AFTER INSERT ON restaurants
  FOR EACH ROW
  EXECUTE FUNCTION on_restaurant_created();

COMMIT;

-- Example usage for existing restaurants:
-- SELECT create_default_workflow_stages('your-restaurant-id-here');
