/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AnalyticsEvent {
  readonly id: string;
  readonly name: string;
  readonly properties: Readonly<Record<string, unknown>>;
  readonly timestamp: number;
}

export interface TrackerConfig {
  readonly endpoint?: string;
  readonly batchSize?: number;
  readonly maxBatchBytes?: number;
  readonly flushIntervalMs?: number;
  readonly maxQueueSize?: number;
  readonly debug?: boolean;
}

const ANALYTICS_OPT_OUT_KEY = 'analytics_opt_out';
const SENSITIVE_KEY_REGEX = /^(password|pass|secret|token|apiKey|auth|authorization|creditCard|cardNumber|cvv|cvc|ssn)$/i;
const EMAIL_REGEX = /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+/g;
const PHONE_REGEX = /(\+\d{1,3}[\s-]?)?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}/g;
const CARD_REGEX = /\b(?:\d{4}[\s-]?){3}\d{4}\b/g;

/**
 * Recursively sanitizes and scrubs PII from telemetry properties
 */
function sanitizeProperties(data: unknown, depth = 0, seen = new WeakSet()): unknown {
  if (depth > 4 || data === null || data === undefined) return data;

  if (typeof data === 'string') {
    let s = data.replace(EMAIL_REGEX, '[REDACTED_EMAIL]');
    s = s.replace(PHONE_REGEX, '[REDACTED_PHONE]');
    s = s.replace(CARD_REGEX, '[REDACTED_CARD]');
    return s;
  }

  if (typeof data === 'number' || typeof data === 'boolean') {
    return data;
  }

  if (typeof window !== 'undefined' && data instanceof Node) {
    return '[DOM_ELEMENT]';
  }

  if (typeof data === 'object') {
    if (seen.has(data as object)) {
      return '[CIRCULAR_REF]';
    }
    seen.add(data as object);

    if (Array.isArray(data)) {
      return data.map((item) => sanitizeProperties(item, depth + 1, seen));
    }

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (SENSITIVE_KEY_REGEX.test(key)) {
        sanitized[key] = '[REDACTED_PII]';
      } else {
        sanitized[key] = sanitizeProperties(value, depth + 1, seen);
      }
    }
    return sanitized;
  }

  return undefined;
}

