/**
 * Generate Supabase TypeScript Types
 * Run: node scripts/generate-types.js
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 🔧 معرف مشروع Supabase و Access Token (من .env)
const projectId = process.env.SUPABASE_PROJECT_ID || 'nmkjyweoagbblkbqavdz';
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

console.log('🔄 Generating Supabase TypeScript types...');
console.log(`📁 Output: ${join(__dirname, '../src/integrations/supabase/types.ts')}`);

// التحقق من وجود Access Token
if (!accessToken) {
  console.error('❌ SUPABASE_ACCESS_TOKEN not found!');
  console.log('\n📋 Steps to fix:');
  console.log('1. Go to https://app.supabase.com/account/tokens');
  console.log('2. Click "Generate New Token"');
  console.log('3. Copy the token (starts with sbp_)');
  console.log('4. Add to .env file: SUPABASE_ACCESS_TOKEN=sbp_xxxx');
  console.log('\n📝 Or run: npx supabase login');
  process.exit(1);
}

try {
  execSync(
    `npx -y supabase@latest gen types typescript --project-id ${projectId} > src/integrations/supabase/types.ts`,
    { 
      stdio: 'inherit', 
      cwd: join(__dirname, '..'),
      env: { ...process.env, SUPABASE_ACCESS_TOKEN: accessToken }
    }
  );
  console.log('✅ Types generated successfully!');
} catch (error) {
  console.error('❌ Failed to generate types:', error.message);
  process.exit(1);
}
