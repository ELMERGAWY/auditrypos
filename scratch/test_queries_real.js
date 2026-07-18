import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://nmkjyweoagbblkbqavdz.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ta2p5d2VvYWdiYmxrYnFhdmR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4OTg1ODgsImV4cCI6MjA4NjQ3NDU4OH0.SczpzYSAaY22GcX1zeKGdDz6OaY4sDCoI4Zu_sIPi0A";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// Since we don't have a logged-in user in node script, we can't test RLS, but we can check schema or query syntax!
async function run() {
  const dummyRestaurantId = "302e1c31-9a7c-4876-8041-cb6c18f8e02d"; // we can try a query with a dummy UUID

  console.log("1. Testing marketing_service_deliverables query...");
  const r1 = await supabase
    .from('marketing_service_deliverables')
    .select('*')
    .limit(1);
  console.log("marketing:", r1.error ? r1.error.message : "OK");

  console.log("\n2. Testing orders select query with new columns...");
  const r2 = await supabase
    .from('orders')
    .select('id, order_number, customer_name, customer_phone, notes, delivery_date, delivery_status, actual_delivery_date, delivery_received_by, delivery_receipt_note, created_at, status, order_items(id, menu_item_name, quantity, sold_unit, variables, is_delivered)')
    .limit(1);
  console.log("orders main query:", r2.error ? r2.error.message : "OK");

  console.log("\n3. Testing orders fallback query...");
  const r3 = await supabase
    .from('orders')
    .select('id, order_number, customer_name, customer_phone, notes, delivery_date, delivery_status, created_at, status, order_items(id, menu_item_name, quantity, sold_unit, variables)')
    .limit(1);
  console.log("orders fallback query:", r3.error ? r3.error.message : "OK");

  console.log("\n4. Testing delivery_contact_logs query...");
  const r4 = await supabase
    .from('delivery_contact_logs')
    .select('*')
    .limit(1);
  console.log("delivery_contact_logs:", r4.error ? r4.error.message : "OK");

  console.log("\n5. Testing warehouses .or query...");
  const r5 = await supabase
    .from('warehouses')
    .select('id,name_ar,name')
    .or(`restaurant_id.eq.${dummyRestaurantId},restaurant_id.is.null`)
    .limit(1);
  console.log("warehouses or query:", r5.error ? r5.error.message : "OK");
}

run();
