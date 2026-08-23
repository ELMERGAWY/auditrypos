import { lazy, Suspense, Component, useEffect, type ReactNode, type ErrorInfo } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { AuthProvider } from "@/lib/AuthContext";
import { RefreshCcw } from "lucide-react";
import { GlobalCommandPalette } from "@/components/GlobalCommandPalette";
import { SystemUpdater } from "@/components/SystemUpdater";

const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const QRMenu = lazy(() => import("./pages/QRMenu"));
const StoreFront = lazy(() => import("./pages/StoreFront"));
const Payment = lazy(() => import("./pages/Payment"));
const SuperAdmin = lazy(() => import("./pages/SuperAdmin"));
const DriverLogin = lazy(() => import("./pages/DriverLogin"));
const DriverDashboard = lazy(() => import("./pages/DriverDashboard"));
const TrackOrder = lazy(() => import("./pages/TrackOrder"));

const NotFound = lazy(() => import("./pages/NotFound"));
const OAuthConsent = lazy(() => import("./pages/OAuthConsent"));
const StaffLogin = lazy(() => import("./pages/StaffLogin"));
const OAuthCallback = lazy(() => import("./pages/oauth-callback"));

const queryClient = new QueryClient();

const LoadingFallback = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <RefreshCcw className="w-10 h-10 animate-spin text-primary" />
  </div>
);

// Backward-compatible bridge: legacy inventory URLs must use the scoped Dashboard
// flow instead of keeping a second, unsafe data path alive.
const LegacyInventoryRedirect = () => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/dashboard?tab=inventory', { replace: true });
  }, [navigate]);
  return <LoadingFallback />;
};

class AppErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; message: string }> {
  state = { hasError: false, message: '' };
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App crash:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center gap-4" dir="rtl">
          <h1 className="text-2xl font-bold">حدث خطأ في تحميل التطبيق</h1>
          <p className="text-muted-foreground text-sm max-w-md">{this.state.message}</p>
          <button
            className="px-6 py-2 rounded-lg bg-primary text-primary-foreground"
            onClick={() => { localStorage.removeItem('last_known_user'); window.location.reload(); }}
          >
            إعادة التحميل
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const App = () => (
  <AppErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/staff-login" element={<StaffLogin />} />
              <Route path="/register" element={<Register />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/warehouses" element={<LegacyInventoryRedirect />} />
              <Route path="/sub-warehouses" element={<LegacyInventoryRedirect />} />
              <Route path="/inventory-transfers" element={<LegacyInventoryRedirect />} />
              <Route path="/qr-menu/:restaurantId" element={<QRMenu />} />
              <Route path="/store/:restaurantId" element={<StoreFront />} />
              <Route path="/payment" element={<Payment />} />
              <Route path="/super-admin-portal" element={<SuperAdmin />} />
              <Route path="/driver-login" element={<DriverLogin />} />
              <Route path="/driver" element={<DriverDashboard />} />
              <Route path="/track/:token" element={<TrackOrder />} />
              <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
              <Route path="/oauth/callback" element={<OAuthCallback />} />
              <Route path="*" element={<NotFound />} />

            </Routes>
          </Suspense>
          <GlobalCommandPalette />
          <SystemUpdater />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
  </AppErrorBoundary>
);

export default App;
