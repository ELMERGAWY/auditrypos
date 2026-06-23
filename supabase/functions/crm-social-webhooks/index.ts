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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  
  const url = new URL(req.url);
  const platform = url.searchParams.get("platform"); // 'meta', 'google', 'tiktok'
  const restaurantId = url.searchParams.get("restaurant_id");

  // Meta (Facebook) Webhook Verification
  if (req.method === "GET" && platform === "meta") {
    const hubMode = url.searchParams.get("hub.mode");
    const hubToken = url.searchParams.get("hub.verify_token");
    const hubChallenge = url.searchParams.get("hub.challenge");

    if (hubMode === "subscribe" && hubChallenge) {
      return new Response(hubChallenge, { status: 200 });
    }
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(supabaseUrl!, serviceKey!);

  try {
    const body = await req.json();
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
