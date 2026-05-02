import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function newToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function createNotification(supabase: any, restaurantId: string, title: string, body: string, type: string, targetType = 'owner', targetId = '') {
  await supabase.from("notifications").insert({
    restaurant_id: restaurantId,
    title,
    body,
    type,
    target_type: targetType,
    target_id: targetId,
  });
}

// Authenticate the caller via Bearer session_token. Returns the agent row or null.
async function authenticateAgent(supabase: any, req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  const { data: agent } = await supabase
    .from("delivery_agents")
    .select("*")
    .eq("session_token", token)
    .maybeSingle();

  if (!agent) return null;
  if (agent.session_expires_at && new Date(agent.session_expires_at) < new Date()) return null;
  return agent;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json();
    const { action } = body;

    // ── PUBLIC: Login by phone + PIN ─────────────────────────────────────
    if (action === "login") {
      const { phone, pin } = body;
      if (!phone || !pin) {
        return json({ error: "Phone and PIN required" }, 400);
      }

      // Look up agent
      const { data: agent } = await supabase
        .from("delivery_agents")
        .select("*, restaurants(name, logo_url, currency)")
        .eq("phone", phone)
        .maybeSingle();

      // Generic message — never reveal whether the phone exists
      if (!agent) {
        return json({ error: "بيانات الدخول غير صحيحة" }, 401);
      }

      // Verify PIN against staff_profiles for this user (driver staff entry)
      const { data: staff } = await supabase
        .from("staff_profiles")
        .select("pin")
        .eq("phone", phone)
        .eq("restaurant_id", agent.restaurant_id)
        .maybeSingle();

      if (!staff || String(staff.pin) !== String(pin)) {
        return json({ error: "بيانات الدخول غير صحيحة" }, 401);
      }

      // Issue a fresh session token
      const token = newToken();
      const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

      await supabase
        .from("delivery_agents")
        .update({
          status: "available",
          session_token: token,
          session_expires_at: expiresAt,
        })
        .eq("id", agent.id);

      await createNotification(
        supabase,
        agent.restaurant_id,
        '🟢 مندوب متصل',
        `المندوب ${agent.name} أصبح متصلاً`,
        'delivery'
      );

      return json({
        agent: { ...agent, status: "available", session_token: undefined, session_expires_at: undefined },
        session_token: token,
        expires_at: expiresAt,
      });
    }

    // ── AUTHENTICATED actions below ──────────────────────────────────────
    const agent = await authenticateAgent(supabase, req);
    if (!agent) {
      return json({ error: "Unauthorized" }, 401);
    }

    if (action === "update-location") {
      const { lat, lng } = body;
      if (lat == null || lng == null) return json({ error: "Missing params" }, 400);

      await supabase.from("delivery_agents").update({
        current_lat: lat,
        current_lng: lng,
        last_location_update: new Date().toISOString(),
      }).eq("id", agent.id);

      return json({ success: true });
    }

    if (action === "get-orders") {
      const { data: orders } = await supabase
        .from("orders")
        .select("*")
        .eq("restaurant_id", agent.restaurant_id)
        .eq("order_type", "delivery")
        .in("status", ["pending", "preparing", "ready"])
        .order("created_at", { ascending: false });

      const orderIds = (orders || []).map((o: any) => o.id);
      let allItems: any[] = [];
      if (orderIds.length > 0) {
        const { data: items } = await supabase.from("order_items").select("*").in("order_id", orderIds);
        allItems = items || [];
      }

      const { data: agentNotifications } = await supabase
        .from("notifications")
        .select("*")
        .eq("restaurant_id", agent.restaurant_id)
        .eq("target_type", "agent")
        .eq("target_id", agent.id)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(20);

      const enriched = (orders || []).map((o: any) => ({
        ...o,
        items: allItems.filter((i: any) => i.order_id === o.id),
        isMyOrder: o.delivery_agent_id === agent.id,
      }));

      return json({ orders: enriched, notifications: agentNotifications || [] });
    }

    if (action === "update-order-status") {
      const { order_id, status } = body;
      if (!order_id || !status) return json({ error: "Missing params" }, 400);

      // Authorization: order must belong to agent's restaurant AND be assigned to this agent
      const { data: order } = await supabase
        .from("orders")
        .select("restaurant_id, order_number, customer_name, delivery_agent_id")
        .eq("id", order_id)
        .maybeSingle();

      if (!order || order.restaurant_id !== agent.restaurant_id) {
        return json({ error: "Forbidden" }, 403);
      }
      if (order.delivery_agent_id && order.delivery_agent_id !== agent.id) {
        return json({ error: "Forbidden" }, 403);
      }

      await supabase.from("orders").update({ status }).eq("id", order_id);

      if (status === "completed") {
        await supabase.from("delivery_agents").update({ status: "available" }).eq("id", agent.id);
      }

      const statusLabels: Record<string, string> = {
        preparing: 'قيد التحضير',
        ready: 'جاهز للتسليم',
        completed: 'تم التسليم ✅',
      };
      await createNotification(
        supabase, order.restaurant_id,
        `📦 تحديث طلب #${order.order_number?.slice(-4)}`,
        `الطلب ${order.customer_name ? 'للعميل ' + order.customer_name : ''} أصبح: ${statusLabels[status] || status}`,
        'order'
      );

      return json({ success: true });
    }

    if (action === "accept-order") {
      const { order_id } = body;
      if (!order_id) return json({ error: "Missing params" }, 400);

      const { data: order } = await supabase
        .from("orders")
        .select("restaurant_id, order_number, customer_name, delivery_agent_id")
        .eq("id", order_id)
        .maybeSingle();

      if (!order || order.restaurant_id !== agent.restaurant_id) {
        return json({ error: "Forbidden" }, 403);
      }
      if (order.delivery_agent_id && order.delivery_agent_id !== agent.id) {
        return json({ error: "Order already assigned" }, 409);
      }

      await supabase.from("orders").update({ delivery_agent_id: agent.id }).eq("id", order_id);
      await supabase.from("delivery_agents").update({ status: "busy" }).eq("id", agent.id);

      await createNotification(
        supabase, order.restaurant_id,
        `🛵 مندوب قبل طلب #${order.order_number?.slice(-4)}`,
        `المندوب ${agent.name} قبل الطلب ${order.customer_name ? 'للعميل ' + order.customer_name : ''}`,
        'delivery'
      );

      return json({ success: true });
    }

    if (action === "go-offline") {
      await supabase
        .from("delivery_agents")
        .update({ status: "offline", session_token: null, session_expires_at: null })
        .eq("id", agent.id);

      await createNotification(
        supabase, agent.restaurant_id,
        '🔴 مندوب غير متصل',
        `المندوب ${agent.name} أصبح غير متصل`,
        'delivery'
      );

      return json({ success: true });
    }

    if (action === "notify-agent") {
      // Agents can only send notifications scoped to their own restaurant/themselves
      const { title, body: msgBody } = body;
      await createNotification(
        supabase, agent.restaurant_id,
        title || 'إشعار جديد',
        msgBody || '',
        'order',
        'agent',
        agent.id
      );
      return json({ success: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error('[driver-api] Unhandled error:', e);
    return json({ error: "An unexpected error occurred. Please try again." }, 500);
  }
});
