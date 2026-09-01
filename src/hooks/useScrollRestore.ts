/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, type RefObject } from 'react';
import { useLocation, useNavigationType, NavigationType } from 'react-router-dom';

export interface ScrollRestoreProps {
  /** Target scrollable container. If omitted, window is scrolled. */
  readonly containerRef?: RefObject<HTMLElement | null>;
  /** Scroll behavior when jumping to top or anchors (Default: 'instant') */
  readonly behavior?: ScrollBehavior;
  /** Whether to scroll to matching #hash element IDs (Default: true) */
  readonly enableHashScroll?: boolean;
  /** Element to receive focus on route navigation for screen readers (Default: undefined) */
  readonly focusTargetRef?: RefObject<HTMLElement | null>;
}

/**
 * Manages scroll restoration across client-side route transitions,
 * supporting hash navigation, browser back/forward history, and accessibility focus.
 */
export function ScrollRestore({
  containerRef,
  behavior = 'instant',
  enableHashScroll = true,
  focusTargetRef,
}: ScrollRestoreProps = {}): null {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();
  const isFirstRender = useRef(true);

  // Set browser scroll restoration to manual to avoid competing transitions
  useEffect(() => {
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      const prevRestoration = window.history.scrollRestoration;
      window.history.scrollRestoration = 'manual';

      return () => {
        window.history.scrollRestoration = prevRestoration;
      };
    }
  }, []);

  useEffect(() => {
    // Skip scroll adjustments on initial SSR hydration / page load
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Preserve scroll position on Back/Forward (POP) navigation if no hash is present
    if (navigationType === NavigationType.Pop && !hash) {
      return;
    }

    const targetContainer = containerRef?.current ?? window;

    // Handle in-page anchor links (e.g., /page#section-id) with asynchronous retry support
    if (enableHashScroll && hash) {
      const elementId = decodeURIComponent(hash.replace('#', ''));
      
      let attempts = 0;
      const maxAttempts = 5; // Guard against infinite polling loops

      const attemptHashScroll = () => {
        const targetElement = document.getElementById(elementId);
        if (targetElement) {
          targetElement.scrollIntoView({ behavior });
          targetElement.focus({ preventScroll: true });
          return;
        }

        // Retry if element hasn't mounted yet (e.g., async data loading or skeleton transition)
        if (attempts < maxAttempts) {
          attempts++;
          requestAnimationFrame(attemptHashScroll);
        }
      };

      requestAnimationFrame(attemptHashScroll);
      return;
    }

    // Reset scroll to top-left for PUSH and REPLACE navigations
    if ('scrollTo' in targetContainer) {
      targetContainer.scrollTo({
        top: 0,
        left: 0,
        behavior,
      });
    } else if (containerRef?.current) {
      containerRef.current.scrollTop = 0;
      containerRef.current.scrollLeft = 0;
    }

    // Shift accessibility focus to target or main content area (WCAG 2.4.3)
    if (focusTargetRef?.current) {
      focusTargetRef.current.focus({ preventScroll: true });
    }
  }, [pathname, hash, navigationType, containerRef, behavior, enableHashScroll, focusTargetRef]);

  return null;
}

