/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import type { RefObject } from 'react';

interface MediaProtectionOptions {
  /** Disable right-click context menu within the container */
  readonly preventContextMenu?: boolean;
  /** Disable dragging of child media elements */
  readonly preventDrag?: boolean;
  /** Prevent text and element selection */
  readonly preventSelection?: boolean;
}

/**
 * Applies scoped client-side interaction deterrence to a specific container.
 * 
 * NOTE: Client-side event interception does NOT prevent media extraction.
 * Protect sensitive assets using signed URLs, tokenized streams, or DRM.
 */
export function useMediaProtection(
  containerRef: RefObject<HTMLElement | null>,
  enabled: boolean,
  options: MediaProtectionOptions = {}
): void {
  const {
    preventContextMenu = true,
    preventDrag = true,
    preventSelection = true,
  } = options;

  useEffect(() => {
    if (!enabled) return;

    const element = containerRef.current;
    if (!element) return;

    const handleContextMenu = (e: MouseEvent) => {
      if (preventContextMenu) {
        e.preventDefault();
      }
    };

    const handleDragStart = (e: DragEvent) => {
      if (preventDrag) {
        e.preventDefault();
      }
    };

    // Cache previous inline style states for clean restoration
    const previousUserSelect = element.style.userSelect;
    const previousTouchCallout = element.style.getPropertyValue('-webkit-touch-callout');

    if (preventSelection) {
      element.style.userSelect = 'none';
      element.style.setProperty('-webkit-touch-callout', 'none');
    }

    if (preventContextMenu) {
      element.addEventListener('contextmenu', handleContextMenu);
    }
    if (preventDrag) {
      element.addEventListener('dragstart', handleDragStart);
    }

    return () => {
      if (preventContextMenu) {
        element.removeEventListener('contextmenu', handleContextMenu);
      }
      if (preventDrag) {
        element.removeEventListener('dragstart', handleDragStart);
      }

      // Safely restore original inline styles using captured element reference
      element.style.userSelect = previousUserSelect;
      if (previousTouchCallout) {
        element.style.setProperty('-webkit-touch-callout', previousTouchCallout);
      } else {
        element.style.removeProperty('-webkit-touch-callout');
      }
    };
  }, [enabled, containerRef, preventContextMenu, preventDrag, preventSelection]);
}
