/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * PWA Hardware & Advanced Capabilities Utility Module
 */

import { logger } from '../core/logger';

export type PwaDisplayMode = 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser' | 'twa';

export interface StorageQuotaEstimate {
  readonly isPersisted: boolean;
  readonly usageBytes: number;
  readonly quotaBytes: number;
  readonly usagePercentage: number;
}

export interface SharePayload {
  readonly title?: string;
  readonly text?: string;
  readonly url?: string;
  readonly files?: readonly File[];
}

export interface ShareResult {
  readonly success: boolean;
  readonly method: 'native' | 'clipboard' | 'legacy_clipboard' | 'cancelled' | 'failed';
  readonly errorMessage?: string;
}

const SAFE_SHARE_PROTOCOLS = new Set(['https:', 'http:']);

/**
 * Validates that a string is a safe, shareable HTTP/HTTPS URL
 */
function isValidShareUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    return SAFE_SHARE_PROTOCOLS.has(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Detect the current display mode under which the application is executing.
 */
export function getPwaDisplayMode(): PwaDisplayMode {
  if (typeof window === 'undefined') return 'browser';

  // 1. Android Trusted Web Activity (TWA) document referrer check
  if (document.referrer.startsWith('android-app://')) {
    return 'twa';
  }

  // 2. iOS Standalone mode
  if ((window.navigator as unknown as { readonly standalone?: boolean }).standalone === true) {
    return 'standalone';
  }

  // 3. W3C Display Mode Media Queries
  if (window.matchMedia('(display-mode: standalone)').matches) return 'standalone';
  if (window.matchMedia('(display-mode: fullscreen)').matches) return 'fullscreen';
  if (window.matchMedia('(display-mode: minimal-ui)').matches) return 'minimal-ui';
  if (window.matchMedia('(display-mode: window-controls-overlay)').matches) return 'standalone';

  return 'browser';
}

/**
 * Detect if the app is currently running in an installed PWA context
 */
export function isPwaStandalone(): boolean {
  const mode = getPwaDisplayMode();
  return mode === 'standalone' || mode === 'fullscreen' || mode === 'minimal-ui' || mode === 'twa';
}

/**
 * Request persistent browser storage with detailed quota observability.
 */
export async function requestPersistentStorage(): Promise<StorageQuotaEstimate> {
  const defaultEstimate: StorageQuotaEstimate = Object.freeze({
    isPersisted: false,
    usageBytes: 0,
    quotaBytes: 0,
    usagePercentage: 0,
  });

  if (typeof window === 'undefined' || !navigator.storage) {
    return defaultEstimate;
  }

  try {
    // 1. Check & Request Persistence
    let isPersisted = false;
    if (typeof navigator.storage.persisted === 'function') {
      isPersisted = await navigator.storage.persisted();
    }

    if (!isPersisted && typeof navigator.storage.persist === 'function') {
      isPersisted = await navigator.storage.persist();
      logger.info('[PWA] Storage persistence grant status:', { isPersisted });
    }

    // 2. Estimate Quota Usage
    let usageBytes = 0;
    let quotaBytes = 0;
    let usagePercentage = 0;

    if (typeof navigator.storage.estimate === 'function') {
      const estimate = await navigator.storage.estimate();
      usageBytes = estimate.usage || 0;
      quotaBytes = estimate.quota || 0;
      usagePercentage = quotaBytes > 0 ? Number(((usageBytes / quotaBytes) * 100).toFixed(2)) : 0;
    }

    return {
      isPersisted,
      usageBytes,
      quotaBytes,
      usagePercentage,
    };
  } catch (error) {
    logger.warn('[PWA] Storage persistence request encountered error:', { error: String(error) });
    return defaultEstimate;
  }
}

/**
 * Set the app badge counter on the app launcher icon (Clamped between 1 and 999).
 */
export async function setAppBadge(count?: number): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('setAppBadge' in navigator)) {
    return false;
  }

  try {
    if (typeof count === 'number' && Number.isFinite(count)) {
      if (count <= 0) {
        await navigator.clearAppBadge();
        return true;
      }
      // Clamped to positive integer threshold
      const safeCount = Math.min(Math.floor(count), 999);
      await navigator.setAppBadge(safeCount);
    } else {
      await navigator.setAppBadge();
    }
    return true;
  } catch (error) {
    logger.debug('[PWA] setAppBadge not permitted or unsupported:', { error: String(error) });
    return false;
  }
}

