import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://nmkjyweoagbblkbqavdz.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ta2p5d2VvYWdiYmxrYnFhdmR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4OTg1ODgsImV4cCI6MjA4NjQ3NDU4OH0.SczpzYSAaY22GcX1zeKGdDz6OaY4sDCoI4Zu_sIPi0A";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function run() {
  const { data, error } = await supabase
    .from('warehouses')
    .select('id, code, name, name_ar, type, restaurant_id');

  if (error) {
    console.error("Error:", error.message);
  } else {
    console.log("Warehouses list:");
    data.forEach(w => {
      console.log(`Warehouse id: ${w.id}, code: ${w.code}, name: ${w.name}, name_ar: ${w.name_ar}, type: ${w.type}, restaurant_id: ${w.restaurant_id}`);
    });
  }
}

run();
