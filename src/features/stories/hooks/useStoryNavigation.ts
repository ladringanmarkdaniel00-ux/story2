/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type TouchEvent,
} from 'react';
import { Story } from '../types';

export interface TouchHandlers {
  readonly onTouchStart: (e: TouchEvent) => void;
  readonly onTouchEnd: (e: TouchEvent) => void;
  readonly onTouchCancel: () => void;
}

export interface UseStoryNavigationReturn {
  safeIndex: number;
  setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;
  handleNext: () => void;
  handlePrev: () => void;
  touchHandlers: TouchHandlers;
}

const SWIPE_THRESHOLD_PX = 45;

export function useStoryNavigation(
  stories: readonly Story[] = []
): UseStoryNavigationReturn {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const touchCoordsRef = useRef<{ x: number; y: number } | null>(null);

  // Clamp index within current valid boundaries
  const safeIndex =
    stories.length > 0
      ? Math.min(Math.max(0, currentIndex), stories.length - 1)
      : 0;

  // Auto-correct active index when story collection size changes
  useEffect(() => {
    if (stories.length === 0) {
      setCurrentIndex(0);
    } else if (currentIndex >= stories.length) {
      setCurrentIndex(stories.length - 1);
    }
  }, [stories.length, currentIndex]);

  const handleNext = useCallback(() => {
    if (stories.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1 < stories.length ? prev + 1 : 0));
  }, [stories.length]);

  const handlePrev = useCallback(() => {
    if (stories.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 >= 0 ? prev - 1 : stories.length - 1));
  }, [stories.length]);

  // Keyboard navigation controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        activeEl instanceof HTMLSelectElement ||
        (activeEl as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      if (stories.length <= 1) return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stories.length, handleNext, handlePrev]);

  // Touch gesture handlers
  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    if (touch) {
      touchCoordsRef.current = { x: touch.clientX, y: touch.clientY };
    }
  }, []);

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!touchCoordsRef.current) return;

      const touch = e.changedTouches[0];
      if (!touch) {
        touchCoordsRef.current = null;
        return;
      }

      const diffX = touch.clientX - touchCoordsRef.current.x;
      const diffY = touch.clientY - touchCoordsRef.current.y;

      // Only trigger if horizontal swipe is dominant over vertical scroll
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > SWIPE_THRESHOLD_PX) {
        if (diffX > 0) {
          handlePrev();
        } else {
          handleNext();
        }
      }

      touchCoordsRef.current = null;
    },
    [handleNext, handlePrev]
  );

  const handleTouchCancel = useCallback(() => {
    touchCoordsRef.current = null;
  }, []);

  const touchHandlers = useMemo<TouchHandlers>(
    () => ({
      onTouchStart: handleTouchStart,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchCancel,
    }),
    [handleTouchStart, handleTouchEnd, handleTouchCancel]
  );

  // Preload adjacent image slides for instant carousel transitions
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('Image' in window) ||
      stories.length <= 1
    ) {
      return;
    }

    const nextIdx = (safeIndex + 1) % stories.length;
    const prevIdx = (safeIndex - 1 + stories.length) % stories.length;

    [nextIdx, prevIdx].forEach((idx) => {
      const item = stories[idx];
      if (item?.mediaUrl && item.mediaType === 'image') {
        const img = new Image();
        img.src = item.mediaUrl;
      }
    });
  }, [safeIndex, stories]);

  return {
    safeIndex,
    setCurrentIndex,
    handleNext,
    handlePrev,
    touchHandlers,
  };
}

export default useStoryNavigation;