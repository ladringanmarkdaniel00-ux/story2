// useDebounce.ts

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export interface DebounceOptions {
  /**
   * Minimum delay in milliseconds before updating debounced value.
   * @default 300
   */
  readonly delayMs?: number;

  /**
   * If true, updates the debounced value on the leading edge (immediately on the first event).
   * @default false
   */
  readonly leading?: boolean;

  /**
   * The maximum time `value` is allowed to be delayed before it's forcibly updated.
   * Prevents starvation during prolonged typing.
   */
  readonly maxWaitMs?: number;
}

export interface DebouncedStateControls {
  /**
   * Immediately updates the debounced value to the current source value.
   * Useful when submitting a form on "Enter" without waiting for the delay.
   */
  readonly flush: () => void;

  /**
   * Cancels any pending scheduled updates.
   */
  readonly cancel: () => void;

  /**
   * Indicates if a debounce timer is currently in flight.
   */
  readonly isPending: boolean;
}

const MAX_SAFE_TIMEOUT = 2147483647; // 2^31 - 1 (Max 32-bit signed integer for setTimeout)

/**
 * Normalizes and clamps timeout milliseconds to safe integer ranges.
 */
function sanitizeDelay(delay?: unknown, fallback = 300): number {
  if (typeof delay !== 'number' || !Number.isFinite(delay) || Number.isNaN(delay)) {
    return fallback;
  }
  return Math.min(Math.max(0, Math.floor(delay)), MAX_SAFE_TIMEOUT);
}

/**
 * Advanced debounced state hook with imperative controls, starvation protection, and leading edge support.
 */
export function useDebouncedState<T>(
  value: T,
  options: DebounceOptions | number = 300
): readonly [T, DebouncedStateControls] {
  const config = typeof options === 'number' ? { delayMs: options } : options;
  const delay = sanitizeDelay(config.delayMs, 300);
  const leading = Boolean(config.leading);
  const maxWait = config.maxWaitMs !== undefined ? sanitizeDelay(config.maxWaitMs, 0) : undefined;

  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const [isPending, setIsPending] = useState<boolean>(false);

  const valueRef = useRef<T>(value);
  valueRef.current = value;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxWaitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leadingExecutedRef = useRef<boolean>(false);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (maxWaitTimerRef.current) {
      clearTimeout(maxWaitTimerRef.current);
      maxWaitTimerRef.current = null;
    }
    leadingExecutedRef.current = false;
    setIsPending(false);
  }, []);

  const flush = useCallback(() => {
    cancel();
    setDebouncedValue((prev) => (Object.is(prev, valueRef.current) ? prev : valueRef.current));
  }, [cancel]);

  useEffect(() => {
    // Zero delay optimization: bypass asynchronous timer scheduling
    if (delay === 0) {
      setDebouncedValue((prev) => (Object.is(prev, value) ? prev : value));
      setIsPending(false);
      return;
    }

    // Do nothing if incoming value matches current debounced state
    if (Object.is(debouncedValue, value) && !isPending) {
      return;
    }

    setIsPending(true);

    // 1. Leading Edge Execution
    if (leading && !leadingExecutedRef.current) {
      leadingExecutedRef.current = true;
      setDebouncedValue(value);
      setIsPending(false);
      return;
    }

    // 2. Clear Existing Trailing Timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // 3. Trailing Edge Scheduler
    timerRef.current = setTimeout(() => {
      cancel();
      setDebouncedValue((prev) => (Object.is(prev, valueRef.current) ? prev : valueRef.current));
    }, delay);

    // 4. MaxWait Starvation Ceiling Scheduler
    if (maxWait !== undefined && maxWait > 0 && !maxWaitTimerRef.current) {
      maxWaitTimerRef.current = setTimeout(() => {
        cancel();
        setDebouncedValue((prev) => (Object.is(prev, valueRef.current) ? prev : valueRef.current));
      }, maxWait);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
    // BUG FIX: Removed 'debouncedValue' and 'isPending' from dependencies to prevent infinite re-render loops.
  }, [value, delay, leading, maxWait, cancel]);

  // Complete cleanup on unmount
  useEffect(() => {
    return () => cancel();
  }, [cancel]);

  const controls: DebouncedStateControls = {
    flush,
    cancel,
    isPending,
  };

  return [debouncedValue, controls] as const;
}

/**
 * Standard debounce hook (100% backward compatible drop-in replacement).
 *
 * @param value The value to debounce.
 * @param optionsOrDelay Delay in milliseconds or full debounce configuration object.
 * @returns The debounced value.
 */
export function useDebounce<T>(value: T, optionsOrDelay: number | DebounceOptions = 300): T {
  const [debounced] = useDebouncedState(value, optionsOrDelay);
  return debounced;
}
