import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "sales_summary",
  title: "Sales summary",
  description: "Return a summary of orders (count, revenue, average) for the signed-in user's restaurant over the last N days.",
  inputSchema: {
    days: z.number().int().min(1).max(365).optional().describe("Lookback window in days (default 7)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ days }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const since = new Date(Date.now() - (days ?? 7) * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("orders")
      .select("total, status, created_at")
      .gte("created_at", since);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const rows = data ?? [];
    const total = rows.reduce((s, r: any) => s + Number(r.total || 0), 0);
    const count = rows.length;
    const summary = {
      days: days ?? 7,
      order_count: count,
      total_revenue: Number(total.toFixed(2)),
      average_order_value: count ? Number((total / count).toFixed(2)) : 0,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
      structuredContent: summary,
    };
  },
});
