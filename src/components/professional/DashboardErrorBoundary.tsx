
import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class DashboardErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Dashboard Crash:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center space-y-6">
          <div className="w-24 h-24 rounded-full bg-destructive/10 flex items-center justify-center animate-bounce">
            <AlertTriangle className="w-12 h-12 text-destructive" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-foreground">حدث خطأ تقني في لوحة التحكم</h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              عذراً، واجهنا مشكلة غير متوقعة في عرض لوحة التحكم. قد يكون السبب مشكلة في الاتصال أو تحديثات قيد التنفيذ.
            </p>
          </div>
          
          <div className="p-6 bg-muted/50 rounded-2xl text-left text-sm font-mono max-w-2xl overflow-auto border shadow-inner">
            <p className="font-bold text-destructive mb-2">تفاصيل الخطأ:</p>
            {this.state.error?.message}
            <br />
            <span className="text-[10px] text-muted-foreground opacity-50">{this.state.error?.stack?.split('\n')[1]}</span>
          </div>
          
          <div className="flex gap-4">
            <Button 
              onClick={() => window.location.reload()} 
              className="gradient-bg text-white border-0 rounded-2xl px-10 h-12 text-lg font-bold shadow-xl shadow-primary/20 hover:scale-105 transition-transform"
            >
              <RefreshCcw className="w-5 h-5 ml-2" />
              تحديث الصفحة
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
