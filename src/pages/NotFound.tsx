/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

// ============================================================================
// 1. OBSERVABILITY & TELEMETRY
// ============================================================================

interface NotFoundTelemetryEvent {
  readonly action: 'ROUTE_NOT_FOUND';
  readonly path: string;
  readonly referrer: string;
  readonly timestamp: string;
}

function logNotFoundEvent(path: string): void {
  if (process.env.NODE_ENV !== 'production') {
    const payload: NotFoundTelemetryEvent = {
      action: 'ROUTE_NOT_FOUND',
      path,
      referrer: typeof document !== 'undefined' ? document.referrer : '',
      timestamp: new Date().toISOString(),
    };
    console.warn(JSON.stringify(payload));
  }
}

// ============================================================================
// 2. MAIN NOT FOUND COMPONENT
// ============================================================================

export function NotFound(): React.JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();

  // Log 404 occurrences for route telemetry
  useEffect(() => {
    logNotFoundEvent(location.pathname);
  }, [location.pathname]);

  // Manage document title and search indexing metadata with robust teardown
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const previousTitle = document.title;
    document.title = '404 - Page Not Found';

    // Inject temporary noindex meta tag for client-rendered SPA 404 routes
    let robotsMeta = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    let createdMeta = false;

    if (!robotsMeta) {
      robotsMeta = document.createElement('meta');
      robotsMeta.name = 'robots';
      robotsMeta.content = 'noindex, nofollow';
      document.head.appendChild(robotsMeta);
      createdMeta = true;
    } else {
      robotsMeta.setAttribute('data-prev-content', robotsMeta.content);
      robotsMeta.content = 'noindex, nofollow';
    }

    return () => {
      document.title = previousTitle;
      if (createdMeta && robotsMeta?.parentNode) {
        robotsMeta.parentNode.removeChild(robotsMeta);
      } else if (robotsMeta) {
        const prevContent = robotsMeta.getAttribute('data-prev-content');
        if (prevContent !== null) {
          robotsMeta.content = prevContent;
          robotsMeta.removeAttribute('data-prev-content');
        }
      }
    };
  }, []);

  // History-aware navigation that guarantees the user stays within the application
  const handleGoBack = useCallback((): void => {
    if (typeof window === 'undefined') {
      navigate('/', { replace: true });
      return;
    }

    // React Router tracks history depth in window.history.state.idx
    const historyIndex = (window.history.state as { idx?: number } | null)?.idx;

    if (typeof historyIndex === 'number' && historyIndex > 0) {
      navigate(-1);
    } else {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  return (
    <main
      id="page-not-found"
      className="min-h-[100svh] w-full flex flex-col items-center justify-center bg-white text-black p-6 text-center"
    >
      <div className="flex flex-col items-center max-w-md mx-auto">
        <h1 className="text-8xl md:text-9xl font-bold tracking-tighter text-neutral-950 font-mono select-none">
          404
        </h1>

        <p className="mt-4 text-sm md:text-base font-semibold tracking-[0.2em] text-neutral-600 uppercase">
          Page Not Found
        </p>

        <p className="mt-2 text-xs md:text-sm text-neutral-500 max-w-xs leading-relaxed">
          The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </p>

        <nav aria-label="404 recovery options" className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={handleGoBack}
            className="px-5 py-2.5 rounded-lg border border-neutral-300 text-neutral-800 hover:bg-neutral-100 active:bg-neutral-200 text-xs sm:text-sm font-semibold tracking-wider uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 cursor-pointer"
          >
            Go Back
          </button>

          <Link
            to="/"
            className="px-5 py-2.5 rounded-lg bg-neutral-950 text-white hover:bg-neutral-800 active:bg-neutral-900 text-xs sm:text-sm font-semibold tracking-wider uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2"
          >
            Return to Home
          </Link>
        </nav>
      </div>
    </main>
  );
}

export default NotFound;
