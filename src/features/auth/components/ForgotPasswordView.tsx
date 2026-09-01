/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2, ArrowLeft } from 'lucide-react';
import { z } from 'zod';

// ============================================================================
// 1. RUNTIME SCHEMAS & IMMUTABLE TYPE CONTRACTS
// ============================================================================

export const ForgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email address is required.')
    .max(254, 'Email address exceeds maximum length.')
    .email('Please enter a valid email address.')
    .toLowerCase(),
});

export type ForgotPasswordFormData = Readonly<z.infer<typeof ForgotPasswordSchema>>;

// ============================================================================
// 2. PRIVACY-COMPLIANT TELEMETRY UTILITIES
// ============================================================================

function maskEmail(email: string): string {
  const parts = email.split('@');
  if (parts.length !== 2) return '***';
  const [name, domain] = parts;
  const maskedName =
    name.length > 2
      ? `${name[0]}***${name[name.length - 1]}`
      : `${name[0] ?? ''}***`;
  return `${maskedName}@${domain}`;
}

interface ForgotPasswordLogPayload {
  readonly action: string;
  readonly maskedEmail?: string;
  readonly requestId: string;
  readonly message: string;
  readonly level: 'info' | 'warn' | 'error';
}

function logTelemetry(payload: ForgotPasswordLogPayload): void {
  if (process.env.NODE_ENV !== 'production') {
    const entry = {
      ...payload,
      timestamp: new Date().toISOString(),
    };
    if (payload.level === 'error') {
      console.error(JSON.stringify(entry));
    } else if (payload.level === 'warn') {
      console.warn(JSON.stringify(entry));
    } else {
      console.log(JSON.stringify(entry));
    }
  }
}

function generateTraceId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ============================================================================
// 3. MAIN COMPONENT IMPLEMENTATION
// ============================================================================

export function ForgotPasswordView(): React.JSX.Element {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const isMountedRef = useRef<boolean>(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Safe Lifecycle Cleanup on Unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleSubmit = useCallback(async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (loading) return;

    const validation = ForgotPasswordSchema.safeParse({ email });
    if (!validation.success) {
      setError(validation.error.flatten().fieldErrors.email?.[0] || 'Invalid email.');
      inputRef.current?.focus();
      return;
    }

    const cleanEmail = validation.data.email;
    const requestId = generateTraceId();

    setLoading(true);
    setError(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 15_000);

    logTelemetry({
      action: 'PASSWORD_RESET_INITIATED',
      maskedEmail: maskEmail(cleanEmail),
      requestId,
      level: 'info',
      message: 'Password reset link requested',
    });

    try {
      await new Promise<void>((resolve, reject) => {
        const onAbort = () => {
          clearTimeout(timer);
          reject(new DOMException('Request aborted or timed out', 'AbortError'));
        };
        const timer = setTimeout(() => {
          controller.signal.removeEventListener('abort', onAbort);
          resolve();
        }, 1500);
        controller.signal.addEventListener('abort', onAbort, { once: true });
      });

      if (!isMountedRef.current || controller.signal.aborted) return;

      logTelemetry({
        action: 'PASSWORD_RESET_SUCCESS',
        maskedEmail: maskEmail(cleanEmail),
        requestId,
        level: 'info',
        message: 'Password reset link sent successfully',
      });

      setSuccess(true);
    } catch (err: unknown) {
      if (!isMountedRef.current) return;

      if (err instanceof DOMException && err.name === 'AbortError') {
        logTelemetry({
          action: 'PASSWORD_RESET_ABORTED',
          maskedEmail: maskEmail(cleanEmail),
          requestId,
          level: 'warn',
          message: 'Password reset request timed out or cancelled',
        });
        setError('The request timed out. Please try again.');
        return;
      }

      const message = err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.';
      logTelemetry({
        action: 'PASSWORD_RESET_FAILED',
        maskedEmail: maskEmail(cleanEmail),
        requestId,
        level: 'error',
        message,
      });

      setError(message);
    } finally {
      clearTimeout(timeoutId);
      abortControllerRef.current = null;
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [email, loading]);

  return (
    <main className="min-h-[100svh] w-full flex items-center justify-center bg-white p-4">
      <div className="w-full max-w-[18rem] sm:max-w-xs flex flex-col gap-4">
        <h1 className="text-xl font-bold tracking-tight text-center text-neutral-900">Reset Password</h1>
        
        {success ? (
          <div className="flex flex-col gap-4 text-center">
            <p className="text-xs text-neutral-600 font-medium">
              If an account exists for <span className="text-black">{email}</span>, you will receive a password reset link shortly.
            </p>
            <Link
              to="/login"
              className="w-full bg-black text-white rounded-none px-4 py-2.5 text-[10px] sm:text-xs font-semibold tracking-[0.2em] uppercase hover:bg-neutral-800 transition-colors mt-3 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
            >
              Return to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5" noValidate aria-busy={loading}>
            {/* Global Alert Region with Fixed Height to Prevent CLS */}
            <div className="min-h-[20px] flex items-center justify-center">
              {error && (
                <div
                  id="general-error"
                  role="alert"
                  aria-live="assertive"
                  className="text-xs text-rose-600 text-center font-medium tracking-wide"
                >
                  {error}
                </div>
              )}
            </div>
            
            {/* Email Input Field */}
            <div className="flex flex-col gap-1">
              <label
                htmlFor="email"
                className="text-[11px] font-semibold tracking-wider text-neutral-600 uppercase"
              >
                Email Address
              </label>
              <input
                ref={inputRef}
                id="email"
                name="email"
                type="email"
                inputMode="email"
                placeholder="name@example.com"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck="false"
                required
                disabled={loading}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                className="w-full border-b border-black rounded-none px-1 py-1.5 text-xs md:text-sm bg-transparent placeholder-neutral-400 transition-colors focus:outline-none focus-visible:border-neutral-500 focus-visible:ring-1 focus-visible:ring-black disabled:opacity-50"
                aria-invalid={!!error}
                aria-describedby={error ? 'general-error' : undefined}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full bg-black text-white rounded-none px-4 py-2.5 text-[10px] sm:text-xs font-semibold tracking-[0.2em] uppercase hover:bg-neutral-800 disabled:bg-neutral-300 transition-colors mt-3 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                  <span>Sending...</span>
                </>
              ) : (
                'Send Link'
              )}
            </button>
          </form>
        )}

        {/* Semantic Navigation Footer */}
        <nav
          aria-label="Authentication Links"
          className="flex items-center justify-center pt-3 border-t border-neutral-100 text-[10px] uppercase font-medium tracking-widest text-neutral-500"
        >
          <Link
            to="/login"
            className="hover:text-black transition-colors focus:outline-none focus-visible:underline focus-visible:text-black"
          >
            Back to Sign In
          </Link>
        </nav>
      </div>
    </main>
  );
}

export default ForgotPasswordView;
