import { Component } from 'react';

class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('Error caught:', error, info);
    
    // Auto-reload for Vite dynamic import failures (chunk missing due to new deploy)
    const isChunkLoadError = error?.message?.includes('Failed to fetch dynamically imported module') || error?.message?.includes('Load failed');
    
    if (isChunkLoadError) {
      const reloadKey = 'hasReloadedForChunkError';
      if (!sessionStorage.getItem(reloadKey)) {
        sessionStorage.setItem(reloadKey, 'true');
        window.location.reload();
      }
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-light flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full">
            <div className="text-6xl mb-4">😵</div>
            <h2 className="text-2xl font-bold text-dark mb-2">
              Something went wrong
            </h2>
            <p className="text-gray-500 mb-6 text-sm">
              An unexpected error occurred. Please refresh the page to try again.
            </p>
            {this.state.error && (
              <div className="bg-red-50 text-red-500 p-4 rounded-lg mb-6 text-left text-xs overflow-auto max-h-40">
                <p className="font-bold">{this.state.error.toString()}</p>
                <p className="whitespace-pre-wrap">{this.state.error.stack}</p>
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 px-4 rounded-xl transition"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
