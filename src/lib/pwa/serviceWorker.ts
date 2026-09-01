// serviceWorker.ts

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Client Service Worker Registration & Lifecycle Controller
 */

import { logger } from '../core/logger';

export interface ServiceWorkerConfig {
  readonly swUrl?: string;
  readonly scope?: string;
  readonly updateIntervalMs?: number;
  readonly onSuccess?: (registration: ServiceWorkerRegistration) => void;
  readonly onUpdate?: (registration: ServiceWorkerRegistration) => void;
  readonly onError?: (error: Error) => void;
}

export interface PwaUpdateEventDetail {
  readonly registration: ServiceWorkerRegistration;
  readonly reload: () => void;
}

let registrationInstance: ServiceWorkerRegistration | null = null;
let isRefreshing = false;
let updateIntervalTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Returns the currently active ServiceWorkerRegistration instance.
 */
export function getServiceWorkerRegistration(): ServiceWorkerRegistration | null {
  return registrationInstance;
}

/**
 * Validates that the current environment supports secure Service Worker execution.
 */
function isServiceWorkerSupported(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  // Service Workers require secure context (HTTPS or localhost)
  const isSecure = window.isSecureContext || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  return 'serviceWorker' in navigator && isSecure;
}

/**
 * Executes a service worker update cycle and notifies listeners if a waiting worker is detected.
 */
export async function checkForServiceWorkerUpdate(registration?: ServiceWorkerRegistration | null): Promise<void> {
  const target = registration || registrationInstance;
  if (!target) return;

  try {
    await target.update();
    if (target.waiting) {
      notifyUpdateAvailable(target);
    }
  } catch (error) {
    logger.debug('[SW] Periodic update check skipped or failed:', { error: String(error) });
  }
}

/**
 * Dispatches custom DOM events for UI components (toasts, update banners) and executes callback.
 */
function notifyUpdateAvailable(registration: ServiceWorkerRegistration, config?: ServiceWorkerConfig): void {
  const detail: PwaUpdateEventDetail = {
    registration,
    reload: () => promptServiceWorkerUpdate(registration),
  };

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<PwaUpdateEventDetail>('pwa-update-available', { detail }));
  }

  config?.onUpdate?.(registration);
}

/**
 * Registers the Service Worker with full lifecycle hooks, reload loop prevention,
 * and automatic focus/network update triggers.
 */
export function registerServiceWorker(config: ServiceWorkerConfig = {}): void {
  if (!isServiceWorkerSupported()) {
    logger.debug('[SW] Service Workers unsupported or insecure context. Registration skipped.');
    return;
  }

  const {
    swUrl = '/sw.js',
    scope = '/',
    updateIntervalMs = 60 * 60 * 1000, // Check for updates hourly
    onSuccess,
    onError,
  } = config;

  const initRegistration = async () => {
    try {
      // 1. Controllerchange Handler with Reload Loop Shield
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!isRefreshing) {
          isRefreshing = true;
          logger.info('[SW] Controller changed. Reloading page for instant asset refresh.');
          window.location.reload();
        }
      });

      // 2. Register Service Worker Script
      const registration = await navigator.serviceWorker.register(swUrl, { scope });
      registrationInstance = registration;

      logger.info('[SW] Service Worker registered successfully', {
        scope: registration.scope,
      });

      // 3. Check for pre-existing waiting worker (e.g. from previous background install)
      if (registration.waiting) {
        logger.info('[SW] Pre-existing waiting Service Worker found on startup.');
        notifyUpdateAvailable(registration, config);
      }

      // 4. Track Incoming Updates
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (!installingWorker) return;

        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // New content is available; prompt the user to refresh
              logger.info('[SW] New version installed and waiting for activation.');
              notifyUpdateAvailable(registration, config);
            } else {
              // Initial offline caching complete
              logger.info('[SW] Core assets cached. App is ready for offline operation.');
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('pwa-offline-ready', { detail: registration }));
              }
              onSuccess?.(registration);
            }
          }
        };
      };

      // 5. Automatic Background Update Triggers (Visibility Change & Network Reconnect)
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            void checkForServiceWorkerUpdate(registration);
          }
        });
      }

      if (typeof window !== 'undefined') {
        window.addEventListener('online', () => {
          logger.info('[SW] Network restored. Checking for application updates.');
          void checkForServiceWorkerUpdate(registration);
        });
      }

      // 6. Hourly Background Polling Timer
      if (updateIntervalMs > 0) {
        if (updateIntervalTimer) clearInterval(updateIntervalTimer);
        updateIntervalTimer = setInterval(() => {
          void checkForServiceWorkerUpdate(registration);
        }, updateIntervalMs);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.warn('[SW] Service Worker registration failed', { message: err.message });
      onError?.(err);
    }
  };

  // Prevent load listener race conditions: register immediately if document is already ready
  if (document.readyState === 'complete') {
    void initRegistration();
  } else {
    window.addEventListener('load', () => void initRegistration(), { once: true });
  }
}

/**
 * Signals the waiting Service Worker to skip waiting and activate immediately.
 */
export function promptServiceWorkerUpdate(registration?: ServiceWorkerRegistration | null): void {
  const targetReg = registration || registrationInstance;
  const waitingWorker = targetReg?.waiting;

  if (waitingWorker) {
    logger.info('[SW] Sending SKIP_WAITING signal to waiting Service Worker.');
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
  } else if (targetReg?.installing) {
    // If worker is still installing, attach state listener to trigger when installed
    targetReg.installing.addEventListener('statechange', (event) => {
      const target = event.target as ServiceWorker;
      if (target.state === 'installed') {
        target.postMessage({ type: 'SKIP_WAITING' });
      }
    });
  } else {
    // Fallback reload if no waiting worker was found
    window.location.reload();
  }
}

/**
 * Unregisters all active service workers and clears interval timers.
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (updateIntervalTimer) {
    clearInterval(updateIntervalTimer);
    updateIntervalTimer = null;
  }

  if (!isServiceWorkerSupported()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const unregistered = await registration.unregister();
    registrationInstance = null;
    logger.info('[SW] Service Worker unregister status:', { unregistered });
    return unregistered;
  } catch (error) {
    logger.warn('[SW] Service Worker unregistration failed', { error: String(error) });
    return false;
  }
}
