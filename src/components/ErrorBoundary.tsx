import React from 'react';
import { AlertOctagon, RefreshCw, ChevronDown, ChevronUp, Copy, ShieldAlert } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  showDetails: boolean;
  copied: boolean;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      copied: false
    };
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled exception:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      copied: false
    });
    window.location.reload();
  };

  private handleCopy = async () => {
    if (!this.state.error) return;
    const errorLog = `Error: ${this.state.error.message}\n\nStack:\n${this.state.error.stack}\n\nComponent Stack:\n${this.state.errorInfo?.componentStack}`;
    try {
      await navigator.clipboard.writeText(errorLog);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch (err) {
      console.error('Failed to copy error to clipboard:', err);
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-slate-50 dark:bg-neutral-950 flex flex-col items-center justify-center p-4 sm:p-6 text-left selection:bg-rose-500 selection:text-white">
          <div className="max-w-2xl w-full bg-white dark:bg-neutral-900 border border-neutral-200/65 dark:border-neutral-800/60 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            
            {/* Warning Banner */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 pb-4 border-b border-neutral-100 dark:border-neutral-850">
              <div className="h-12 w-12 rounded-2xl bg-rose-50 dark:bg-rose-950/35 flex items-center justify-center shrink-0 border border-rose-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-400">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div className="space-y-1 text-center sm:text-left">
                <h2 className="text-xl font-black font-display text-neutral-900 dark:text-neutral-50 tracking-tight">
                  CivicAI App State Recovered
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 font-semibold">
                  A client-side runtime exception occurred. The app has been isolated safely.
                </p>
              </div>
            </div>

            {/* Error Message Box */}
            <div className="bg-rose-50/50 dark:bg-rose-950/15 border border-rose-100/40 dark:border-rose-900/20 rounded-2xl p-4 space-y-2 text-xs">
              <span className="text-[10px] uppercase font-black text-rose-700 dark:text-rose-400 tracking-wider flex items-center gap-1.5">
                <AlertOctagon className="h-4 w-4" />
                Diagnostic Exception Info
              </span>
              <p className="text-neutral-850 dark:text-neutral-200 font-bold font-mono break-all bg-white dark:bg-neutral-950/60 p-3 rounded-xl border border-rose-200/20 dark:border-rose-950/20 shadow-xs">
                {this.state.error?.message || 'Unknown runtime error'}
              </p>
            </div>

            {/* Troubleshooting Tips */}
            <div className="space-y-2 text-xs">
              <span className="text-[10px] uppercase font-black text-neutral-400 dark:text-neutral-500 tracking-wider block">
                Hackathon Troubleshooting Guide
              </span>
              <ul className="list-disc pl-5 space-y-1.5 text-neutral-600 dark:text-neutral-350 font-medium">
                <li>Verify your <code>GOOGLE_MAPS_PLATFORM_KEY</code> secret variable is valid inside the Settings panel.</li>
                <li>Make sure you have an active network connection to initialize Google Maps scripts.</li>
                <li>Ensure your local Firestore collection scheme supports read and write operations.</li>
              </ul>
            </div>

            {/* Details Accordion */}
            {this.state.error?.stack && (
              <div className="border border-neutral-150 dark:border-neutral-850 rounded-2xl overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => this.setState({ showDetails: !this.state.showDetails })}
                  className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-950/40 hover:bg-neutral-100 dark:hover:bg-neutral-950 flex items-center justify-between text-neutral-700 dark:text-neutral-300 font-black cursor-pointer transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    View Forensic Stack Trace
                  </span>
                  {this.state.showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {this.state.showDetails && (
                  <div className="p-4 bg-neutral-950 dark:bg-black border-t border-neutral-150 dark:border-neutral-850 space-y-3 relative">
                    <button
                      type="button"
                      onClick={this.handleCopy}
                      className="absolute top-3.5 right-3.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-350 px-2.5 py-1.5 rounded-lg font-bold text-[10px] cursor-pointer flex items-center gap-1 shadow-xs transition-colors"
                    >
                      <Copy className="h-3 w-3" />
                      {this.state.copied ? 'Copied!' : 'Copy Trace'}
                    </button>
                    <pre className="text-[10px] text-rose-450 dark:text-rose-400 font-mono overflow-auto max-h-56 leading-relaxed whitespace-pre-wrap select-all pr-4 pt-4">
                      {this.state.error.stack}
                      {this.state.errorInfo?.componentStack && `\n\nComponent Stack:\n${this.state.errorInfo.componentStack}`}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* Actions Footer */}
            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-850 flex flex-wrap gap-3 justify-end items-center">
              <button
                type="button"
                onClick={this.handleReset}
                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-black text-xs px-5 py-3 rounded-full shadow-md hover:shadow-lg hover:scale-101 cursor-pointer transition-all flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Reload Application
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
