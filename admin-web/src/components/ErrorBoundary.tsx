import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-sm border border-gray-100 text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Xatolik yuz berdi</h2>
            <p className="text-sm text-gray-500 mb-4">
              Sahifada kutilmagan xatolik yuz berdi. Sahifani yangilang yoki bosh sahifaga qayting.
            </p>
            {this.state.error && (
              <details className="text-left bg-gray-50 rounded-lg p-3 mb-4">
                <summary className="text-xs text-gray-500 cursor-pointer">Texnik ma'lumot</summary>
                <pre className="text-xs text-red-600 mt-2 overflow-auto max-h-32">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="btn-primary text-sm px-4 py-2"
              >
                Sahifani yangilash
              </button>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.href = "/";
                }}
                className="btn-outline text-sm px-4 py-2"
              >
                Bosh sahifaga
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
