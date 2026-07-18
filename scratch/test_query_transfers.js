import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://nmkjyweoagbblkbqavdz.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ta2p5d2VvYWdiYmxrYnFhdmR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4OTg1ODgsImV4cCI6MjA4NjQ3NDU4OH0.SczpzYSAaY22GcX1zeKGdDz6OaY4sDCoI4Zu_sIPi0A";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function run() {
  console.log("Fetching simple transfers:");
  const { data: transfers, error: e1 } = await supabase
    .from('inventory_transfers')
    .select('*')
    .limit(5);

  if (e1) {
    console.error("Transfers error:", e1.message);
  } else {
    console.log("Transfers:", transfers);
  }

  console.log("\nFetching simple transfer items:");
  const { data: items, error: e2 } = await supabase
    .from('inventory_transfer_items')
    .select('*')
    .limit(5);

  if (e2) {
    console.error("Items error:", e2.message);
  } else {
    console.log("Items:", items);
  }
}

run();
