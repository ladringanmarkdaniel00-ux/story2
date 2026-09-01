/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface SerializedError {
  readonly name: string;
  readonly message: string;
  readonly stack?: string;
  readonly cause?: unknown;
  readonly aggregateErrors?: readonly SerializedError[];
}

export interface LogEntry {
  readonly id: string;
  readonly level: LogLevel;
  readonly message: string;
  readonly timestamp: string;
  readonly context?: Readonly<Record<string, unknown>>;
  readonly error?: SerializedError;
}

export interface LoggerConfig {
  /** Minimum log level to print to console (Default: 'debug' in dev, 'info' in prod) */
  readonly minLevel?: LogLevel;
  /** Minimum log level to buffer and send to remote APM (Default: 'warn') */
  readonly apmMinLevel?: LogLevel;
  /** Remote APM ingest endpoint (Default: '/api/telemetry/logs') */
  readonly apmEndpoint?: string;
  /** Maximum number of log items per batch (Default: 15) */
  readonly batchSize?: number;
  /** Maximum batch payload size in bytes to prevent Beacon 64KB overflow (Default: 60,000) */
  readonly maxBatchBytes?: number;
  /** Periodic background flush interval in milliseconds (Default: 5000) */
  readonly flushIntervalMs?: number;
  /** Maximum in-memory log buffer size (Default: 150) */
  readonly maxBufferSize?: number;
  /** Whether to output formatted logs to the browser console (Default: true) */
  readonly enableConsole?: boolean;
  /** Automatically capture unhandled window exceptions and promise rejections (Default: true) */
  readonly captureUnhandledExceptions?: boolean;
}

const LOG_LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const SENSITIVE_KEY_PATTERN =
  /^(password|pass|token|jwt|apiKey|auth|authorization|bearer|secret|cookie|creditCard|cardNumber|cvv|cvc|ssn|privateKey)$/i;
const EMAIL_MASK_PATTERN = /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+/g;
const CARD_MASK_PATTERN = /\b(?:\d[ -]*?){13,19}\b/g;

const MAX_PAYLOAD_BYTES = 60_000;

function isDevelopmentEnvironment(): boolean {
  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env.NODE_ENV !== 'production';
    }
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      return Boolean(import.meta.env.DEV);
    }
  } catch {
    // Fail-safe default
  }
  return false;
}

/**
 * Recursively sanitizes context payloads: handles circular references, strips DOM nodes, and masks PII.
 */
function sanitizeContext(
  data: unknown,
  depth = 0,
  seen = new WeakSet<object>()
): unknown {
  if (depth > 5 || data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    return data
      .replace(EMAIL_MASK_PATTERN, '[REDACTED_EMAIL]')
      .replace(CARD_MASK_PATTERN, '[REDACTED_CARD]');
  }

  if (typeof data === 'number' || typeof data === 'boolean') {
    return data;
  }

  if (typeof data === 'bigint') {
    return data.toString();
  }

  if (typeof data === 'function' || typeof data === 'symbol') {
    return undefined;
  }

  if (typeof data === 'object') {
    if (seen.has(data)) {
      return '[CIRCULAR_REF]';
    }
    seen.add(data);

    if (typeof window !== 'undefined' && (data instanceof HTMLElement || data instanceof Window)) {
      return '[DOM_ELEMENT]';
    }

    if (Array.isArray(data)) {
      return data
        .map((item) => sanitizeContext(item, depth + 1, seen))
        .filter((item) => item !== undefined);
    }

    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        cleaned[key] = '[REDACTED_SECRET]';
      } else {
        const sanitizedVal = sanitizeContext(value, depth + 1, seen);
        if (sanitizedVal !== undefined) {
          cleaned[key] = sanitizedVal;
        }
      }
    }
    return cleaned;
  }

  return undefined;
}

/**
 * Normalizes unknown throwables into structured, serializable error objects including AggregateError support.
 */
function serializeError(
  err: unknown,
  depth = 0,
  seen = new WeakSet<object>()
): SerializedError | undefined {
  if (!err || depth > 4) return undefined;

  if (err instanceof Error) {
    if (seen.has(err)) {
      return { name: err.name, message: '[CIRCULAR_ERROR_CAUSE]' };
    }
    seen.add(err);

    // Support AggregateError (ES2021 / Promise.allSettled)
    let aggregateErrors: SerializedError[] | undefined;
    if ('errors' in err && Array.isArray((err as { errors: unknown[] }).errors)) {
      aggregateErrors = (err as { errors: unknown[] }).errors
        .map((nestedErr) => serializeError(nestedErr, depth + 1, seen))
        .filter((e): e is SerializedError => e !== undefined);
    }

    return {
      name: err.name || 'Error',
      message: err.message || 'Unknown error message',
      stack: err.stack,
      cause: err.cause ? serializeError(err.cause, depth + 1, seen) : undefined,
      aggregateErrors: aggregateErrors && aggregateErrors.length > 0 ? aggregateErrors : undefined,
    };
  }

  if (typeof err === 'string') {
    return {
      name: 'UnhandledStringException',
      message: err,
    };
  }

  if (typeof err === 'object') {
    try {
      return {
        name: 'UnhandledObjectException',
        message: JSON.stringify(err),
      };
    } catch {
      return {
        name: 'UnhandledObjectException',
        message: '[Unserializable Exception Object]',
      };
    }
  }

  return {
    name: 'UnknownException',
    message: String(err),
  };
}