/**
 * Clear the app launcher icon badge counter.
 */
export async function clearAppBadge(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('clearAppBadge' in navigator)) {
    return false;
  }

  try {
    await navigator.clearAppBadge();
    return true;
  } catch (error) {
    logger.debug('[PWA] clearAppBadge failed:', { error: String(error) });
    return false;
  }
}

/**
 * Legacy copy fallback using textarea for unfocused tabs, older WebViews, or non-secure contexts.
 */
function legacyClipboardCopy(text: string): boolean {
  if (typeof document === 'undefined') return false;

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    textArea.setAttribute('readonly', 'true');
    textArea.setAttribute('aria-hidden', 'true');

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch {
    return false;
  }
}

/**
 * Web Share API (Level 1 & Level 2 with Files) with Multi-Tier Clipboard Fallback.
 */
export async function shareContent(payload: SharePayload): Promise<ShareResult> {
  const currentOrigin = typeof window !== 'undefined' ? window.location.href : '';
  const rawUrl = payload.url || currentOrigin;
  const shareUrl = isValidShareUrl(rawUrl) ? rawUrl : currentOrigin;

  const title = payload.title?.trim() || 'DAN - Darlingan';
  const text = payload.text?.trim() || '';

  const shareData: ShareData = {
    title,
    text: text || undefined,
    url: shareUrl || undefined,
  };

  // Add files for Web Share Level 2 if present and supported
  if (Array.isArray(payload.files) && payload.files.length > 0) {
    shareData.files = payload.files as File[];
  }

  // 1. Attempt Native System Share
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    const canShareData = typeof navigator.canShare === 'function' ? navigator.canShare(shareData) : true;

    if (canShareData) {
      try {
        await navigator.share(shareData);
        return { success: true, method: 'native' };
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          return { success: false, method: 'cancelled' };
        }
        logger.debug('[PWA] Native share declined, falling back to clipboard copy:', { error: String(err) });
      }
    }
  }

  // 2. Prepare text payload for clipboard fallback
  const clipboardPayload = [title, text, shareUrl].filter(Boolean).join('\n');

  // 3. Modern Async Clipboard API
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(clipboardPayload);
      return { success: true, method: 'clipboard' };
    } catch {
      // Modern clipboard failed (e.g. document not focused), fall through to legacy
    }
  }

  // 4. Legacy execCommand Fallback
  if (legacyClipboardCopy(clipboardPayload)) {
    return { success: true, method: 'legacy_clipboard' };
  }

  return {
    success: false,
    method: 'failed',
    errorMessage: 'Device does not support native sharing and clipboard permissions are denied.',
  };
}

/**
 * Triggers safe haptic vibration feedback with reduced-motion accessibility guards.
 */
export function triggerHaptic(pattern: number | readonly number[] = 10): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
    return false;
  }

  // Accessibility Guard: Respect users with motion sensitivities
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return false;
  }

  try {
    const vibrationPattern = typeof pattern === 'number' ? pattern : [...pattern];
    return navigator.vibrate(vibrationPattern);
  } catch {
    return false;
  }
}

/**
 * Screen Wake Lock Manager (Prevents screen sleep during interactive PWA tasks).
 */
export class WakeLockManager {
  private sentinel: unknown = null;

  public async request(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      return false;
    }

    try {
      this.sentinel = await navigator.wakeLock.request('screen');
      return true;
    } catch {
      this.sentinel = null;
      return false;
    }
  }

  public async release(): Promise<void> {
    if (this.sentinel && typeof (this.sentinel as { readonly release: () => Promise<void> }).release === 'function') {
      try {
        await (this.sentinel as { readonly release: () => Promise<void> }).release();
      } catch {
        // Ignore release errors
      } finally {
        this.sentinel = null;
      }
    }
  }

  public isLocked(): boolean {
    return Boolean(this.sentinel);
  }
}

export const wakeLock = new WakeLockManager();
