/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * PWA Hardware & Advanced Capabilities Utility Module
 */

import { logger } from './logger';

/**
 * Detect if the app is currently running in PWA standalone or fullscreen mode
 */
export function isPwaStandalone(): boolean {
  if (typeof window === 'undefined') return false;

  const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
  const isFullscreenMedia = window.matchMedia('(display-mode: fullscreen)').matches;
  const isMinimalMedia = window.matchMedia('(display-mode: minimal-ui)').matches;
  const isIosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;

  return isStandaloneMedia || isFullscreenMedia || isMinimalMedia || isIosStandalone;
}

/**
 * Request persistent browser storage so IndexedDB / Cache is exempt from browser eviction
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof window === 'undefined' || !navigator.storage || !navigator.storage.persist) {
    return false;
  }

  try {
    const isPersisted = await navigator.storage.persisted();
    if (!isPersisted) {
      const granted = await navigator.storage.persist();
      logger.info('[PWA] Storage persistence status:', undefined, { granted });
      return granted;
    }
    return true;
  } catch (error) {
    logger.warn('[PWA] Storage persist request failed:', undefined, { error: String(error) });
    return false;
  }
}

/**
 * Set the app badge counter on the app launcher icon (if supported)
 */
export async function setAppBadge(count?: number): Promise<void> {
  if (typeof navigator === 'undefined' || !('setAppBadge' in navigator)) {
    return;
  }

  try {
    if (typeof count === 'number' && count > 0) {
      await navigator.setAppBadge(count);
    } else {
      await navigator.setAppBadge();
    }
  } catch {
    // Ignore unsupported/denied badge requests
  }
}

/**
 * Clear the app badge counter
 */
export async function clearAppBadge(): Promise<void> {
  if (typeof navigator === 'undefined' || !('clearAppBadge' in navigator)) {
    return;
  }

  try {
    await navigator.clearAppBadge();
  } catch {
    // Ignore clear badge errors
  }
}

/**
 * Web Share API with graceful clipboard copy fallback
 */
export async function shareContent(options: {
  title?: string;
  text?: string;
  url?: string;
}): Promise<{ success: boolean; method: 'native' | 'clipboard' }> {
  const shareUrl = options.url || (typeof window !== 'undefined' ? window.location.href : '');
  const shareData = {
    title: options.title || 'DAN - Darlingan',
    text: options.text || 'Check this out on DAN',
    url: shareUrl,
  };

  if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare?.(shareData)) {
    try {
      await navigator.share(shareData);
      return { success: true, method: 'native' };
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return { success: false, method: 'native' };
      }
    }
  }

  // Fallback to clipboard
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(shareUrl);
      return { success: true, method: 'clipboard' };
    }
  } catch {
    // Ignore clipboard error
  }

  return { success: false, method: 'clipboard' };
}
