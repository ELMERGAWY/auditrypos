
import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  moduleName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ModuleErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Module Error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-destructive" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-foreground">عذراً، حدث خطأ في تابة {this.props.moduleName || "هذا القسم"}</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              حدث خطأ غير متوقع أثناء تحميل البيانات. يرجى محاولة تحديث الصفحة أو العودة للرئيسية.
            </p>
          </div>
          {true && (
            <div className="p-4 bg-muted rounded-xl text-left text-xs font-mono max-w-lg overflow-auto border">
              {this.state.error?.toString()}
            </div>
          )}
          <div className="flex gap-3">
            <Button 
              onClick={() => window.location.reload()} 
              className="gradient-bg text-white border-0 rounded-xl px-8"
            >
              <RefreshCcw className="w-4 h-4 ml-2" />
              تحديث الصفحة
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/dashboard'}
              className="rounded-xl px-8"
            >
              <Home className="w-4 h-4 ml-2" />
              الرئيسية
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
