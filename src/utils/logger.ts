/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  readonly level: LogLevel;
  readonly message: string;
  readonly timestamp: string;
  readonly requestId?: string;
  readonly context?: Readonly<Record<string, unknown>>;
  readonly error?: Error;
}

// Simple regex-based PII and token sanitizer for log contexts
function sanitizeContext(context?: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> | undefined {
  if (!context) return undefined;
  
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context)) {
    if (typeof value === 'string') {
      // Mask potential bearer tokens, api keys, or emails if passed accidentally in context
      if (key.toLowerCase().includes('token') || key.toLowerCase().includes('key') || key.toLowerCase().includes('auth')) {
        sanitized[key] = '[REDACTED]';
      } else if (value.includes('@') && value.includes('.')) {
        // Basic email masking
        const parts = value.split('@');
        if (parts.length === 2 && parts[0]) {
          sanitized[key] = `${parts[0][0]}***@${parts[1]}`;
        } else {
          sanitized[key] = value;
        }
      } else {
        sanitized[key] = value;
      }
    } else {
      sanitized[key] = value;
    }
  }
  return Object.freeze(sanitized);
}

class AppLogger {
  private readonly isDevelopment =
    typeof process !== 'undefined' ? process.env.NODE_ENV !== 'production' : true;

  private formatEntry(entry: LogEntry): string {
    const tracePart = entry.requestId ? ` [CID:${entry.requestId}]` : '';
    return `[${entry.timestamp}]${tracePart} [${entry.level.toUpperCase()}]: ${entry.message}`;
  }

  debug(message: string, requestId?: string, context?: Readonly<Record<string, unknown>>) {
    if (this.isDevelopment) {
      console.debug(
        this.formatEntry({
          level: 'debug',
          message,
          timestamp: new Date().toISOString(),
          requestId,
          context: sanitizeContext(context),
        })
      );
    }
  }

  info(message: string, requestId?: string, context?: Readonly<Record<string, unknown>>) {
    console.info(
      this.formatEntry({
        level: 'info',
        message,
        timestamp: new Date().toISOString(),
        requestId,
        context: sanitizeContext(context),
      })
    );
  }

  warn(message: string, requestId?: string, context?: Readonly<Record<string, unknown>>) {
    console.warn(
      this.formatEntry({
        level: 'warn',
        message,
        timestamp: new Date().toISOString(),
        requestId,
        context: sanitizeContext(context),
      })
    );
  }

  error(
    message: string,
    error?: Error | unknown,
    requestId?: string,
    context?: Readonly<Record<string, unknown>>
  ) {
    const err = error instanceof Error ? error : undefined;
    console.error(
      this.formatEntry({
        level: 'error',
        message,
        timestamp: new Date().toISOString(),
        requestId,
        context: sanitizeContext(context),
        error: err,
      }),
      error
    );
  }
}

export const logger = new AppLogger();

// Global unhandled error & rejection listeners for APM resilience
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    // Ignore benign ResizeObserver notifications
    if (event.message && event.message.includes('ResizeObserver loop')) {
      return;
    }
    logger.error('Unhandled window error', event.error, undefined, {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    // Ignore benign abort errors and cancelled requests
    const reason = event.reason;
    if (
      reason?.name === 'AbortError' ||
      reason?.message?.includes('aborted') ||
      reason?.message?.includes('cancelled') ||
      reason?.message?.includes('The user aborted a request')
    ) {
      return;
    }

    logger.warn('Unhandled Promise Rejection', undefined, {
      reason: reason instanceof Error ? reason.message : String(reason),
    });
  });
}

export default logger;
