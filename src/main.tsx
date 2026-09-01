/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { StrictMode, Component, type ReactNode, type ErrorInfo, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';
import { registerServiceWorker } from './lib/pwa/serviceWorker';
import { setupAppInteractions } from './lib/pwa/viewportInteractions';
import { logger } from './lib/core/logger';
import { useStore, secureCleanup } from './store';

// =============================================================
// 1. ENVIRONMENT VALIDATION
// =============================================================
if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  logger.warn('Supabase environment variables are missing. Using placeholders.');
}

// =============================================================
// 2. QUERY CLIENT CONFIGURATION (Deduplication & Cache)
// =============================================================
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// =============================================================
// 3. SECURE ERROR BOUNDARY (Resilience & Fault Isolation)
// =============================================================
interface ErrorBoundaryProps {
  readonly children: ReactNode;
}
interface ErrorBoundaryState {
  readonly hasError: boolean;
  readonly error: Error | null;
}

class RootErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.error('Fatal application render exception caught by RootErrorBoundary', error, {
      componentStack: errorInfo.componentStack || 'unknown',
    });
    // Trigger GDPR/Security scrub on fatal crash
    secureCleanup();
  }

  private handleReload = (): void => {
    secureCleanup();
    window.location.reload();
  };

  public override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <main
          role="alert"
          aria-live="assertive"
          className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 text-center"
        >
          <div className="max-w-md w-full p-8 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-xl">
            <h1 className="text-xl font-bold mb-2">Secure Session Terminated</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
              An unexpected error occurred. For security, your session state has been isolated.
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="w-full py-3 px-6 bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-white dark:text-neutral-900 text-white font-medium rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-900"
            >
              Secure Reload
            </button>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}

// =============================================================
// 4. AUTHENTICATION PROVIDER WRAPPER
// =============================================================
const SecureAppProvider = ({ children }: { readonly children: ReactNode }) => {
  const initialize = useStore((state) => state.initialize);
  const initialized = useStore((state) => state.initialized);

  useEffect(() => {
    initialize();
    
    // Cleanup transient blobs on unmount
    return () => {
      secureCleanup();
    };
  }, [initialize]);

  if (!initialized) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-white dark:bg-neutral-950">
        <div className="w-8 h-8 border-4 border-neutral-300 dark:border-neutral-700 border-t-neutral-900 dark:border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
};

// =============================================================
// 5. HARDWARE, PWA & INTERACTION INITIALIZATION
// =============================================================
setupAppInteractions({ restrictPwaGesturesOnly: true });
registerServiceWorker({
  onUpdate: () => logger.info('[App] Service Worker update available.'),
  onSuccess: () => logger.info('[App] Application offline caching completed.'),
  onError: (err) => logger.warn('[App] Service worker registration issue:', { error: err.message }),
});

// =============================================================
// 6. REACT DOM ROOT MOUNTING
// =============================================================
const rootElement = document.getElementById('root');
if (!rootElement) {
  logger.error('Fatal: Target container element "#root" was not found in the DOM.');
  const fallbackDiv = document.createElement('div');
  fallbackDiv.id = 'fatal-root-error';
  fallbackDiv.style.cssText = 'padding: 24px; font-family: sans-serif; color: #dc2626; text-align: center;';
  fallbackDiv.innerText = 'Application failed to initialize. Missing root mounting point.';
  document.body.appendChild(fallbackDiv);
} else {
  createRoot(rootElement).render(
    <StrictMode>
      <RootErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <SecureAppProvider>
            <App />
          </SecureAppProvider>
        </QueryClientProvider>
      </RootErrorBoundary>
    </StrictMode>
  );
}
