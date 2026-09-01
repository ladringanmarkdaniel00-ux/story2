/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AnalyticsTracker } from './analytics';

describe('AnalyticsTracker', () => {
  let tracker: AnalyticsTracker;
  let beaconMock: ReturnType<typeof vi.fn>;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();

    beaconMock = vi.fn().mockReturnValue(true);
    fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });

    Object.defineProperty(navigator, 'sendBeacon', {
      value: beaconMock,
      writable: true,
      configurable: true,
    });

    global.fetch = fetchMock as unknown as typeof fetch;
    localStorage.clear();
  });

  afterEach(() => {
    if (tracker) tracker.destroy();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('scrubs emails, credit card numbers, phone numbers, and sensitive keys from payload', async () => {
    tracker = new AnalyticsTracker({ endpoint: '/api/telemetry', batchSize: 1 });

    const rawProps = {
      email: 'john.doe@example.com',
      textMessage: 'Call me at +1 (555) 234-5678 or charge 4532-1234-5678-9012',
      password: 'super-secret-password',
      normalProp: 'checkout_click',
    };

    tracker.track('button_clicked', rawProps);
    tracker.flush();

    expect(beaconMock).toHaveBeenCalledTimes(1);

    const blob = beaconMock.mock.calls[0][1] as Blob;
    expect(blob.type.toLowerCase()).toBe('text/plain;charset=utf-8');

    // Read payload from Blob using clean async/await
    const text = await blob.text();
    const parsed = JSON.parse(text);
    const props = parsed.events[0].properties;

    expect(props.email).toBe('[REDACTED_EMAIL]');
    expect(props.password).toBe('[REDACTED_PII]');
    expect(props.textMessage).toContain('[REDACTED_PHONE]');
    expect(props.textMessage).toContain('[REDACTED_CARD]');
    expect(props.normalProp).toBe('checkout_click');
  });

  it('handles circular references and DOM nodes gracefully without throwing', async () => {
    tracker = new AnalyticsTracker({ batchSize: 1 });

    const circularObj: Record<string, unknown> = { key: 'value' };
    circularObj.self = circularObj;

    const domElement = document.createElement('button');

    expect(() => {
      tracker.track('interaction', {
        circular: circularObj,
        element: domElement,
      });
      tracker.flush();
    }).not.toThrow();

    expect(beaconMock).toHaveBeenCalledTimes(1);
    const blob = beaconMock.mock.calls[0][1] as Blob;
    const text = await blob.text();
    const parsed = JSON.parse(text);
    const props = parsed.events[0].properties;

    expect(props.circular.self).toBe('[CIRCULAR_REF]');
    expect(props.element).toBe('[DOM_ELEMENT]');
  });

  it('splits batches when total serialized size exceeds maxBatchBytes', async () => {
    // Restrict batch size to 300 bytes
    tracker = new AnalyticsTracker({ maxBatchBytes: 300, batchSize: 10 });

    const largePayload = { text: 'A'.repeat(120) };

    tracker.track('event_1', largePayload);
    tracker.track('event_2', largePayload);
    tracker.track('event_3', largePayload);

    // Initial flush should only capture what fits within 300 bytes
    tracker.flush();

    expect(beaconMock).toHaveBeenCalledTimes(1);

    const blob = beaconMock.mock.calls[0][1] as Blob;
    const text = await blob.text();
    const parsed = JSON.parse(text);
    expect(parsed.events.length).toBeLessThan(3);
  });

  it('honors Global Privacy Control (GPC) and Do Not Track (DNT)', () => {
    Object.defineProperty(navigator, 'globalPrivacyControl', {
      value: true,
      configurable: true,
    });

    tracker = new AnalyticsTracker();
    expect(tracker.isOptedOut()).toBe(true);

    tracker.track('should_be_ignored', { test: true });
    tracker.flush();

    expect(beaconMock).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();

    Object.defineProperty(navigator, 'globalPrivacyControl', {
      value: undefined,
      configurable: true,
    });
  });

  it('falls back to keepalive fetch when navigator.sendBeacon returns false', async () => {
    beaconMock.mockReturnValue(false); // Simulate beacon buffer quota exhaustion

    tracker = new AnalyticsTracker({ batchSize: 1 });
    tracker.track('quota_fallback', { status: 'retry' });
    tracker.flush();

    expect(beaconMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/analytics/events',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
      })
    );
  });

  it('drains the entire remaining queue on destroy()', () => {
    tracker = new AnalyticsTracker({ batchSize: 2 });

    tracker.track('event_1');
    tracker.track('event_2');
    tracker.track('event_3');
    tracker.track('event_4');
    tracker.track('event_5');

    tracker.destroy();

    // With 5 items and batchSize: 2, flushAll will trigger 3 dispatches
    expect(beaconMock).toHaveBeenCalledTimes(3);
  });
});
