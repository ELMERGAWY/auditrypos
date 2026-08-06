// ============================================================
// GLOBAL CRM SOCIAL WEBHOOK HANDLER
// Processes incoming Leads and Messages from Meta, Google, and TikTok
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const platform = url.searchParams.get("platform"); // 'meta', 'google', 'tiktok', 'linkedin'
  const restaurantId = url.searchParams.get("restaurant_id");

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return jsonResponse({ error: "Server not configured" }, 500);
  const supabase = createClient(supabaseUrl, serviceKey);

  if (!platform || !restaurantId) {
    return jsonResponse({ error: "platform and restaurant_id are required" }, 400);
  }

  // Load the tenant's configured credentials for this platform (fail closed)
  const { data: config } = await supabase
    .from("crm_platform_configs")
    .select("api_secret, webhook_verify_token, is_active")
    .eq("restaurant_id", restaurantId)
    .eq("platform", platform)
    .maybeSingle();

  if (!config || (config as any).is_active === false) {
    return jsonResponse({ error: "Webhook not configured" }, 403);
  }
  const appSecret = (config as any).api_secret as string | null;
  const verifyToken = (config as any).webhook_verify_token as string | null;

  // Meta (Facebook) subscription handshake — must match the stored verify token
  if (req.method === "GET" && platform === "meta") {
    const hubMode = url.searchParams.get("hub.mode");
    const hubToken = url.searchParams.get("hub.verify_token");
    const hubChallenge = url.searchParams.get("hub.challenge");
    if (hubMode === "subscribe" && hubChallenge && verifyToken && hubToken === verifyToken) {
      return new Response(hubChallenge, { status: 200 });
    }
    return jsonResponse({ error: "Verification failed" }, 403);
  }

  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  // Read the raw body so signatures can be validated over the exact bytes
  const rawBody = await req.text();

  if (platform === "meta") {
    // Meta signs each delivery with the app secret
    const header = req.headers.get("x-hub-signature-256") ?? "";
    if (!appSecret || !header.startsWith("sha256=")) {
      return jsonResponse({ error: "Invalid signature" }, 401);
    }
    const expected = await hmacSha256Hex(appSecret, rawBody);
    if (header.slice(7).toLowerCase() !== expected) {
      return jsonResponse({ error: "Invalid signature" }, 401);
    }
  } else {
    // Other providers: require the tenant's shared secret token
    const provided = req.headers.get("x-webhook-token") ?? url.searchParams.get("token") ?? "";
    if (!verifyToken || provided !== verifyToken) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
  }

  try {
    const body = JSON.parse(rawBody);
    console.log(`Incoming ${platform} webhook for restaurant ${restaurantId}:`, body);

    let leadData: any = null;

    if (platform === "meta") {
      // Handle Meta Lead Ads
      if (body.object === "page") {
        for (const entry of body.entry) {
          for (const change of entry.changes) {
            if (change.field === "leadgen") {
              leadData = {
                name: "New Meta Lead",
                phone: "", // Need to fetch via Graph API with lead_id
                source: "facebook",
                platform: "facebook",
                raw_social_data: change.value,
                campaign_name: "Meta Ad Campaign"
              };
            }
          }
        }
      }
    } else if (platform === "google") {
      // Handle Google Lead Form Webhook
      if (body.user_column_data) {
        leadData = {
          name: body.user_column_data.find((c: any) => c.column_id === "FULL_NAME")?.string_value || "Google Lead",
          phone: body.user_column_data.find((c: any) => c.column_id === "PHONE_NUMBER")?.string_value || "",
          email: body.user_column_data.find((c: any) => c.column_id === "USER_EMAIL")?.string_value || "",
          source: "google",
          platform: "google",
          raw_social_data: body,
          campaign_name: body.campaign_id
        };
      }
    } else if (platform === "tiktok") {
      // Handle TikTok Lead Webhook
      leadData = {
        name: body.full_name || "TikTok Lead",
        phone: body.phone_number || "",
        email: body.email || "",
        source: "tiktok",
        platform: "tiktok",
        raw_social_data: body,
        campaign_name: body.campaign_name
      };
    } else if (platform === "linkedin") {
      // Handle LinkedIn Lead Gen Form Webhook
      leadData = {
        name: `${body.firstName || ''} ${body.lastName || ''}`.trim() || "LinkedIn Lead",
        phone: body.phone || "",
        email: body.email || "",
        source: "linkedin",
        platform: "linkedin",
        raw_social_data: body,
        campaign_name: body.campaignName || "LinkedIn Ad"
      };
    }

    if (leadData && restaurantId) {
      const { data: savedLead, error } = await supabase
        .from("crm_leads")
        .insert({
          restaurant_id: restaurantId,
          ...leadData,
          stage: "new"
        })
        .select()
        .single();

      if (error) throw error;

      // Auto-assign logic (Simple Round Robin or Random for now)
      const { data: staff } = await supabase
        .from("staff")
        .select("id")
        .eq("restaurant_id", restaurantId)
        .eq("role", "sales");

      if (staff && staff.length > 0) {
        const randomStaff = staff[Math.floor(Math.random() * staff.length)];
        await supabase.from("crm_leads").update({ assigned_to: randomStaff.id }).eq("id", savedLead.id);
      }
    }

    return jsonResponse({ ok: true });
  } catch (e: any) {
    console.error("Webhook error:", e);
    return jsonResponse({ error: e?.message }, 500);
  }
});
