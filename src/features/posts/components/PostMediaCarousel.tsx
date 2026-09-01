/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { type PostMedia } from '../types';
import { type UserRole } from '../../../types/user';

// ============================================================================
// 1. PROTOCOL WHITELIST & TYPE CONTRACTS
// ============================================================================

const SAFE_PROTOCOLS = new Set(['https:', 'http:', 'blob:', 'data:']);

function isValidMediaUrl(urlStr?: string): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  try {
    const parsed = new URL(urlStr, window.location.href);
    return SAFE_PROTOCOLS.has(parsed.protocol);
  } catch {
    return false;
  }
}

export interface PostMediaCarouselProps {
  readonly mediaList: ReadonlyArray<PostMedia>;
  readonly userRole?: UserRole;
  readonly isFirstItem?: boolean;
  readonly useRowLayout?: boolean;
}

// ============================================================================
// 2. MAIN POST MEDIA CAROUSEL COMPONENT
// ============================================================================

export function PostMediaCarousel({
  mediaList,
  userRole = 'guest',
  isFirstItem = false,
  useRowLayout = false,
}: PostMediaCarouselProps): React.JSX.Element | null {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const touchStartCoords = useRef<{ readonly x: number; readonly y: number } | null>(null);

  // Bounds safety clamp
  const safeIndex = Math.max(0, Math.min(currentIndex, mediaList.length - 1));

  const handleNext = useCallback((e?: React.MouseEvent | React.KeyboardEvent): void => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev + 1 < mediaList.length ? prev + 1 : prev));
  }, [mediaList.length]);

  const handlePrev = useCallback((e?: React.MouseEvent | React.KeyboardEvent): void => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 >= 0 ? prev - 1 : prev));
  }, []);

  // Dominant-Axis Touch Gesture Engine
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>): void => {
    if (e.touches.length !== 1) return;
    touchStartCoords.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>): void => {
    if (!touchStartCoords.current) return;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;

    const diffX = endX - touchStartCoords.current.x;
    const diffY = endY - touchStartCoords.current.y;
    touchStartCoords.current = null;

    const absX = Math.abs(diffX);
    const absY = Math.abs(diffY);

    // Dominant horizontal axis check with 40px threshold
    if (absX > absY && absX > 40) {
      if (diffX < 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
  }, [handleNext, handlePrev]);

  // Keyboard Navigation Support
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      handlePrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      handleNext();
    }
  }, [handleNext, handlePrev]);

  if (mediaList.length === 0) return null;

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Post media carousel"
      tabIndex={mediaList.length > 1 ? 0 : undefined}
      onKeyDown={mediaList.length > 1 ? handleKeyDown : undefined}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onPointerDown={(e) => e.stopPropagation()} // Prevents outer drag collision
      className={`relative shrink min-h-0 aspect-square bg-neutral-950 flex items-center justify-center overflow-hidden rounded-none focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${
        useRowLayout
          ? 'w-full landscape:w-auto landscape:h-full lg:w-auto lg:h-full shrink-0'
          : 'w-full max-w-full sm:max-w-[90%] md:max-w-[85%] lg:max-w-[60%] max-h-full sm:max-h-[calc(100%-4rem)]'
      }`}
    >
      {/* Sliding Track */}
      <div
        className="flex w-full h-full transition-transform duration-300 ease-out"
        style={{ transform: `translateX(-${safeIndex * 100}%)` }}
      >
        {mediaList.map((media, idx) => {
          const isSafe = isValidMediaUrl(media.url);
          const isActive = idx === safeIndex;

          return (
            <div
              key={idx}
              role="group"
              aria-roledescription="slide"
              aria-label={`${idx + 1} of ${mediaList.length}`}
              aria-hidden={!isActive}
              className="w-full h-full shrink-0 flex items-center justify-center relative bg-neutral-950"
            >
              {!isSafe ? (
                <div
                  role="alert"
                  className="w-full h-full flex flex-col items-center justify-center p-4 text-center text-rose-500 bg-neutral-900"
                >
                  <AlertCircle className="w-8 h-8 mb-2" aria-hidden="true" />
                  <span className="text-xs font-medium">Unsafe media source</span>
                </div>
              ) : media.type === 'video' ? (
                <video
                  src={media.url}
                  preload={isFirstItem && idx === 0 ? 'auto' : 'metadata'}
                  controls={userRole === 'admin'}
                  autoPlay={isActive}
                  loop
                  muted
                  playsInline
                  controlsList="nodownload noplaybackrate"
                  disablePictureInPicture
                  className={`w-full h-full object-cover select-none ${
                    userRole !== 'admin' ? 'pointer-events-none' : ''
                  }`}
                  aria-label={`Post video ${idx + 1}`}
                />
              ) : (
                <img
                  src={media.url}
                  alt={`Post media ${idx + 1}`}
                  loading={isFirstItem && idx === 0 ? 'eager' : 'lazy'}
                  fetchPriority={isFirstItem && idx === 0 ? 'high' : 'auto'}
                  decoding="async"
                  draggable={false}
                  className={`w-full h-full object-cover select-none ${
                    userRole !== 'admin' ? 'pointer-events-none' : ''
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Navigation Controls */}
      {mediaList.length > 1 && (
        <>
          {safeIndex > 0 && (
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1 text-white/70 hover:text-white transition-colors z-10 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-full bg-black/30 backdrop-blur-sm"
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-6 h-6" aria-hidden="true" />
            </button>
          )}

          {safeIndex < mediaList.length - 1 && (
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-white/70 hover:text-white transition-colors z-10 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-full bg-black/30 backdrop-blur-sm"
              aria-label="Next slide"
            >
              <ChevronRight className="w-6 h-6" aria-hidden="true" />
            </button>
          )}

          {/* Dots Indicator with WAI-ARIA Tablist semantics */}
          <div className="absolute bottom-3 left-0 right-0 flex justify-center z-10 px-4">
            <div
              role="tablist"
              aria-label="Slide dots"
              className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-full pb-1 snap-x"
            >
              {mediaList.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  role="tab"
                  aria-selected={idx === safeIndex}
                  aria-label={`Go to slide ${idx + 1}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(idx);
                  }}
                  className={`transition-all duration-300 rounded-full shadow-sm shrink-0 snap-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                    idx === safeIndex ? 'bg-white w-2 h-2' : 'bg-white/50 w-1.5 h-1.5 hover:bg-white/80'
                  }`}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default PostMediaCarousel;
