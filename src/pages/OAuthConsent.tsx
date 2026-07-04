import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChefHat, Loader2 } from "lucide-react";

// Typed wrapper for the beta supabase.auth.oauth namespace
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: any }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: any }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: any }>;
};
const oauthApi = () =>
  (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Missing authorization_id");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/login?next=" + encodeURIComponent(next);
        return;
      }
      try {
        const { data, error } = await oauthApi().getAuthorizationDetails(authorizationId);
        if (!active) return;
        if (error) {
          setError(error.message);
          return;
        }
        const immediate = data?.redirect_url ?? data?.redirect_to;
        if (immediate && !data?.client) {
          window.location.href = immediate;
          return;
        }
        setDetails(data);
      } catch (e: any) {
        if (active) setError(e?.message ?? String(e));
      }
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    try {
      const { data, error } = approve
        ? await oauthApi().approveAuthorization(authorizationId)
        : await oauthApi().denyAuthorization(authorizationId);
      if (error) {
        setBusy(false);
        setError(error.message);
        return;
      }
      const target = data?.redirect_url ?? data?.redirect_to;
      if (!target) {
        setBusy(false);
        setError("No redirect returned by the authorization server.");
        return;
      }
      window.location.href = target;
    } catch (e: any) {
      setBusy(false);
      setError(e?.message ?? String(e));
    }
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6" dir="rtl">
        <div className="glass-card p-8 max-w-md w-full text-center space-y-3">
          <h1 className="text-xl font-bold">تعذر تحميل طلب الربط</h1>
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  const clientName = details.client?.name ?? "التطبيق الخارجي";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4" dir="rtl">
      <div className="glass-card p-8 w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="w-14 h-14 rounded-xl gradient-bg flex items-center justify-center mx-auto mb-4">
            <ChefHat className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="font-display text-2xl font-bold">ربط {clientName}</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            سيتمكن {clientName} من الوصول إلى بيانات حسابك في Auditry POS نيابة عنك
            عبر أدوات MCP (المنتجات، الطلبات، ملخص المبيعات).
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            className="flex-1 gradient-bg text-primary-foreground border-0"
            disabled={busy}
            onClick={() => decide(true)}
          >
            {busy ? "جاري..." : "الموافقة"}
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            disabled={busy}
            onClick={() => decide(false)}
          >
            رفض
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground text-center">
          يمكنك إلغاء الوصول لاحقًا من إعدادات حسابك.
        </p>
      </div>
    </div>
  );
}
