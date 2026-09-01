/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]:not([tabindex="-1"])',
  'area[href]:not([tabindex="-1"])',
  'input:not([disabled]):not([type="hidden"]):not([aria-hidden="true"])',
  'select:not([disabled]):not([aria-hidden="true"])',
  'textarea:not([disabled]):not([aria-hidden="true"])',
  'button:not([disabled]):not([aria-hidden="true"])',
  'iframe:not([tabindex="-1"])',
  '[contenteditable]:not([tabindex="-1"])',
  '[tabindex]:not([tabindex="-1"]):not([disabled]):not([aria-hidden="true"])',
].join(', ');

export interface UseFocusTrapOptions {
  /** Callback fired when the user presses the Escape key */
  onEscape?: () => void;
  /** Explicit element to receive focus on activation */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Restore focus to the trigger element when the trap deactivates (Default: true) */
  restoreFocus?: boolean;
}

/**
 * Traps keyboard focus within an active dialog/modal container and restores focus on close.
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  isActive: boolean,
  options: UseFocusTrapOptions = {}
) {
  const { onEscape, initialFocusRef, restoreFocus = true } = options;

  // Preserve stable reference to callbacks to prevent effect churn
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  const previousActiveElement = useRef<HTMLElement | null>(null);

  const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
    const rawElements = Array.from(
      container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    );

    // Filter out visually hidden / zero-dimension elements
    return rawElements.filter(
      (el) =>
        el.offsetWidth > 0 ||
        el.offsetHeight > 0 ||
        el.getClientRects().length > 0
    );
  };

  useEffect(() => {
    if (!isActive) return;

    // Track triggering element before trapping focus
    previousActiveElement.current = document.activeElement as HTMLElement | null;

    const container = containerRef.current;
    if (!container) return;

    let modifiedTabIndex = false;

    // Schedule initial focus after paint
    const frameId = requestAnimationFrame(() => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
        return;
      }

      const focusable = getFocusableElements(container);
      if (focusable.length > 0) {
        focusable[0].focus();
      } else {
        // Fallback to container focus if no interactive elements exist
        if (!container.hasAttribute('tabindex')) {
          container.setAttribute('tabindex', '-1');
          modifiedTabIndex = true;
        }
        container.focus();
      }
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (onEscapeRef.current) {
          e.preventDefault();
          e.stopPropagation();
          onEscapeRef.current();
        }
        return;
      }

      if (e.key !== 'Tab') return;

      const focusable = getFocusableElements(container);
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }

      const firstElement = focusable[0];
      const lastElement = focusable[focusable.length - 1];
      const activeElement = document.activeElement as HTMLElement | null;

      // Wrap focus if boundary reached or if focus escaped container
      if (e.shiftKey) {
        if (activeElement === firstElement || !container.contains(activeElement)) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (activeElement === lastElement || !container.contains(activeElement)) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      cancelAnimationFrame(frameId);
      document.removeEventListener('keydown', handleKeyDown);

      // Clean up injected tabindex fallback if applied
      if (modifiedTabIndex && container) {
        container.removeAttribute('tabindex');
      }

      if (restoreFocus && previousActiveElement.current) {
        // Only focus if the trigger is still connected to the DOM
        if (document.body.contains(previousActiveElement.current)) {
          previousActiveElement.current.focus();
        }
      }
    };
  }, [isActive, containerRef, initialFocusRef, restoreFocus]);
}
