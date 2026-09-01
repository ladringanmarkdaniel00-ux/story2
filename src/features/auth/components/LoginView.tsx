/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  type FormEvent,
  type ChangeEvent,
} from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2, Eye, EyeOff, WifiOff } from 'lucide-react';
import { supabase } from "../../../lib/supabase/client";
import { z } from 'zod';

// ============================================================================
// 1. RUNTIME SCHEMAS & IMMUTABLE TYPE CONTRACTS
// ============================================================================

export const LoginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email address is required.')
    .max(254, 'Email address exceeds maximum length.')
    .email('Please enter a valid email address.')
    .toLowerCase(),
  password: z
    .string()
    .min(1, 'Password is required.')
    .max(128, 'Password exceeds maximum length.'),
});

export type LoginFormData = Readonly<z.infer<typeof LoginSchema>>;

export interface FormFieldErrors {
  readonly email?: string;
  readonly password?: string;
}

// ============================================================================
// 2. PRIVACY-COMPLIANT TELEMETRY & LOGGING (ZERO PII LEAKAGE)
// ============================================================================

function maskEmail(email: string): string {
  const parts = email.split('@');
  if (parts.length !== 2) return '***';
  const [name, domain] = parts;
  const maskedName =
    name.length > 2
      ? `\${name[0]}***\${name[name.length - 1]}`
      : `\${name[0] ?? ''}***`;
  return `\${maskedName}@\${domain}`;
}

interface AuthLogPayload {
  readonly action: string;
  readonly maskedEmail?: string;
  readonly requestId: string;
  readonly message: string;
  readonly level: 'info' | 'warn' | 'error';
  readonly details?: Record<string, unknown>;
}

