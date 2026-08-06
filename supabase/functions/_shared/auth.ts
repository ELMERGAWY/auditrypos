// Shared authentication / authorization helpers for edge functions.
// All AI + accounting endpoints must verify the caller's JWT and confirm the
// caller actually has access to the restaurant (tenant) they are asking about.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export type AuthResult =
  | { ok: true; userId: string }
  | { ok: false; status: number; error: string };

export async function requireRestaurantAccess(
  req: Request,
  restaurantId: string,
): Promise<AuthResult> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return { ok: false, status: 500, error: "Server not configured" };
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { ok: false, status: 401, error: "Unauthorized" };

  const admin = createClient(supabaseUrl, serviceKey);

  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  const userId = userData?.user?.id;
  if (userErr || !userId) return { ok: false, status: 401, error: "Unauthorized" };

  if (!restaurantId) return { ok: false, status: 400, error: "restaurant_id required" };

  // Super admins may access any tenant
  const { data: roles } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if ((roles ?? []).some((r: any) => r.role === "super_admin")) {
    return { ok: true, userId };
  }

  // Direct ownership / company membership
  const { data: restaurant } = await admin
    .from("restaurants")
    .select("id, owner_id, company_id")
    .eq("id", restaurantId)
    .maybeSingle();
  if (!restaurant) return { ok: false, status: 403, error: "Forbidden" };
  if ((restaurant as any).owner_id === userId) return { ok: true, userId };

  const companyId = (restaurant as any).company_id;
  if (companyId) {
    const { data: member } = await admin
      .from("company_users")
      .select("id")
      .eq("company_id", companyId)
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();
    if (member) return { ok: true, userId };
  }

  return { ok: false, status: 403, error: "Forbidden" };
}
