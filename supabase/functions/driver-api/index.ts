import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { action, phone, agent_id, lat, lng, order_id, status } = await req.json();

    // Login by phone
    if (action === "login") {
      if (!phone) return new Response(JSON.stringify({ error: "Phone required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      
      const { data: agent, error } = await supabase
        .from("delivery_agents")
        .select("*, restaurants(name, logo_url, currency)")
        .eq("phone", phone)
        .maybeSingle();

      if (!agent) {
        return new Response(JSON.stringify({ error: "لا يوجد مندوب بهذا الرقم" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Set agent online
      await supabase.from("delivery_agents").update({ status: "available" }).eq("id", agent.id);

      // Notify owner
      await createNotification(supabase, agent.restaurant_id, '🟢 مندوب متصل', `المندوب ${agent.name} أصبح متصلاً`, 'delivery');

      return new Response(JSON.stringify({ agent: { ...agent, status: "available" } }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Update location
    if (action === "update-location") {
      if (!agent_id || lat == null || lng == null) return new Response(JSON.stringify({ error: "Missing params" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      
      await supabase.from("delivery_agents").update({
        current_lat: lat,
        current_lng: lng,
        last_location_update: new Date().toISOString(),
      }).eq("id", agent_id);

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get assigned orders + notifications for agent
    if (action === "get-orders") {
      if (!agent_id) return new Response(JSON.stringify({ error: "Missing agent_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      
      const { data: agent } = await supabase.from("delivery_agents").select("restaurant_id").eq("id", agent_id).single();
      if (!agent) return new Response(JSON.stringify({ error: "Agent not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

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

      // Get agent notifications
      const { data: agentNotifications } = await supabase
        .from("notifications")
        .select("*")
        .eq("restaurant_id", agent.restaurant_id)
        .eq("target_type", "agent")
        .eq("target_id", agent_id)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(20);

      const enriched = (orders || []).map((o: any) => ({
        ...o,
        items: allItems.filter((i: any) => i.order_id === o.id),
        isMyOrder: o.delivery_agent_id === agent_id,
      }));

      return new Response(JSON.stringify({ orders: enriched, notifications: agentNotifications || [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Update order status
    if (action === "update-order-status") {
      if (!order_id || !status) return new Response(JSON.stringify({ error: "Missing params" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      
      // Get order and agent details for notification
      const { data: order } = await supabase.from("orders").select("restaurant_id, order_number, customer_name").eq("id", order_id).single();
      
      await supabase.from("orders").update({ status }).eq("id", order_id);
      
      // If completed, set agent back to available
      if (status === "completed" && agent_id) {
        await supabase.from("delivery_agents").update({ status: "available" }).eq("id", agent_id);
      }

      // Notify owner about status change
      if (order) {
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
      }

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Accept order (assign to self)
    if (action === "accept-order") {
      if (!order_id || !agent_id) return new Response(JSON.stringify({ error: "Missing params" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      
      const { data: order } = await supabase.from("orders").select("restaurant_id, order_number, customer_name").eq("id", order_id).single();
      const { data: agentData } = await supabase.from("delivery_agents").select("name").eq("id", agent_id).single();
      
      await supabase.from("orders").update({ delivery_agent_id: agent_id }).eq("id", order_id);
      await supabase.from("delivery_agents").update({ status: "busy" }).eq("id", agent_id);

      // Notify owner
      if (order) {
        await createNotification(
          supabase, order.restaurant_id,
          `🛵 مندوب قبل طلب #${order.order_number?.slice(-4)}`,
          `المندوب ${agentData?.name || ''} قبل الطلب ${order.customer_name ? 'للعميل ' + order.customer_name : ''}`,
          'delivery'
        );
      }

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Go offline
    if (action === "go-offline") {
      if (!agent_id) return new Response(JSON.stringify({ error: "Missing agent_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      
      const { data: agent } = await supabase.from("delivery_agents").select("name, restaurant_id").eq("id", agent_id).single();
      await supabase.from("delivery_agents").update({ status: "offline" }).eq("id", agent_id);
      
      if (agent) {
        await createNotification(supabase, agent.restaurant_id, '🔴 مندوب غير متصل', `المندوب ${agent.name} أصبح غير متصل`, 'delivery');
      }

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Send notification to agent
    if (action === "notify-agent") {
      const { restaurant_id, title, body } = await req.json();
      if (!agent_id || !restaurant_id) return new Response(JSON.stringify({ error: "Missing params" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      
      await createNotification(supabase, restaurant_id, title || 'إشعار جديد', body || '', 'order', 'agent', agent_id);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
