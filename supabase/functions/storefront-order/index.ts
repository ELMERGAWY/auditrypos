import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { restaurant_id, items, customer_name, customer_phone, delivery_address, notes, order_type } = await req.json();

    if (!restaurant_id || !items?.length) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Validate restaurant
    const { data: rest } = await supabase
      .from("restaurants")
      .select("id, status, name")
      .eq("id", restaurant_id)
      .eq("status", "active")
      .maybeSingle();

    if (!rest) {
      return new Response(JSON.stringify({ error: "Restaurant not active or not found" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const orderNum = `SF-${Date.now().toString().slice(-6)}`;
    const total = items.reduce((s: number, i: any) => s + (i.price || 0) * (i.quantity || 1), 0);

    const { data: order, error } = await supabase.from("orders").insert({
      restaurant_id,
      order_number: orderNum,
      total,
      status: "pending",
      customer_name: customer_name || "",
      customer_phone: customer_phone || "",
      delivery_address: delivery_address || "",
      order_type: order_type || "delivery",
      notes: notes || "",
    }).select().single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    await supabase.from("order_items").insert(
      items.map((i: any) => ({
        order_id: order.id,
        menu_item_name: i.name,
        menu_item_image: i.image || "📦",
        quantity: i.quantity || 1,
        price: i.price || 0,
      }))
    );

    return new Response(JSON.stringify({ order_number: orderNum, order_id: order.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
