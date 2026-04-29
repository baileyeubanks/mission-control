import * as React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";

interface Props {
  children?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-screen flex-col items-center justify-center p-6 bg-background text-foreground">
          <div className="glass border-destructive/20 p-8 max-w-md w-full space-y-6 text-center">
            <div className="flex justify-center">
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-display tracking-tight uppercase">System_Fault_Detected</h1>
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                The runtime encountered an unrecoverable exception.
              </p>
            </div>
            {this.state.error && (
              <div className="bg-white p-3 rounded-sm border border-slate-200 text-left">
                <p className="text-[10px] font-mono text-destructive break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}
            <Button 
              onClick={() => window.location.reload()} 
              className="w-full font-mono text-[10px] uppercase tracking-widest"
            >
              <RefreshCw className="mr-2 h-3 w-3" />
              Restart_Runtime
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children || null;
  }
}
