/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useNetworkStatus, networkManager } from './useNetworkStatus';

describe('useNetworkStatus', () => {
  beforeEach(() => {
    networkManager.init();
    vi.useFakeTimers();
    // Default fetch mock to 200 OK
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
  });

  afterEach(() => {
    networkManager.destroy();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('initializes with navigator online state and no hydration mismatch', () => {
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isOnline).toBe(true);
    expect(result.current.isNavigatorOnline).toBe(true);
    expect(result.current.wasOffline).toBe(false);
    expect(result.current.isChecking).toBe(false);
  });

  it('updates state immediately on window offline event', () => {
    const { result } = renderHook(() => useNetworkStatus());

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current.isOnline).toBe(false);
    expect(result.current.isNavigatorOnline).toBe(false);
    expect(result.current.wasOffline).toBe(true);
  });

  it('probes connectivity when transitioning from offline to online', async () => {
    const { result } = renderHook(() =>
      useNetworkStatus({ pingUrl: '/api/health', pingOnOnline: true })
    );

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current.isOnline).toBe(false);

    await act(async () => {
      window.dispatchEvent(new Event('online'));
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/health',
      expect.objectContaining({ method: 'HEAD', cache: 'no-store' })
    );
    expect(result.current.isOnline).toBe(true);
  });

  it('deduplicates simultaneous in-flight checkConnection calls across multiple components', async () => {
    const { result: hook1 } = renderHook(() => useNetworkStatus());
    const { result: hook2 } = renderHook(() => useNetworkStatus());

    let resolveFetch!: (val: any) => void;
    (global.fetch as any).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        })
    );

    let p1!: Promise<boolean>;
    let p2!: Promise<boolean>;

    act(() => {
      p1 = hook1.current.checkConnection();
      p2 = hook2.current.checkConnection();
    });

    expect(hook1.current.isChecking).toBe(true);
    expect(hook2.current.isChecking).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFetch({ ok: true, status: 200 });
      await Promise.all([p1, p2]);
    });

    expect(hook1.current.isChecking).toBe(false);
    expect(hook2.current.isChecking).toBe(false);
    expect(hook1.current.isOnline).toBe(true);
  });

  it('reconciles background polling interval across subscribers', async () => {
    renderHook(() => useNetworkStatus({ pollIntervalMs: 5000 }));
    renderHook(() => useNetworkStatus({ pollIntervalMs: 2000 }));

    expect(global.fetch).not.toHaveBeenCalled();

    // Use advanceTimersByTimeAsync to correctly drain microtasks triggered by async interval timers
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