function generateLogId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export class AppLogger {
  private readonly config: Required<LoggerConfig>;
  private readonly buffer: LogEntry[] = [];
  private readonly recentErrorHashes = new Map<string, number>();
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private isDestroyed = false;

  private boundVisibilityChange: (() => void) | null = null;
  private boundPageHide: (() => void) | null = null;
  private boundWindowError: ((event: ErrorEvent) => void) | null = null;
  private boundUnhandledRejection: ((event: PromiseRejectionEvent) => void) | null = null;

  constructor(config: LoggerConfig = {}) {
    const isDev = isDevelopmentEnvironment();

    this.config = {
      minLevel: config.minLevel || (isDev ? 'debug' : 'info'),
      apmMinLevel: config.apmMinLevel || 'warn',
      apmEndpoint: config.apmEndpoint || '/api/telemetry/logs',
      batchSize: config.batchSize || 15,
      maxBatchBytes: config.maxBatchBytes || MAX_PAYLOAD_BYTES,
      flushIntervalMs: config.flushIntervalMs || 5000,
      maxBufferSize: config.maxBufferSize || 150,
      enableConsole: config.enableConsole ?? true,
      captureUnhandledExceptions: config.captureUnhandledExceptions ?? true,
    };

    this.initLifecycle();
  }

  private shouldLogToConsole(level: LogLevel): boolean {
    return LOG_LEVEL_WEIGHT[level] >= LOG_LEVEL_WEIGHT[this.config.minLevel];
  }

  private shouldBufferForApm(level: LogLevel): boolean {
    return LOG_LEVEL_WEIGHT[level] >= LOG_LEVEL_WEIGHT[this.config.apmMinLevel];
  }

  /**
   * Deduplicates identical errors logged in rapid succession within 5000ms.
   */
  private isDuplicateError(message: string, error?: SerializedError): boolean {
    const signature = `${message}_${error?.name || ''}_${error?.message || ''}`;
    const now = Date.now();
    const lastLogged = this.recentErrorHashes.get(signature);

    if (lastLogged && now - lastLogged < 5000) {
      return true;
    }

    this.recentErrorHashes.set(signature, now);

    if (this.recentErrorHashes.size > 100) {
      for (const [key, timestamp] of this.recentErrorHashes.entries()) {
        if (now - timestamp > 10000) {
          this.recentErrorHashes.delete(key);
        }
      }
    }

    return false;
  }

  private createEntry(
    level: LogLevel,
    message: string,
    serializedErr?: SerializedError,
    context?: Record<string, unknown>
  ): LogEntry {
    const sanitizedContext = (sanitizeContext(context) as Record<string, unknown>) || undefined;

    return {
      id: generateLogId(),
      level,
      message: message.trim(),
      timestamp: new Date().toISOString(),
      context: sanitizedContext ? Object.freeze(sanitizedContext) : undefined,
      error: serializedErr ? Object.freeze(serializedErr) : undefined,
    };
  }

  private writeToConsole(entry: LogEntry): void {
    if (!this.config.enableConsole || !this.shouldLogToConsole(entry.level)) return;

    const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]: ${entry.message}`;

    switch (entry.level) {
      case 'debug':
        if (entry.context) console.debug(prefix, entry.context);
        else console.debug(prefix);
        break;
      case 'info':
        if (entry.context) console.info(prefix, entry.context);
        else console.info(prefix);
        break;
      case 'warn':
        if (entry.context || entry.error) console.warn(prefix, entry.context ?? '', entry.error ?? '');
        else console.warn(prefix);
        break;
      case 'error':
        console.error(prefix, entry.error ?? '', entry.context ?? '');
        break;
    }
  }

  private dispatch(entry: LogEntry): void {
    if (this.isDestroyed) return;

    // 1. Output to local console
    this.writeToConsole(entry);

    // 2. Buffer for remote APM telemetry if level matches apmMinLevel
    if (this.shouldBufferForApm(entry.level)) {
      this.buffer.push(entry);

      if (this.buffer.length > this.config.maxBufferSize) {
        this.buffer.splice(0, this.buffer.length - this.config.maxBufferSize);
      }

      if (this.buffer.length >= this.config.batchSize) {
        this.flush(this.config.batchSize);
      }
    }
  }

  public debug(message: string, context?: Record<string, unknown>): void {
    this.dispatch(this.createEntry('debug', message, undefined, context));
  }

  public info(message: string, context?: Record<string, unknown>): void {
    this.dispatch(this.createEntry('info', message, undefined, context));
  }

  public warn(message: string, context?: Record<string, unknown>): void {
    this.dispatch(this.createEntry('warn', message, undefined, context));
  }

  public error(message: string, error?: unknown, context?: Record<string, unknown>): void {
    const serialized = serializeError(error);
    if (this.isDuplicateError(message, serialized)) {
      return;
    }
    this.dispatch(this.createEntry('error', message, serialized, context));
  }

  /**
   * Flushes logs to APM telemetry backend within byte and count budgets.
   */
  public flush(limit?: number): void {
    if (this.buffer.length === 0 || typeof window === 'undefined') return;

    const maxItems = limit ? Math.min(limit, this.buffer.length) : this.buffer.length;
    const batch: LogEntry[] = [];
    let estimatedBytes = 25;

    while (this.buffer.length > 0 && batch.length < maxItems) {
      const candidate = this.buffer[0];
      const entrySize = JSON.stringify(candidate).length + 2;

      if (batch.length > 0 && estimatedBytes + entrySize > this.config.maxBatchBytes) {
        break;
      }

      batch.push(this.buffer.shift()!);
      estimatedBytes += entrySize;
    }

    if (batch.length === 0) return;

    let serializedPayload: string;
    try {
      serializedPayload = JSON.stringify({ logs: batch });
    } catch {
      return;
    }

    // 1. Send via Beacon using text/plain to bypass cross-origin CORS preflight drops
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      try {
        const blob = new Blob([serializedPayload], { type: 'text/plain;charset=UTF-8' });
        const sent = navigator.sendBeacon(this.config.apmEndpoint, blob);
        if (sent) return;
      } catch {
        // Fall through to keepalive fetch on beacon exhaustion
      }
    }

    // 2. Fallback to Keepalive Fetch
    if (typeof fetch === 'function') {
      fetch(this.config.apmEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: serializedPayload,
        keepalive: true,
      }).catch(() => {
        if (!this.isDestroyed) {
          this.buffer.unshift(...batch);
          // BUG FIX: Drop the oldest logs from the front instead of truncating the newest at the end
          if (this.buffer.length > this.config.maxBufferSize) {
            this.buffer.splice(0, this.buffer.length - this.config.maxBufferSize);
          }
        }
      });
    }
  }

  /**
   * Drains the entire log buffer across safe batch chunks (used on tab unload).
   */
  public flushAll(): void {
    while (this.buffer.length > 0) {
      const prevLength = this.buffer.length;
      this.flush(this.config.batchSize);
      if (this.buffer.length >= prevLength) {
        this.buffer.shift();
      }
    }
  }

  private initLifecycle(): void {
    if (typeof window === 'undefined') return;

    this.flushTimer = setInterval(() => {
      this.flush(this.config.batchSize);
    }, this.config.flushIntervalMs);

    this.boundVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        this.flushAll();
      }
    };

    this.boundPageHide = () => {
      this.flushAll();
    };

    document.addEventListener('visibilitychange', this.boundVisibilityChange);
    window.addEventListener('pagehide', this.boundPageHide);

    if (this.config.captureUnhandledExceptions) {
      this.boundWindowError = (event: ErrorEvent) => {
        if (
          event.message &&
          (event.message.includes('ResizeObserver') || event.message.includes('Script error.'))
        ) {
          return;
        }

        this.error('Unhandled window exception caught', event.error || event.message, {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        });
      };

      this.boundUnhandledRejection = (event: PromiseRejectionEvent) => {
        const reason = event.reason;
        const msg = reason?.message || String(reason);
        if (
          reason?.name === 'AbortError' ||
          msg.includes('aborted') ||
          msg.includes('cancelled') ||
          msg.includes('The user aborted a request') ||
          msg.includes('Failed to fetch dynamically imported module')
        ) {
          return;
        }

        // BUG FIX: Map to `this.error` so exceptions are fully serialized rather than sanitized and dropped
        this.error('Unhandled Promise Rejection caught', reason);
      };

      window.addEventListener('error', this.boundWindowError);
      window.addEventListener('unhandledrejection', this.boundUnhandledRejection);
    }
  }

  /**
   * Cleans up background timers, unbinds global listeners, and drains remaining logs.
   */
  public destroy(): void {
    this.isDestroyed = true;

    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    if (typeof document !== 'undefined' && this.boundVisibilityChange) {
      document.removeEventListener('visibilitychange', this.boundVisibilityChange);
      this.boundVisibilityChange = null;
    }

    if (typeof window !== 'undefined') {
      if (this.boundPageHide) {
        window.removeEventListener('pagehide', this.boundPageHide);
        this.boundPageHide = null;
      }
      if (this.boundWindowError) {
        window.removeEventListener('error', this.boundWindowError);
        this.boundWindowError = null;
      }
      if (this.boundUnhandledRejection) {
        window.removeEventListener('unhandledrejection', this.boundUnhandledRejection);
        this.boundUnhandledRejection = null;
      }
    }

    this.flushAll();
  }
}

export const logger = new AppLogger();