function generateEventId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export class AnalyticsTracker {
  private queue: AnalyticsEvent[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private readonly config: Required<TrackerConfig>;
  private isDestroyed = false;

  // Stored references for clean event listener removal
  private readonly handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      this.flush();
    }
  };

  private readonly handlePageHide = () => {
    this.flush();
  };

  constructor(config: TrackerConfig = {}) {
    this.config = {
      endpoint: config.endpoint || '/api/analytics/events',
      batchSize: config.batchSize || 10,
      maxBatchBytes: config.maxBatchBytes || 1024 * 1024, // 1MB default
      flushIntervalMs: config.flushIntervalMs || 5000,
      maxQueueSize: config.maxQueueSize || 100,
      debug: config.debug ?? false,
    };

    this.initLifecycle();
  }

  /**
   * Evaluates privacy flags: Explicit Opt-out, Global Privacy Control (GPC), or Do Not Track (DNT)
   */
  public isOptedOut(): boolean {
    if (typeof window === 'undefined') return true;

    // 1. Check Global Privacy Control (GPC) standard
    if (
      (navigator as unknown as { globalPrivacyControl?: boolean }).globalPrivacyControl === true
    ) {
      return true;
    }

    // 2. Check Do Not Track (DNT) header
    if (navigator.doNotTrack === '1' || (window as unknown as { doNotTrack?: string }).doNotTrack === '1') {
      return true;
    }

    // 3. Check LocalStorage preference
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(ANALYTICS_OPT_OUT_KEY) === 'true';
      }
    } catch {
      // Storage access blocked by browser policy -> Fail safe as opted out
      return true;
    }

    return false;
  }

  /**
   * Sets explicit opt-out preference
   */
  public setOptOut(optOut: boolean): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(ANALYTICS_OPT_OUT_KEY, optOut ? 'true' : 'false');
      if (optOut) {
        this.queue = [];
      }
    } catch {
      // Ignore private browsing storage errors
    }
  }

  /**
   * Tracks an application event with automatic scheduling and PII scrubbing
   */
  public track(name: string, properties?: Record<string, unknown>): void {
    if (this.isDestroyed || this.isOptedOut() || !name || typeof name !== 'string') {
      return;
    }

    const cleanName = name.trim().slice(0, 64);
    const cleanProps = (sanitizeProperties(properties) as Record<string, unknown>) || {};

    const event: AnalyticsEvent = {
      id: generateEventId(),
      name: cleanName,
      properties: Object.freeze(cleanProps),
      timestamp: Date.now(),
    };

    // BUG FIX: Enqueue synchronously to prevent race conditions with immediate flush() or unmounts
    this.enqueue(event);
  }

  private enqueue(event: AnalyticsEvent): void {
    this.queue.push(event);

    // Enforce hard ceiling on queue size
    if (this.queue.length > this.config.maxQueueSize) {
      this.queue.splice(0, this.queue.length - this.config.maxQueueSize);
    }

    if (this.queue.length >= this.config.batchSize) {
      this.flush();
    }
  }

  /**
   * Dispatches batched events to backend via non-blocking Beacon or Fetch keepalive
   */
  public flush(): void {
    if (this.queue.length === 0 || typeof window === 'undefined') return;

    const payload: AnalyticsEvent[] = [];
    let byteLength = 13; // Base size for {"events":[]}

    let i = 0;
    while (i < this.queue.length && payload.length < this.config.batchSize) {
      const event = this.queue[i];
      const serializedEvent = JSON.stringify(event);
      // Fallback size calculation using Blob or string length
      const eventSize = typeof Blob !== 'undefined' ? new Blob([serializedEvent]).size : serializedEvent.length;
      
      const newByteLength = byteLength + eventSize + (payload.length > 0 ? 1 : 0); // +1 for comma
      
      if (newByteLength > this.config.maxBatchBytes && payload.length > 0) {
        break;
      }
      
      byteLength = newByteLength;
      payload.push(event);
      i++;
    }

    this.queue.splice(0, i);
    const serialized = JSON.stringify({ events: payload });

    // 1. Prefer navigator.sendBeacon for zero-latency background execution
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = typeof Blob !== 'undefined' ? new Blob([serialized], { type: 'text/plain;charset=UTF-8' }) : serialized;
      const success = navigator.sendBeacon(this.config.endpoint, blob as Blob);
      if (success) return;
    }

    // 2. Fallback to fetch with keepalive: true (survives tab navigation)
    if (typeof fetch === 'function') {
      fetch(this.config.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: serialized,
        keepalive: true,
      }).catch(() => {
        // Silent fail: telemetry errors must never crash application
      });
    }
  }

  /**
   * Binds browser lifecycle listeners to flush data on page close/hide
   */
  private initLifecycle(): void {
    if (typeof window === 'undefined') return;

    // Periodic Background Flush
    this.flushTimer = setInterval(() => this.flush(), this.config.flushIntervalMs);

    window.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('pagehide', this.handlePageHide);
  }

  /**
   * Tears down listeners and timers (useful for SPA unmounts and test suites)
   */
  public destroy(): void {
    this.isDestroyed = true;
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // BUG FIX: Remove global window event listeners to prevent memory leaks
    if (typeof window !== 'undefined') {
      window.removeEventListener('visibilitychange', this.handleVisibilityChange);
      window.removeEventListener('pagehide', this.handlePageHide);
    }

    while (this.queue.length > 0) {
      this.flush();
    }
  }
}

export const analytics = new AnalyticsTracker();
