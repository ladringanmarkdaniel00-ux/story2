/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useCallback, useRef, useSyncExternalStore, useId } from 'react';

export interface NetworkStatusOptions {
  /** Health check endpoint URL (Default: '/api/health') */
  pingUrl?: string;
  /** Timeout in milliseconds before treating ping as failed (Default: 3000) */
  pingTimeout?: number;
  /** HTTP method for the probe (Default: 'HEAD') */
  pingMethod?: 'HEAD' | 'GET';
  /** Whether to verify connectivity when transitioning from offline to online (Default: true) */
  pingOnOnline?: boolean;
  /** Whether to verify connectivity with an immediate ping on component mount (Default: false) */
  pingOnMount?: boolean;
  /** Whether to re-verify connectivity when the tab gains focus or becomes visible (Default: true) */
  revalidateOnFocus?: boolean;
  /** Optional background polling interval in milliseconds (Default: disabled) */
  pollIntervalMs?: number;
}

export interface NetworkStatusResult {
  /** Current verified connection state (true only if both navigator and server probe succeed) */
  isOnline: boolean;
  /** Raw browser navigator connection state */
  isNavigatorOnline: boolean;
  /** Indicates if the user was offline at any point during the current session */
  wasOffline: boolean;
  /** Indicates if an active network probe is in-flight */
  isChecking: boolean;
  /** Timestamp of the last successful probe resolution */
  lastCheckedAt: number | null;
  /** Triggers an immediate network probe (deduplicated against in-flight requests) */
  checkConnection: (force?: boolean) => Promise<boolean>;
}

interface NetworkState {
  isNavigatorOnline: boolean;
  isVerifiedOnline: boolean;
  wasOffline: boolean;
  isChecking: boolean;
  lastCheckedAt: number | null;
}

interface PollingConfig {
  intervalMs: number;
  pingUrl: string;
  pingTimeout: number;
  pingMethod: 'HEAD' | 'GET';
}

const SERVER_SNAPSHOT: Readonly<NetworkState> = Object.freeze({
  isNavigatorOnline: true,
  isVerifiedOnline: true,
  wasOffline: false,
  isChecking: false,
  lastCheckedAt: null,
});

// ---------------------------------------------------------------------------
// Singleton Network Coordinator
// ---------------------------------------------------------------------------

class NetworkManager {
  private state: NetworkState;
  private listeners = new Set<() => void>();
  private inFlightPromise: Promise<boolean> | null = null;
  private activeAbortController: AbortController | null = null;
  // BUG FIX: Changed from single interval ID to a map of independent timer handles per subscriber
  private pollingTimers = new Map<string, ReturnType<typeof setInterval>>();
  private pollingRegistry = new Map<string, PollingConfig>();
  private focusRevalidateSubscribers = 0;

