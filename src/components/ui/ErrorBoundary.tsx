/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertOctagon, RotateCcw, Home } from 'lucide-react';
import { logger } from '../../utils/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('Caught in ErrorBoundary', error, undefined, {
      componentStack: errorInfo.componentStack,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <main className="min-h-[100svh] w-full flex items-center justify-center bg-white p-6">
          <div className="max-w-md w-full text-center flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
              <AlertOctagon className="w-6 h-6" />
            </div>
            <h1 className="text-lg font-bold text-neutral-900 tracking-tight">Something went wrong</h1>
            <p className="text-xs text-neutral-500 max-w-xs leading-relaxed">
              An unexpected error occurred. Our team has been notified.
            </p>
            {this.state.error && (
              <pre className="p-3 bg-neutral-50 border border-neutral-200 text-neutral-600 text-[11px] text-left rounded-lg overflow-x-auto max-w-full font-mono">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={this.handleReset}
                className="flex items-center gap-1.5 px-4 py-2 bg-black text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Try Again
              </button>
              <a
                href="/"
                className="flex items-center gap-1.5 px-4 py-2 border border-neutral-200 text-neutral-700 text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-neutral-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
              >
                <Home className="w-3.5 h-3.5" />
                Go Home
              </a>
            </div>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
