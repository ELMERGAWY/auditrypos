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
  api_base_url: string;
  token_secret_ref: string;
  enabled: boolean;
  sync_mode: 'disabled' | 'dry_run' | 'outbox' | 'live';
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
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
  const expected = Deno.env.get('MANAGER_SYNC_WORKER_SECRET');
  if (!expected || getWorkerSecret(req) !== expected) return json({ error: 'unauthorized' }, 401);
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const managerToken = Deno.env.get('MANAGER_API_TOKEN');
  if (!supabaseUrl || !serviceKey || !managerToken) return json({ error: 'server_configuration_missing' }, 500);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const url = new URL(req.url);
  const mode = url.searchParams.get('mode') || 'process';
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 25), 1), 100);

  if (mode === 'health') {
    const { data: integrations, error } = await admin.from('manager_integrations')
      .select('id,api_base_url,token_secret_ref,enabled,sync_mode').eq('enabled', true).limit(20);
    if (error) return json({ error: 'integration_lookup_failed' }, 500);
    const results = [];
    for (const integration of (integrations || []) as Integration[]) {
      try {
        const baseUrl = validateBaseUrl(integration.api_base_url);
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
      const { data: integration, error: integrationError } = await admin.from('manager_integrations')
        .select('id,api_base_url,token_secret_ref,enabled,sync_mode').eq('id', row.integration_id).single();
      if (integrationError || !integration) throw new Error('integration_not_found');
      const settings = integration as Integration;
      if (!settings.enabled || settings.sync_mode === 'disabled') throw new Error('integration_disabled');
      if (settings.sync_mode === 'dry_run') {
        await admin.from('manager_sync_outbox').update({ status: 'posted', response_status: 0, response_body: { dry_run: true }, updated_at: new Date().toISOString() }).eq('id', row.id);
        summary.dry_run += 1;
        continue;
      }
      const baseUrl = validateBaseUrl(settings.api_base_url);
      const payload = row.payload || {};
      const managerPath = typeof payload.manager_path === 'string' ? payload.manager_path : '';
      const method = row.operation === 'delete' ? 'DELETE' : 'POST';
      const body = payload.body && typeof payload.body === 'object' ? JSON.stringify(payload.body) : undefined;
      const result = await managerRequest(baseUrl, managerToken, managerPath, { method, body, headers: body ? { 'Content-Type': 'application/json' } : {} });
      if (!result.ok) throw new Error(`Manager API2 HTTP ${result.status}`);
      const managerKey = (result.body && typeof result.body === 'object' && 'key' in result.body) ? String((result.body as {key: unknown}).key) : null;
      await admin.from('manager_sync_outbox').update({ status: 'posted', manager_key: managerKey, response_status: result.status, response_body: result.body, last_error: null, updated_at: new Date().toISOString() }).eq('id', row.id);
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
