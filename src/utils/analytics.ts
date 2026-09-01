/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AnalyticsEvent {
  readonly name: string;
  readonly properties?: Readonly<Record<string, unknown>>;
  readonly timestamp: number;
}

const ANALYTICS_OPT_OUT_KEY = 'analytics_opt_out';
const MAX_QUEUE_SIZE = 50;

class AnalyticsTracker {
  private queue: AnalyticsEvent[] = [];
  private isFlushing = false;

  public isOptedOut(): boolean {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return false;
    return localStorage.getItem(ANALYTICS_OPT_OUT_KEY) === 'true';
  }

  public setOptOut(optOut: boolean): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    localStorage.setItem(ANALYTICS_OPT_OUT_KEY, optOut ? 'true' : 'false');
    if (optOut) {
      // Clear pending queue if user opts out post-hoc (GDPR compliance)
      this.queue = [];
    }
  }

  public track(name: string, properties?: Readonly<Record<string, unknown>>): void {
    if (this.isOptedOut()) return;

    const event: AnalyticsEvent = Object.freeze({
      name: name.trim(),
      properties: properties ? Object.freeze({ ...properties }) : undefined,
      timestamp: Date.now(),
    });

    this.queue.push(event);

    // Keep queue bounded to prevent memory leaks
    if (this.queue.length > MAX_QUEUE_SIZE) {
      this.queue.shift();
    }

    // Automatically trigger batch flush if queue hits threshold
    if (this.queue.length >= 20) {
      void this.flush();
    }
  }

  public async flush(): Promise<void> {
    if (this.isFlushing || this.queue.length === 0 || this.isOptedOut()) return;

    this.isFlushing = true;
    const batch = [...this.queue];
    this.queue = [];

    try {
      // In production, transmit batch to telemetry ingest endpoint
      const endpoint = '/api/v1/telemetry';
      
      if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        const blob = new Blob([JSON.stringify({ events: batch })], { type: 'application/json' });
        const success = navigator.sendBeacon(endpoint, blob);
        if (!success) {
          // Fallback re-enqueue if beacon fails
          this.queue = [...batch, ...this.queue].slice(0, MAX_QUEUE_SIZE);
        }
      } else {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ events: batch }),
          keepalive: true,
        });
        if (!response.ok) {
          throw new Error(`Telemetry upload failed with status ${response.status}`);
        }
      }
    } catch {
      // Re-enqueue batch on network failure, respecting max size bound
      this.queue = [...batch, ...this.queue].slice(0, MAX_QUEUE_SIZE);
    } finally {
      this.isFlushing = false;
    }
  }
}

export const analytics = new AnalyticsTracker();

// Register window unload listener to guarantee final beacon flush on exit
if (typeof window !== 'undefined') {
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      void analytics.flush();
    }
  });
}

export default analytics;
