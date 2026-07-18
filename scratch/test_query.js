import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://nmkjyweoagbblkbqavdz.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ta2p5d2VvYWdiYmxrYnFhdmR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4OTg1ODgsImV4cCI6MjA4NjQ3NDU4OH0.SczpzYSAaY22GcX1zeKGdDz6OaY4sDCoI4Zu_sIPi0A";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function run() {
  console.log("1. Testing query with .or filter syntax...");
  const dummyId = "d3b07384-d113-4a6c-9457-414841961e60";
  const { data, error } = await supabase
    .from('warehouses')
    .select('id,name_ar,name')
    .or(`restaurant_id.eq.${dummyId},restaurant_id.is.null`);

  if (error) {
    console.error("FAIL: query failed with error:", error);
  } else {
    console.log("SUCCESS: query succeeded with data:", data);
  }

  console.log("\n2. Testing basic select query...");
  const { data: data2, error: error2 } = await supabase
    .from('warehouses')
    .select('id,name_ar,name')
    .limit(5);

  if (error2) {
    console.error("FAIL: basic query failed with error:", error2);
  } else {
    console.log("SUCCESS: basic query succeeded with data:", data2);
  }
}

run();
