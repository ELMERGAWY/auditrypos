// AI-powered user creation + permission assignment
// Accepts either natural-language prompt OR structured payload
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Payload {
  restaurant_id: string;
  prompt?: string;
  email?: string;
  password?: string;
  full_name?: string;
  role?: string;
  permissions?: string[]; // permission codes
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";

    // verify caller
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const body: Payload = await req.json();

    if (!body.restaurant_id) {
      return new Response(JSON.stringify({ error: "restaurant_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // authorize: super admin OR owner of restaurant
    const { data: rolesRow } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const isSuperAdmin = (rolesRow || []).some((r: any) => r.role === "super_admin" || r.role === "admin");
    const { data: rest } = await admin.from("restaurants").select("id, owner_id").eq("id", body.restaurant_id).maybeSingle();
    const isOwner = rest && (rest as any).owner_id === user.id;
    if (!isSuperAdmin && !isOwner) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let { email, password, full_name, role, permissions } = body;

    // If prompt provided, parse with Lovable AI
    if (body.prompt && (!email || !password)) {
      const { data: allPerms } = await admin.from("permissions").select("code, name_ar, module");
      const permCatalog = (allPerms || []).map((p: any) => `${p.code} (${p.name_ar})`).join(", ");

      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `أنت مساعد إداري. استخرج من نص المستخدم بيانات إنشاء موظف جديد بصيغة JSON. الصلاحيات المتاحة (code): ${permCatalog}. اختر الأكواد المناسبة فقط من القائمة. الأدوار المسموحة: manager, branch_manager, accountant, auditor, store_manager, cashier.`,
            },
            { role: "user", content: body.prompt },
          ],
          tools: [{
            type: "function",
            function: {
              name: "create_user",
              description: "Create staff user",
              parameters: {
                type: "object",
                properties: {
                  email: { type: "string" },
                  password: { type: "string" },
                  full_name: { type: "string" },
                  role: { type: "string" },
                  permissions: { type: "array", items: { type: "string" } },
                },
                required: ["email", "password", "full_name", "role"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "create_user" } },
        }),
      });

      if (!aiResp.ok) {
        const t = await aiResp.text();
        return new Response(JSON.stringify({ error: "AI parse failed", details: t }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const aiJson = await aiResp.json();
      const call = aiJson.choices?.[0]?.message?.tool_calls?.[0];
      if (!call) {
        return new Response(JSON.stringify({ error: "AI did not return structured output" }), {
          status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const args = JSON.parse(call.function.arguments);
      email = email || args.email;
      password = password || args.password;
      full_name = full_name || args.full_name;
      role = role || args.role;
      permissions = permissions || args.permissions || [];
    }

    if (!email || !password || !full_name || !role) {
      return new Response(JSON.stringify({ error: "Missing required fields", got: { email, full_name, role, hasPwd: !!password } }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) create auth user
    const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { full_name },
    });
    if (createErr || !newUser?.user) {
      return new Response(JSON.stringify({ error: createErr?.message || "createUser failed" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const newUid = newUser.user.id;

    // 2) profile (best-effort)
    await admin.from("profiles").upsert({ user_id: newUid, full_name, email }, { onConflict: "user_id" });

    // 3) staff record
    await admin.from("staff").insert({ restaurant_id: body.restaurant_id, name: full_name, email, role, status: "active" });

    // 4) permission entries
    if (permissions && permissions.length) {
      const rows = permissions.map((code) => ({
        restaurant_id: body.restaurant_id,
        company_id: body.restaurant_id,
        role,
        permission_code: code,
        is_allowed: true,
      }));
      await admin.from("role_permissions").insert(rows);
    }

    return new Response(JSON.stringify({
      success: true,
      user: { id: newUid, email, full_name, role, permissions: permissions || [] },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("admin-create-user error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
