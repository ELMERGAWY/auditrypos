import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const dashboard = readFileSync(
  resolve(process.cwd(), 'src/pages/dashboard/SocialMediaDashboard.tsx'),
  'utf8',
);
const workerWorkflow = readFileSync(
  resolve(process.cwd(), '.github/workflows/social-publish-worker.yml'),
  'utf8',
);

describe('marketing publishing UI contract', () => {
  it('supports editing draft/rejected posts through the existing modal', () => {
    expect(dashboard).toContain('editingPostId');
    expect(dashboard).toContain('openPostEditor(post)');
    expect(dashboard).toContain(".eq('restaurant_id', restaurantId)");
    expect(dashboard).toContain('حفظ المسودة');
  });

  it('does not fabricate a percentage beside follower metrics', () => {
    expect(dashboard).not.toContain('+5.2%');
    expect(dashboard).toContain('آخر قراءة متاحة');
    expect(dashboard).toContain('لا توجد بيانات تحليلات متزامنة بعد');
  });

  it('rejects past scheduled times before creating a draft', () => {
    expect(dashboard).toContain('يجب أن يكون موعد الجدولة في المستقبل');
    expect(dashboard).toContain('scheduledDateTime.getTime() <= Date.now()');
  });

  it('runs the existing publishing worker on a bounded schedule with a production guard', () => {
    expect(workerWorkflow).toContain("cron: '*/10 * * * *'");
    expect(workerWorkflow).toContain('SOCIAL_PUBLISH_WORKER_SECRET');
    expect(workerWorkflow).toContain('PUBLISH_LIMIT < 1 || PUBLISH_LIMIT > 100');
    expect(workerWorkflow).toContain('social-publish-worker');
    expect(workerWorkflow).toContain('publishing queue skipped safely');
  });
});