  constructor() {
    const isOnline = typeof navigator !== 'undefined' ? (navigator.onLine ?? true) : true;
    this.state = {
      isNavigatorOnline: isOnline,
      isVerifiedOnline: isOnline,
      wasOffline: !isOnline,
      isChecking: false,
      lastCheckedAt: null,
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  private handleOnline = () => {
    this.state = { ...this.state, isNavigatorOnline: true };
    this.notify();
  };

  private handleOffline = () => {
    this.state = {
      ...this.state,
      isNavigatorOnline: false,
      isVerifiedOnline: false,
      wasOffline: true,
    };
    this.notify();
  };

  private handleVisibilityOrFocus = () => {
    if (
      typeof document !== 'undefined' &&
      document.visibilityState === 'visible' &&
      this.state.isNavigatorOnline &&
      !this.state.isChecking
    ) {
      this.checkConnection();
    }
  };

  public subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  public getSnapshot = (): NetworkState => {
    return this.state;
  };

  public getServerSnapshot = (): NetworkState => {
    return SERVER_SNAPSHOT;
  };

  public registerFocusRevalidation() {
    if (this.focusRevalidateSubscribers === 0 && typeof window !== 'undefined') {
      window.addEventListener('focus', this.handleVisibilityOrFocus);
      document.addEventListener('visibilitychange', this.handleVisibilityOrFocus);
    }
    this.focusRevalidateSubscribers++;

    return () => {
      this.focusRevalidateSubscribers--;
      if (this.focusRevalidateSubscribers <= 0 && typeof window !== 'undefined') {
        window.removeEventListener('focus', this.handleVisibilityOrFocus);
        document.removeEventListener('visibilitychange', this.handleVisibilityOrFocus);
        this.focusRevalidateSubscribers = 0;
      }
    };
  }

  /**
   * Executes a network probe. Deduplicates concurrent calls to return the same active Promise.
   */
  public checkConnection = async (
    pingUrl = '/api/health',
    pingTimeout = 3000,
    pingMethod: 'HEAD' | 'GET' = 'HEAD',
    force = false
  ): Promise<boolean> => {
    if (typeof window === 'undefined') return true;

    if (this.inFlightPromise && !force) {
      return this.inFlightPromise;
    }

    if (this.activeAbortController && force) {
      this.activeAbortController.abort();
    }

    const controller = new AbortController();
    this.activeAbortController = controller;

    this.state = { ...this.state, isChecking: true };
    this.notify();

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, pingTimeout);

    this.inFlightPromise = (async () => {
      try {
        const response = await fetch(pingUrl, {
          method: pingMethod,
          cache: 'no-store',
          signal: controller.signal,
        });

        const online = response.ok;

        if (this.activeAbortController === controller) {
          this.state = {
            ...this.state,
            isVerifiedOnline: online,
            wasOffline: this.state.wasOffline || !online,
            lastCheckedAt: Date.now(),
          };
        }
        return online;
      } catch (error) {
        const isAborted =
          (error as Error)?.name === 'AbortError' ||
          (typeof DOMException !== 'undefined' && error instanceof DOMException && error.name === 'AbortError');

        if (isAborted && this.activeAbortController !== controller) {
          return this.state.isVerifiedOnline;
        }

        if (this.activeAbortController === controller) {
          this.state = {
            ...this.state,
            isVerifiedOnline: false,
            wasOffline: true,
            lastCheckedAt: Date.now(),
          };
        }
        return false;
      } finally {
        clearTimeout(timeoutId);

        if (this.activeAbortController === controller) {
          this.activeAbortController = null;
          this.inFlightPromise = null;
          this.state = { ...this.state, isChecking: false };
          this.notify();
        }
      }
    })();

    return this.inFlightPromise;
  };

  public registerPolling(id: string, config?: PollingConfig) {
    if (!config || config.intervalMs <= 0) {
      this.unregisterPolling(id);
      return;
    }
    this.pollingRegistry.set(id, config);
    this.reconcilePollingTimer(id, config);
  }

  public unregisterPolling(id: string) {
    this.pollingRegistry.delete(id);
    const existingTimer = this.pollingTimers.get(id);
    if (existingTimer) {
      clearInterval(existingTimer);
      this.pollingTimers.delete(id);
    }
  }

  // BUG FIX: Reconciles independent polling cycles per subscriber ID ensuring custom intervals/endpoints never collide or override each other
  private reconcilePollingTimer(id: string, config: PollingConfig) {
    const existingTimer = this.pollingTimers.get(id);
    if (existingTimer) {
      clearInterval(existingTimer);
      this.pollingTimers.delete(id);
    }

    const timerId = setInterval(() => {
      if (this.state.isNavigatorOnline && !this.state.isChecking) {
        this.checkConnection(config.pingUrl, config.pingTimeout, config.pingMethod);
      }
    }, config.intervalMs);

    this.pollingTimers.set(id, timerId);
  }

  public init() {
    const isOnline = typeof navigator !== 'undefined' ? (navigator.onLine ?? true) : true;
    this.state = {
      isNavigatorOnline: isOnline,
      isVerifiedOnline: isOnline,
      wasOffline: !isOnline,
      isChecking: false,
      lastCheckedAt: null,
    };
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
  }

  public destroy() {
    for (const timer of this.pollingTimers.values()) {
      clearInterval(timer);
    }
    this.pollingTimers.clear();

    if (this.activeAbortController) {
      this.activeAbortController.abort();
      this.activeAbortController = null;
    }
    this.inFlightPromise = null;
    this.listeners.clear();
    this.pollingRegistry.clear();
    this.focusRevalidateSubscribers = 0;

    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
      window.removeEventListener('focus', this.handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', this.handleVisibilityOrFocus);
    }
  }
}

export const networkManager = new NetworkManager();

// ---------------------------------------------------------------------------
// React Consumer Hook
// ---------------------------------------------------------------------------

export function useNetworkStatus(options: NetworkStatusOptions = {}): NetworkStatusResult {
  const {
    pingUrl = '/api/health',
    pingTimeout = 3000,
    pingMethod = 'HEAD',
    pingOnOnline = true,
    pingOnMount = false,
    revalidateOnFocus = true,
    pollIntervalMs,
  } = options;

  const hookId = useId();

  const state = useSyncExternalStore(
    networkManager.subscribe,
    networkManager.getSnapshot,
    networkManager.getServerSnapshot
  );

  const prevNavigatorOnlineRef = useRef<boolean>(state.isNavigatorOnline);
  const hasPingedOnMount = useRef<boolean>(false);

  // Keep options in a ref to avoid recreating callbacks or triggering unnecessary effect passes
  const optionsRef = useRef({ pingUrl, pingTimeout, pingMethod });
  optionsRef.current = { pingUrl, pingTimeout, pingMethod };

  const checkConnection = useCallback((force = false) => {
    const { pingUrl: url, pingTimeout: timeout, pingMethod: method } = optionsRef.current;
    return networkManager.checkConnection(url, timeout, method, force);
  }, []);

  // Handle Tab Focus & Visibility Change re-validation
  useEffect(() => {
    if (!revalidateOnFocus) return;
    return networkManager.registerFocusRevalidation();
  }, [revalidateOnFocus]);

  // Handle initial mount ping
  useEffect(() => {
    if (pingOnMount && state.isNavigatorOnline && !hasPingedOnMount.current) {
      hasPingedOnMount.current = true;
      checkConnection();
    }
  }, [pingOnMount, state.isNavigatorOnline, checkConnection]);

  // Handle offline -> online transitions
  useEffect(() => {
    const wasOfflineTransition = !prevNavigatorOnlineRef.current && state.isNavigatorOnline;
    prevNavigatorOnlineRef.current = state.isNavigatorOnline;

    if (wasOfflineTransition && pingOnOnline) {
      checkConnection();
    }
  }, [state.isNavigatorOnline, pingOnOnline, checkConnection]);

  // Polling registration and lifecycle reconciliation
  useEffect(() => {
    if (pollIntervalMs && pollIntervalMs > 0) {
      networkManager.registerPolling(hookId, {
        intervalMs: pollIntervalMs,
        pingUrl,
        pingTimeout,
        pingMethod,
      });
    } else {
      networkManager.unregisterPolling(hookId);
    }

    return () => {
      networkManager.unregisterPolling(hookId);
    };
  }, [hookId, pollIntervalMs, pingUrl, pingTimeout, pingMethod]);

  return {
    isOnline: state.isNavigatorOnline && state.isVerifiedOnline,
    isNavigatorOnline: state.isNavigatorOnline,
    wasOffline: state.wasOffline,
    isChecking: state.isChecking,
    lastCheckedAt: state.lastCheckedAt,
    checkConnection,
  };
}
