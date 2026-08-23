import { createClient } from 'npm:@supabase/supabase-js@2';

type OutboxRow = {
  id: string;
  integration_id: string;
  restaurant_id: string;
  workspace_id: string | null;
  entity_type: string;
  operation: string;
  payload: Record<string, unknown>;
  attempts: number;
};

type Integration = {
  id: string;
  restaurant_id: string;
  workspace_id: string | null;
  api_base_url: string;
  token_secret_ref: string;
  enabled: boolean;
  sync_mode: 'disabled' | 'dry_run' | 'outbox' | 'live';
};

const corsHeaders = {
  'content-type': 'application/json',
  'cache-control': 'no-store',
  'access-control-allow-origin': 'https://supabase.com',
  'access-control-allow-headers': 'content-type, x-manager-sync-secret',
  'access-control-allow-methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: corsHeaders,
});

function getWorkerSecret(req: Request) {
  return req.headers.get('x-manager-sync-secret') || '';
}

function validateBaseUrl(value: string) {
  const url = new URL(value);
  const allowed = url.protocol === 'https:' && (
    url.hostname === 'auditry.manager.io' ||
    url.hostname.endsWith('.manager.cloud')
  );
  if (!allowed || !url.pathname.endsWith('/api2')) throw new Error('unsupported Manager API2 base URL');
  return value.replace(/\/$/, '');
}

const managerPathByEntity: Record<string, string> = {
  customer: '/customer-form',
  supplier: '/supplier-form',
  inventory_item: '/inventory-item-form',
  sales_invoice: '/sales-invoice-form',
  purchase_invoice: '/purchase-invoice-form',
  receipt: '/receipt-form',
  payment: '/payment-form',
  journal_entry: '/journal-entry-form',
  inventory_transfer: '/inventory-transfer-form',
  goods_receipt: '/goods-receipt-form',
  bank_account: '/bank-or-cash-account-form',
  division: '/division-form',
  tax_code: '/tax-code-form',
  account: '/account-form',
};

function validateManagerEntityPath(entityType: string, operation: string, value: string) {
  const expected = managerPathByEntity[entityType];
  if (!expected || !value.startsWith('/')) throw new Error('unsupported Manager entity path');
  const pathname = value.split('?')[0];
  const isCollection = pathname === expected;
  const isItem = pathname.startsWith(`${expected}/`) && /^[A-Za-z0-9_-]+$/.test(pathname.slice(expected.length + 1));
  if (!isCollection && !isItem) throw new Error('Manager path does not match entity type');
  if (operation === 'delete' || operation === 'update') {
    if (!isItem) throw new Error('Manager update/delete requires a mapped key');
  } else if (operation === 'upsert' && !isCollection && !isItem) {
    throw new Error('invalid Manager upsert path');
  }
  return pathname;
}

