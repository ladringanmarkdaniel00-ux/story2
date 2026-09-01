import React, { Component, ReactNode, ErrorInfo } from 'react';
import { logger } from '../../lib/core/logger';

interface ErrorBoundaryProps {
  readonly children: ReactNode;
  readonly fallback?: (retry: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  readonly hasError: boolean;
  readonly error?: Error;
}

export class ModalErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.error('ModalErrorBoundary caught an error', error, {
      componentStack: errorInfo.componentStack ?? 'N/A',
    });
  }

  private readonly handleRetry = (): void => {
    this.setState({ hasError: false, error: undefined });
  };

  public override render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.handleRetry);
      }

      return (
        <div
          role="alert"
          aria-live="assertive"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 text-center">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Unable to Load Interface</h3>
            <p className="text-sm text-gray-600 mb-6">
              A temporary error prevented this interface from loading. Please try again.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={this.handleRetry}
                className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
