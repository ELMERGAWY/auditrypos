import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const publish = readFileSync(
  resolve(process.cwd(), 'supabase/functions/social-publish/index.ts'),
  'utf8',
);
const oauth = readFileSync(
  resolve(process.cwd(), 'supabase/functions/social-oauth/index.ts'),
  'utf8',
);
const crm = readFileSync(
  resolve(process.cwd(), 'src/pages/dashboard/AuditryCRM.tsx'),
  'utf8',
);

describe('Meta CRM reply contract', () => {
  it('sends comment and Messenger replies through the existing publishing function', () => {
    expect(publish).toContain("if (action === 'reply_message')");
    expect(publish).toContain(".from('crm_social_messages')");
    expect(publish).toContain("/${encodeURIComponent(account.account_id)}/messages");
    expect(publish).toContain("message_type === 'message'");
    expect(publish).toContain('messaging_type: \'RESPONSE\'');
    expect(publish).toContain('graphPost(`/${encodeURIComponent(message.external_message_id)}`');
  });

  it('keeps tenant, permission, target, and timing guards before sending', () => {
    expect(publish).toContain("await assertPermission(admin, restaurantId, user.id, 'marketing.content.publish')");
    expect(publish).toContain(".eq('restaurant_id', restaurantId)");
    expect(publish).toContain('Messenger replies are allowed only within Meta');
    expect(publish).toContain('Active Facebook Page connection not found');
  });

  it('records CRM communication only after the provider call succeeds', () => {
    expect(crm).toContain("body: { action: 'reply_message', restaurantId, messageId: selectedMessage.id, text }");
    expect(crm).toContain("if (error || !data?.success) throw new Error");
    expect(crm).toContain('await handleAddCommunicationLog({');
    expect(crm).toContain('تم إرسال الرد وتسجيله في CRM');
  });

  it('requests the current Page engagement permissions for future OAuth connections', () => {
    expect(oauth).toContain("'pages_manage_engagement'");
    expect(oauth).toContain("'pages_read_user_engagement'");
  });
});
