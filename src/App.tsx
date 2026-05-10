import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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

const queryClient = new QueryClient();

const LoadingFallback = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <RefreshCcw className="w-10 h-10 animate-spin text-primary" />
  </div>
);

const App = () => (
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
              <Route path="/register" element={<Register />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/qr-menu/:restaurantId" element={<QRMenu />} />
              <Route path="/store/:restaurantId" element={<StoreFront />} />
              <Route path="/payment" element={<Payment />} />
              <Route path="/super-admin-portal" element={<SuperAdmin />} />
              <Route path="/driver-login" element={<DriverLogin />} />
              <Route path="/driver" element={<DriverDashboard />} />
              <Route path="/track/:token" element={<TrackOrder />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          <GlobalCommandPalette />
          <SystemUpdater />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