function logAuthTelemetry(payload: AuthLogPayload): void {
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
// 3. MAIN LOGIN COMPONENT
// ============================================================================

export function LoginView(): React.JSX.Element {
  const navigate = useNavigate();

  // Form State
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  const [fieldErrors, setFieldErrors] = useState<FormFieldErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Lifecycles & DOM Refs
  const isMountedRef = useRef<boolean>(true);
  const isSubmittingRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Connectivity Listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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

  // Controlled Input Handler with Dynamic Error Reset
  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Reset specific field error on active editing
    setFieldErrors((prev) =>
      prev[name as keyof FormFieldErrors] ? { ...prev, [name]: undefined } : prev
    );
    setGeneralError(null);
  }, []);

  // Submit Handler
  const handleLogin = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    // Guard against duplicate in-flight submissions
    if (isSubmittingRef.current || loading) return;

    if (!isOnline) {
      setGeneralError('You are currently offline. Please reconnect to continue.');
      return;
    }

    // 1. Client-Side Runtime Schema Validation
    const validationResult = LoginSchema.safeParse(formData);
    if (!validationResult.success) {
      const flattened = validationResult.error.flatten().fieldErrors;
      const formattedErrors: FormFieldErrors = {
        email: flattened.email?.[0],
        password: flattened.password?.[0],
      };
      setFieldErrors(formattedErrors);

      // Auto-focus the first invalid field for WCAG keyboard accessibility
      if (formattedErrors.email) {
        emailInputRef.current?.focus();
      } else if (formattedErrors.password) {
        passwordInputRef.current?.focus();
      }
      return;
    }

    const { email, password } = validationResult.data;
    const requestId = generateTraceId();

    setLoading(true);
    isSubmittingRef.current = true;
    setGeneralError(null);
    setFieldErrors({});

    // 2. AbortController with 15-Second Timeout
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 15_000);

    logAuthTelemetry({
      action: 'LOGIN_ATTEMPT',
      maskedEmail: maskEmail(email),
      requestId,
      level: 'info',
      message: 'Authentication request initiated',
    });

    try {
      // Asynchronous authentication handshake simulation / API call
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }
      
      if (!data.user) {
        throw new Error('Authentication failed. Please verify your email.');
      }
      
      if (!isMountedRef.current || controller.signal.aborted) return;

      logAuthTelemetry({
        action: 'LOGIN_SUCCESS',
        maskedEmail: maskEmail(email),
        requestId,
        level: 'info',
        message: 'User authenticated successfully',
      });

      navigate('/', { replace: true });
    } catch (err: unknown) {
      if (!isMountedRef.current) return;

      if (err instanceof DOMException && err.name === 'AbortError') {
        logAuthTelemetry({
          action: 'LOGIN_ABORTED',
          maskedEmail: maskEmail(email),
          requestId,
          level: 'warn',
          message: 'Authentication request cancelled or timed out',
        });
        setGeneralError('The request timed out. Please check your connection and try again.');
        return;
      }

      const message = err instanceof Error ? err.message : 'Invalid email or password.';
      logAuthTelemetry({
        action: 'LOGIN_FAILED',
        maskedEmail: maskEmail(email),
        requestId,
        level: 'error',
        message,
      });

      setGeneralError(message);
    } finally {
      clearTimeout(timeoutId);
      abortControllerRef.current = null;
      if (isMountedRef.current) {
        setLoading(false);
        isSubmittingRef.current = false;
      }
    }
  };

  return (
    <main className="min-h-[100svh] w-full flex items-center justify-center bg-white p-4">
      <div className="w-full max-w-[18rem] sm:max-w-xs flex flex-col gap-4">
        <h1 className="text-xl font-bold tracking-tight text-center text-neutral-900">Sign In</h1>

        {/* Offline Banner with Layout Shift Protection */}
        <div className="min-h-[34px] flex items-center">
          {!isOnline && (
            <div
              role="status"
              aria-live="polite"
              className="w-full bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded text-[11px] text-amber-800 flex items-center gap-1.5"
            >
              <WifiOff className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>You are offline. Reconnecting...</span>
            </div>
          )}
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-3.5" noValidate aria-busy={loading}>
          {/* Global Alert Region with Fixed Height to Prevent CLS */}
          <div className="min-h-[20px] flex items-center justify-center">
            {generalError && (
              <div
                id="general-error"
                role="alert"
                aria-live="assertive"
                className="text-xs text-rose-600 text-center font-medium tracking-wide"
              >
                {generalError}
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
              ref={emailInputRef}
              id="email"
              name="email"
              type="email"
              inputMode="email"
              placeholder="name@example.com"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck="false"
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? 'email-error' : undefined}
              className="w-full border-b border-black rounded-none px-1 py-1.5 text-xs md:text-sm bg-transparent placeholder-neutral-400 transition-colors focus:outline-none focus-visible:border-neutral-500 focus-visible:ring-1 focus-visible:ring-black disabled:opacity-50"
              required
            />
            {fieldErrors.email && (
              <span id="email-error" role="alert" className="text-[11px] text-rose-600 font-medium mt-0.5">
                {fieldErrors.email}
              </span>
            )}
          </div>

          {/* Password Input Field with Visibility Toggle */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="password"
              className="text-[11px] font-semibold tracking-wider text-neutral-600 uppercase"
            >
              Password
            </label>
            <div className="relative flex items-center">
              <input
                ref={passwordInputRef}
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password"
                autoComplete="current-password"
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                className="w-full border-b border-black rounded-none px-1 py-1.5 text-xs md:text-sm bg-transparent placeholder-neutral-400 transition-colors focus:outline-none focus-visible:border-neutral-500 focus-visible:ring-1 focus-visible:ring-black disabled:opacity-50 pr-8"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password text' : 'Show password text'}
                aria-pressed={showPassword}
                disabled={loading}
                className="absolute right-1 text-neutral-400 hover:text-black transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-black rounded p-0.5"
              >
                {showPassword ? (
                  <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                ) : (
                  <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                )}
              </button>
            </div>
            {fieldErrors.password && (
              <span id="password-error" role="alert" className="text-[11px] text-rose-600 font-medium mt-0.5">
                {fieldErrors.password}
              </span>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !isOnline}
            className="w-full bg-black text-white rounded-none px-4 py-2.5 text-[10px] sm:text-xs font-semibold tracking-[0.2em] uppercase hover:bg-neutral-800 disabled:bg-neutral-300 transition-colors mt-3 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                <span>Authenticating...</span>
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Semantic Navigation Footer */}
        <nav
          aria-label="Authentication Links"
          className="flex items-center justify-between pt-3 border-t border-neutral-100 text-[10px] uppercase font-medium tracking-widest text-neutral-500"
        >
          <Link
            to="/signup"
            className="hover:text-black transition-colors focus:outline-none focus-visible:underline focus-visible:text-black"
          >
            Create Account
          </Link>
          <Link
            to="/forgot-password"
            className="hover:text-black transition-colors focus:outline-none focus-visible:underline focus-visible:text-black"
          >
            Forgot Password?
          </Link>
        </nav>
      </div>
    </main>
  );
}

export default LoginView;
