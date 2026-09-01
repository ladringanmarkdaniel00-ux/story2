/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { type Post } from '../types';

// ============================================================================
// 1. IMMUTABLE TYPE CONTRACTS
// ============================================================================

export interface PostScrubberProps {
  readonly posts: ReadonlyArray<Post>;
  readonly activeIndex: number;
  readonly onSelectIndex: (index: number) => void;
  readonly isStoryPanelCollapsed?: boolean;
}

// ============================================================================
// 2. MAIN POST SCRUBBER COMPONENT
// ============================================================================

export function PostScrubber({
  posts,
  activeIndex,
  onSelectIndex,
  isStoryPanelCollapsed = false,
}: PostScrubberProps): React.JSX.Element | null {
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isPointerDownRef = useRef<boolean>(false);
  const rafIdRef = useRef<number | null>(null);

  const totalPosts = posts.length;
  // Bounds safety clamp
  const safeActiveIndex = Math.max(0, Math.min(activeIndex, totalPosts - 1));

  // Auto-scroll active dot into center view
  useEffect(() => {
    if (!containerRef.current || isScrubbing) return;
    const container = containerRef.current;
    const buttons = Array.from(container.children).filter(
      (c) => (c as HTMLElement).tagName === 'BUTTON'
    ) as HTMLElement[];
    const activeDot = buttons[safeActiveIndex];

    if (activeDot) {
      const scrollPosition =
        activeDot.offsetLeft + activeDot.offsetWidth / 2 - container.clientWidth / 2;
      container.scrollTo({ left: scrollPosition, behavior: 'smooth' });
    }
  }, [safeActiveIndex, isScrubbing]);

  // Clean up RAF frame on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  const calculateIndexFromPointer = useCallback(
    (clientX: number): number => {
      if (!containerRef.current || totalPosts === 0) return safeActiveIndex;
      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const percentage = rect.width > 0 ? x / rect.width : 0;

      const maxScroll = container.scrollWidth - container.clientWidth;
      if (maxScroll > 0) {
        container.scrollLeft = percentage * maxScroll;
      }

      const physicalX = x + container.scrollLeft;
      const buttons = Array.from(container.children).filter(
        (c) => (c as HTMLElement).tagName === 'BUTTON'
      ) as HTMLElement[];

      if (buttons.length === 0) return 0;

      let closestIdx = 0;
      let minDistance = Infinity;

      for (let idx = 0; idx < buttons.length; idx++) {
        const btn = buttons[idx];
        const btnCenter = btn.offsetLeft + btn.offsetWidth / 2;
        const dist = Math.abs(btnCenter - physicalX);
        if (dist < minDistance) {
          minDistance = dist;
          closestIdx = idx;
        }
      }

      return Math.max(0, Math.min(closestIdx, totalPosts - 1));
    },
    [totalPosts, safeActiveIndex]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>): void => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    isPointerDownRef.current = true;
    setIsScrubbing(true);

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignored if unsupported
    }

    const newIdx = calculateIndexFromPointer(e.clientX);
    if (newIdx !== safeActiveIndex) {
      onSelectIndex(newIdx);
    }
  };

  // RAF throttled pointer movement to prevent layout thrashing
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>): void => {
    if (!isPointerDownRef.current) return;
    e.preventDefault();

    const clientX = e.clientX;
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }

    rafIdRef.current = requestAnimationFrame(() => {
      const newIdx = calculateIndexFromPointer(clientX);
      if (newIdx !== safeActiveIndex) {
        onSelectIndex(newIdx);
      }
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>): void => {
    isPointerDownRef.current = false;
    setIsScrubbing(false);

    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignored if unsupported
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      onSelectIndex(Math.min(totalPosts - 1, safeActiveIndex + 1));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      onSelectIndex(Math.max(0, safeActiveIndex - 1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      onSelectIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      onSelectIndex(totalPosts - 1);
    }
  };

  if (totalPosts <= 1) return null;

  return (
    <div
      role="group"
      aria-label="Post pagination scrubber"
      className={`flex flex-col items-center justify-center w-full max-w-full shrink-0 relative select-none transition-transform duration-300 ${
        isStoryPanelCollapsed ? 'md:-translate-y-3 lg:-translate-y-4' : 'md:-translate-y-1 lg:-translate-y-2'
      }`}
    >
      <div
        ref={containerRef}
        tabIndex={0}
        role="slider"
        aria-valuemin={1}
        aria-valuemax={totalPosts}
        aria-valuenow={safeActiveIndex + 1}
        aria-label={`Post ${safeActiveIndex + 1} of ${totalPosts}`}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`relative flex items-center gap-2 sm:gap-2.5 overflow-x-auto no-scrollbar w-max mx-auto max-w-full px-6 py-3 cursor-grab active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 rounded-full transition-transform ${
          isScrubbing ? 'scale-105' : 'snap-x'
        }`}
        style={{ touchAction: 'none' }}
      >
        {posts.map((_, idx) => (
          <button
            key={idx}
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              onSelectIndex(idx);
            }}
            aria-label={`Go to post ${idx + 1}`}
            className={`transition-all duration-300 ease-out rounded-full cursor-pointer snap-center focus:outline-none ${
              idx === safeActiveIndex
                ? 'w-6 h-2 bg-neutral-900 shadow-sm'
                : 'w-2 h-2 bg-neutral-300 hover:bg-neutral-400'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export default PostScrubber;
