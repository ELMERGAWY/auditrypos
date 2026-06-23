
import { queueTransaction, syncPendingData } from './src/lib/offlineEngine';

async function testSync() {
  console.log("Starting Offline Sync Test...");
  
  const testTx = {
    id: "test-" + Date.now(),
    type: "expense" as const,
    payload: {
      amount: 100,
      description: "Test Offline Expense",
      category: "utilities",
      payment_method: "cash",
      restaurant_id: "your-restaurant-id-here" // Replace with real ID during manual test
    },
    timestamp: Date.now()
  };

  await queueTransaction(testTx);
  console.log("Transaction queued locally.");

  const results = await syncPendingData();
  console.log("Sync Results:", results);
}

// In a real environment, you'd call this from a browser console or a test suite.
// testSync();