async function managerRequest(baseUrl: string, token: string, path: string, init: RequestInit = {}) {
  if (!path.startsWith('/') || path.includes('://') || path.includes('..')) throw new Error('invalid Manager API2 path');
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'X-API-KEY': token,
      'Accept': 'application/json',
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  let body: unknown = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text.slice(0, 1000) }; }
  return { status: response.status, ok: response.ok, body };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  const expected = Deno.env.get('MANAGER_SYNC_WORKER_SECRET');
  if (!expected || getWorkerSecret(req) !== expected) return json({ error: 'unauthorized' }, 401);
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const managerTokenFallback = Deno.env.get('MANAGER_API_TOKEN') || '';
  if (!supabaseUrl || !serviceKey) return json({ error: 'server_configuration_missing' }, 500);

  const resolveManagerToken = (integration: Integration) => {
    // Never allow a database value to read arbitrary environment variables.
    // The migration constrains token_secret_ref to MANAGER_API_TOKEN[_SUFFIX].
    if (!/^MANAGER_API_TOKEN(?:_[A-Z0-9_]+)?$/.test(integration.token_secret_ref)) {
      throw new Error('unsupported Manager token reference');
    }
    return Deno.env.get(integration.token_secret_ref) || (
      integration.token_secret_ref === 'MANAGER_API_TOKEN' ? managerTokenFallback : ''
    );
  };

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const url = new URL(req.url);
  const mode = url.searchParams.get('mode') || 'process';
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 25), 1), 100);

  if (mode === 'health') {
    const { data: integrations, error } = await admin.from('manager_integrations')
      .select('id,restaurant_id,workspace_id,api_base_url,token_secret_ref,enabled,sync_mode')
      .eq('enabled', true).neq('sync_mode', 'disabled').limit(20);
    if (error) return json({ error: 'integration_lookup_failed' }, 500);
    const results = [];
    for (const integration of (integrations || []) as Integration[]) {
      try {
        const baseUrl = validateBaseUrl(integration.api_base_url);
        const managerToken = resolveManagerToken(integration);
        if (!managerToken) throw new Error('manager token missing for integration');
        const result = await managerRequest(baseUrl, managerToken, '/customers?pageSize=1');
        await admin.from('manager_integrations').update({
          last_health_check_at: new Date().toISOString(),
          last_health_status: result.ok ? 'ok' : 'failed',
          last_health_error: result.ok ? null : `HTTP ${result.status}`,
        }).eq('id', integration.id);
        results.push({ integration_id: integration.id, status: result.status, ok: result.ok });
      } catch (error) {
        await admin.from('manager_integrations').update({
          last_health_check_at: new Date().toISOString(), last_health_status: 'failed',
          last_health_error: error instanceof Error ? error.message : 'health check failed',
        }).eq('id', integration.id);
        results.push({ integration_id: integration.id, ok: false });
      }
    }
    return json({ mode, checked: results.length, results });
  }

  const { data: rows, error: claimError } = await admin.rpc('claim_manager_sync_outbox', { p_limit: limit });
  if (claimError) return json({ error: 'outbox_claim_failed' }, 500);

  const summary = { claimed: (rows || []).length, posted: 0, failed: 0, dry_run: 0 };
  for (const row of (rows || []) as OutboxRow[]) {
    try {
      let integrationQuery = admin.from('manager_integrations')
        .select('id,restaurant_id,workspace_id,api_base_url,token_secret_ref,enabled,sync_mode')
        .eq('id', row.integration_id)
        .eq('restaurant_id', row.restaurant_id);
      integrationQuery = row.workspace_id === null
        ? integrationQuery.is('workspace_id', null)
        : integrationQuery.eq('workspace_id', row.workspace_id);
      const { data: integration, error: integrationError } = await integrationQuery.single();
      if (integrationError || !integration) throw new Error('integration_not_found');
      const settings = integration as Integration;
      if (!settings.enabled || settings.sync_mode === 'disabled') throw new Error('integration_disabled');
      if (settings.sync_mode === 'dry_run') {
        await admin.from('manager_sync_outbox').update({ status: 'posted', response_status: 0, response_body: { dry_run: true }, updated_at: new Date().toISOString() }).eq('id', row.id);
        summary.dry_run += 1;
        continue;
      }
      const baseUrl = validateBaseUrl(settings.api_base_url);
      const managerToken = resolveManagerToken(settings);
      if (!managerToken) throw new Error('manager token missing for integration');
      const payload = row.payload || {};
      const managerPath = typeof payload.manager_path === 'string' ? payload.manager_path : '';
      validateManagerEntityPath(row.entity_type, row.operation, managerPath);
      const payloadMethod = typeof payload.method === 'string' ? payload.method.toUpperCase() : '';
      const method = payloadMethod || (row.operation === 'delete' ? 'DELETE' : managerPath.split('?')[0] === managerPathByEntity[row.entity_type] ? 'POST' : 'PUT');
      if (!['POST', 'PUT', 'DELETE'].includes(method)) throw new Error('unsupported Manager HTTP method');
      if (method === 'POST' && managerPath.split('?')[0] !== managerPathByEntity[row.entity_type]) throw new Error('POST requires a collection path');
      if ((method === 'PUT' || method === 'DELETE') && managerPath.split('?')[0] === managerPathByEntity[row.entity_type]) throw new Error('mapped operation requires an item path');
      const body = payload.body && typeof payload.body === 'object' ? JSON.stringify(payload.body) : undefined;
      const result = await managerRequest(baseUrl, managerToken, managerPath, { method, body, headers: body ? { 'Content-Type': 'application/json' } : {} });
      if (!result.ok) throw new Error(`Manager API2 HTTP ${result.status}`);
      const managerKey = (result.body && typeof result.body === 'object' && 'key' in result.body) ? String((result.body as {key: unknown}).key) : (typeof payload.manager_key === 'string' ? payload.manager_key : null);
      const posted = await admin.from('manager_sync_outbox').update({ status: 'posted', manager_key: managerKey, response_status: result.status, response_body: result.body, last_error: null, updated_at: new Date().toISOString() }).eq('id', row.id);
      if (posted.error) throw new Error('outbox_post_update_failed');
      if (managerKey && row.source_id && [
        'customer', 'supplier', 'inventory_item', 'sales_invoice', 'purchase_invoice',
        'receipt', 'payment', 'journal_entry', 'goods_receipt', 'inventory_transfer',
      ].includes(row.entity_type)) {
        const mapping = await admin.from('manager_entity_mappings').upsert({
          integration_id: row.integration_id,
          restaurant_id: row.restaurant_id,
          workspace_id: row.workspace_id,
          entity_type: row.entity_type,
          local_table: row.source_table || ({
            inventory_item: 'products',
            journal_entry: 'journal_entries',
            goods_receipt: 'inventory_receipts',
            inventory_transfer: 'inventory_transfers',
            payment: 'payments',
            receipt: 'payments',
          }[row.entity_type] || `${row.entity_type}s`),
          local_id: row.source_id,
          manager_key: managerKey,
          manager_name: typeof payload.manager_name === 'string' ? payload.manager_name : null,
          sync_status: row.operation === 'delete' ? 'ignored' : 'synced',
          source_hash: typeof payload.source_hash === 'string' ? payload.source_hash : null,
          last_synced_at: new Date().toISOString(),
          last_error: null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'integration_id,entity_type,local_id' });
        if (mapping.error) throw new Error('mapping_update_failed');
      }
      summary.posted += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Manager sync failed';
      const retryAt = new Date(Date.now() + Math.min(60 * 60 * 1000, 2 ** Math.min(row.attempts, 10) * 1000)).toISOString();
      await admin.from('manager_sync_outbox').update({ status: row.attempts >= 8 ? 'failed' : 'pending', available_at: retryAt, last_error: message, updated_at: new Date().toISOString() }).eq('id', row.id);
      summary.failed += 1;
    }
  }
  return json({ mode, ...summary });
});
