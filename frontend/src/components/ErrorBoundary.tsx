import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#f8faf9] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl border border-[#e2e8f0] shadow-xl p-6 sm:p-8 text-center space-y-5">
            <div className="w-14 h-14 bg-[#ecfdf5] border border-[#a7f3d0] rounded-2xl flex items-center justify-center mx-auto text-[#047857]">
              <AlertCircle className="w-7 h-7 text-[#095c54]" />
            </div>

            <div>
              <h2 className="text-xl font-black text-[#0f2925] tracking-tight">
                Swachh Setu Portal Notice
              </h2>
              <p className="text-xs text-[#64748b] mt-1.5 leading-relaxed">
                The application encountered a temporary display issue. Your civic data is safely preserved.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-[#f8faf9] border border-[#e2e8f0] rounded-2xl text-left">
                <span className="text-[10px] font-bold text-[#64748b] uppercase block">Diagnostics:</span>
                <p className="text-xs font-mono text-rose-600 truncate mt-0.5">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="flex-1 py-3 px-4 bg-[#095c54] hover:bg-[#074741] text-white font-black text-xs rounded-2xl shadow-md transition flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4 text-emerald-200" />
                <span>Reload Portal</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem('clean_navsari_token');
                  window.location.href = '/';
                }}
                className="py-3 px-4 bg-[#f8faf9] hover:bg-[#e6f4f1] border border-[#e2e8f0] text-[#0f2925] font-bold text-xs rounded-2xl transition flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4 text-[#095c54]" />
                <span>Sign In Page</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

