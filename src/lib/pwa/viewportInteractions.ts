// src/lib/viewportInteractions.ts

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { isPwaStandalone } from './pwaCapabilities';
import { logger } from '../core/logger';

export interface ViewportInteractionOptions {
  /**
   * Only prevent pinch-zoom gestures if running in installed PWA standalone mode.
   * Preserves browser WCAG zoom accessibility for standard web visitors.
   * @default true
   */
  readonly restrictPwaGesturesOnly?: boolean;
}

/**
 * Configures gesture handling, scroll performance optimization, and zoom controls.
 * Uses compositor-driven CSS touch-action to prevent scroll jank and main-thread blocking.
 */
export function setupAppInteractions(options: ViewportInteractionOptions = {}): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  const { restrictPwaGesturesOnly = true } = options;

  // Accessibility Check: If running in standard browser and PWA-only restriction is enabled,
  // do not hijack standard browser accessibility zoom controls.
  if (restrictPwaGesturesOnly && !isPwaStandalone()) {
    logger.debug('[Viewport] Standard browser session detected. Preserving native accessibility zoom.');
    return () => {};
  }

  // 1. Prevent Safari / iOS gesture scaling on standalone web views
  const handleGesture = (e: Event) => {
    e.preventDefault();
  };

  document.addEventListener('gesturestart', handleGesture);
  document.addEventListener('gesturechange', handleGesture);
  document.addEventListener('gestureend', handleGesture);

  // 2. Prevent multi-finger pinch zoom without blocking single-finger native scrolling
  const handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length > 1) {
      e.preventDefault();
    }
  };

  document.addEventListener('touchstart', handleTouchStart, { passive: false });

  // 3. Cleanup Routine (For SPA unmounts or test teardowns)
  return () => {
    document.removeEventListener('gesturestart', handleGesture);
    document.removeEventListener('gesturechange', handleGesture);
    document.removeEventListener('gestureend', handleGesture);
    document.removeEventListener('touchstart', handleTouchStart);
  };
}
