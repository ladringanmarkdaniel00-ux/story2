/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { lazy, Suspense, useEffect, useCallback, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';

// Core Entry Views
import { Home } from './pages/Home';
import { NotFound } from './pages/NotFound';

// Context & Global Resilience Components
import { ProductProvider } from './features/products';
import { FloatingNav } from './components/FloatingNav';
import { RoleToggle } from './components/RoleToggle';

import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { ToastContainer } from './components/ui/Toast';
import { CookieConsent } from './components/ui/CookieConsent';
import { OfflineBanner } from './components/ui/OfflineBanner';
import { PwaUpdateNotifier } from './components/ui/PwaUpdateNotifier';
import { ScrollRestore } from './hooks/useScrollRestore';
import { SEO } from './components/ui/SEO';
import { useStore } from './store';
import { type UserRole } from './types/user';

// ============================================================================
// 1. CHUNK LOADERS WITH INTENT PREFETCHING
// ============================================================================

export const routeLoaders = {
  Shop: () => import('./pages/Shop').then((m) => ({ default: m.Shop })),
  Product: () => import('./pages/Product').then((m) => ({ default: m.Product })),
  Profile: () => import('./pages/Profile').then((m) => ({ default: m.Profile })),
  Archive: () => import('./pages/Archive').then((m) => ({ default: m.Archive })),
  Login: () => import('./pages/Login').then((m) => ({ default: m.Login })),
  SignUp: () => import('./pages/SignUp').then((m) => ({ default: m.SignUp })),
  ForgotPassword: () => import('./pages/ForgotPassword').then((m) => ({ default: m.ForgotPassword })),
};

const Shop = lazy(routeLoaders.Shop);
const Product = lazy(routeLoaders.Product);
const Profile = lazy(routeLoaders.Profile);
const Archive = lazy(routeLoaders.Archive);
const Login = lazy(routeLoaders.Login);
const SignUp = lazy(routeLoaders.SignUp);
const ForgotPassword = lazy(routeLoaders.ForgotPassword);

export function preloadRouteChunk(chunkKey: keyof typeof routeLoaders): void {
  try {
    routeLoaders[chunkKey]();
  } catch {
    // Non-blocking prefetch failure
  }
}

// ============================================================================
// 2. OBSERVABILITY & ROUTE TELEMETRY
// ============================================================================

function RouteObserver(): null {
  const location = useLocation();

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      const payload = {
        level: 'info',
        action: 'ROUTE_TRANSITION',
        pathname: location.pathname,
        search: location.search,
        timestamp: new Date().toISOString(),
      };
      console.log(JSON.stringify(payload));
    }
  }, [location.pathname, location.search]);

  return null;
}

// ============================================================================
// 3. RBAC & ROUTE GUARDS
// ============================================================================

interface ProtectedRouteProps {
  readonly children: ReactNode;
  readonly allowedRoles?: ReadonlyArray<UserRole>;
}

function ProtectedRoute({
  children,
  allowedRoles = ['admin', 'client', 'customer'],
}: ProtectedRouteProps): React.JSX.Element {
  const profile = useStore((state) => state.profile);
  const userRole = profile?.role || 'guest';
  const currentUserId = useStore((state) => state.user?.id);

  if (!currentUserId || !allowedRoles.includes(userRole as any)) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// ============================================================================
// 4. ACCESSIBLE FALLBACK & APP COMPONENT
// ============================================================================

function PageFallback(): React.JSX.Element {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading page content"
      className="w-full min-h-[100svh] bg-white flex items-center justify-center"
    >
      <div className="w-8 h-8 rounded-full border-2 border-neutral-200 border-t-black animate-spin" />
    </div>
  );
}

export function App(): React.JSX.Element {
  return (
    <ErrorBoundary>
      <ProductProvider>
        <BrowserRouter>
          <SEO />
          <ScrollRestore />
          <RouteObserver />

          <Suspense fallback={<PageFallback />}>
            <Routes>
              {/* Primary Landing Route */}
              <Route path="/" element={<Home />} />

              {/* Route Aliases redirected to root */}
              <Route path="/home" element={<Navigate to="/" replace />} />
              <Route path="/story" element={<Navigate to="/" replace />} />
              <Route path="/stories" element={<Navigate to="/" replace />} />

              {/* Public Feature Routes */}
              <Route path="/shop/*" element={<Shop />} />
              <Route path="/product/*" element={<Product />} />

              {/* Protected Feature Routes */}
              <Route
                path="/profile"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'client', 'customer']}>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/archive"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'client', 'customer']}>
                    <Archive />
                  </ProtectedRoute>
                }
              />

              {/* Authentication Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />

              {/* 404 Catch-All */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>

          {/* Global Floating Overlays & Resilience Modules */}
          <FloatingNav />
          <RoleToggle />

          <ToastContainer />
          <CookieConsent />
          <OfflineBanner />
          <PwaUpdateNotifier />
        </BrowserRouter>
      </ProductProvider>
    </ErrorBoundary>
  );
}

export default App;
