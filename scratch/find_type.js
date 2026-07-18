import fs from 'fs';

function searchInFile(filepath, query) {
  const content = fs.readFileSync(filepath, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.toLowerCase().includes(query.toLowerCase())) {
      console.log(`${filepath}:${idx + 1}: ${line.trim()}`);
    }
  });
}

console.log("Searching in InventoryTab.tsx:");
searchInFile('src/pages/dashboard/InventoryTab.tsx', 'warehouse');
searchInFile('src/pages/dashboard/InventoryTab.tsx', 'type');

console.log("\nSearching in POSGrid.tsx:");
searchInFile('src/pages/dashboard/pos/POSGrid.tsx', 'warehouse');
searchInFile('src/pages/dashboard/pos/POSGrid.tsx', 'type');
