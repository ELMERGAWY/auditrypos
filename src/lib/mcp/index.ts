import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listProducts from "./tools/list-products";
import listOrders from "./tools/list-orders";
import salesSummary from "./tools/sales-summary";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "auditry-pos-mcp",
  title: "Auditry POS MCP",
  version: "0.1.0",
  instructions:
    "Tools for the Auditry SmartPOS app. Use `list_products` to browse inventory, `list_orders` for recent orders, and `sales_summary` for aggregated revenue over a recent window. All tools are scoped to the signed-in user's restaurant via Supabase RLS.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listProducts, listOrders, salesSummary],
});
