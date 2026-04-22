/**
 * Generate Supabase TypeScript Types
 * Run: node scripts/generate-types.js
 */

const { execSync } = require('child_process');

const projectId = process.env.SUPABASE_PROJECT_ID || 'your-project-id';

console.log('🔄 Generating Supabase TypeScript types...');

try {
  execSync(
    `npx supabase gen types typescript --project-id ${projectId} > src/integrations/supabase/types.ts`,
    { stdio: 'inherit', cwd: process.cwd() }
  );
  console.log('✅ Types generated successfully!');
} catch (error) {
  console.error('❌ Failed to generate types:', error.message);
  process.exit(1);
}
