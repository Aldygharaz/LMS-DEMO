import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home, Copy, Check } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    copied: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, copied: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught runtime error caught by Sokara ErrorBoundary:", error, errorInfo);
  }

  private handleCopyError = () => {
    if (this.state.error) {
      navigator.clipboard.writeText(this.state.error.stack || this.state.error.message);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6 select-none font-sans">
          <div className="max-w-md w-full bg-card border border-border rounded-3xl p-8 shadow-2xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Warning Icon Graphic */}
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 dark:bg-[#F23F43]/15 text-[#F23F43] border border-red-200 dark:border-[#F23F43]/30 shadow-inner">
              <AlertTriangle className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold font-brand text-foreground tracking-tight">
                Terjadi Kendala Sistem
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Aplikasi mendeteksi anomali pada komponen antarmuka. Anda dapat menyegarkan halaman atau kembali ke beranda.
              </p>
            </div>

            {/* Error Message Box */}
            {this.state.error && (
              <div className="text-left bg-background border border-border rounded-xl p-3.5 space-y-1.5 overflow-hidden">
                <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
                  <span>Detail Pengecualian</span>
                  <button
                    type="button"
                    onClick={this.handleCopyError}
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    {this.state.copied ? (
                      <>
                        <Check className="h-3 w-3 text-green-600 dark:text-[#57F287]" />
                        <span className="text-green-600 dark:text-[#57F287]">Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Salin Log</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs font-mono text-red-600 dark:text-[#FF7074] break-words line-clamp-3">
                  {this.state.error.message || "Unknown error"}
                </p>
              </div>
            )}

            {/* Recovery Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-[#0873C4] text-white text-xs font-bold transition-all shadow-md active:scale-95"
              >
                <RefreshCw className="h-4 w-4" />
                Segarkan Halaman
              </button>

              <button
                type="button"
                onClick={() => {
                  window.location.href = "/";
                }}
                className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-background hover:bg-secondary border border-border text-foreground text-xs font-bold transition-all active:scale-95"
              >
                <Home className="h-4 w-4 text-muted-foreground" />
                Ke Beranda
              </button>
            </div>

            <p className="text-[10px] text-muted-foreground tracking-tight">
              Sokara LMS &bull; Self-Healing Poka-Yoke Subsystem
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
