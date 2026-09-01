/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  useEffect,
  useRef,
  memo,
  useCallback,
  type SyntheticEvent,
} from 'react';
import { Story } from '../types';

interface StoryMediaViewProps {
  readonly stories: readonly Story[];
  readonly activeIndex?: number;
  readonly isPaused?: boolean;
  readonly onMediaLoaded?: () => void;
  readonly onMediaError?: (error: string) => void;
  readonly onVideoEnd?: () => void;
}

// 1. Security: Validate safe media protocols
function isSafeMediaUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();

  // Allow standard web protocols, Base64 data images/videos, and relative paths
  if (/^(https?:\/\/|blob:|data:(image|video)\/|\/|\.\/)/i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed, window.location.href);
      return ['http:', 'https:', 'data:', 'blob:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }
  return false;
}

export const StoryMediaView = memo(function StoryMediaView({
  stories = [],
  activeIndex = 0,
  isPaused = false,
  onMediaLoaded,
  onMediaError,
  onVideoEnd,
}: StoryMediaViewProps) {
  const currentIndex = Math.max(0, Math.min(activeIndex, stories.length - 1));
  const activeStory = stories[currentIndex];

  // Map of active video elements for hardware decoder lifecycle management
  const videoElementsRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const loadedNotifiedIndexRef = useRef<number | null>(null);

  const onMediaLoadedRef = useRef(onMediaLoaded);
  const onMediaErrorRef = useRef(onMediaError);
  const onVideoEndRef = useRef(onVideoEnd);

  useEffect(() => {
    onMediaLoadedRef.current = onMediaLoaded;
    onMediaErrorRef.current = onMediaError;
    onVideoEndRef.current = onVideoEnd;
  });

  // Reset load notification tracking on index change
  useEffect(() => {
    loadedNotifiedIndexRef.current = null;
  }, [currentIndex]);

  // Handle active media URL security validation without side-effects during render
  useEffect(() => {
    if (activeStory && !isSafeMediaUrl(activeStory.mediaUrl)) {
      onMediaErrorRef.current?.(`Unsafe media URL rejected for story: ${activeStory.id}`);
    }
  }, [activeStory]);

  // Video playback & hardware decoder synchronization
  useEffect(() => {
    videoElementsRef.current.forEach((video, storyId) => {
      const isCurrent = activeStory?.id === storyId;

      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;

      if (isCurrent) {
        if (isPaused) {
          try {
            video.pause();
          } catch {
            // Ignore synchronous pause exceptions
          }
        } else {
          try {
            const playPromise = video.play();
            if (playPromise !== undefined) {
              playPromise.catch((err: Error) => {
                // Ignore benign abort errors caused by rapid user navigation
                if (err.name !== 'AbortError') {
                  // Autoplay policy or media decode issue
                }
              });
            }
          } catch {
            // Handle unexpected browser playback exceptions
          }
        }
      } else {
        try {
          video.pause();
        } catch {
          // Ignore synchronous pause exceptions
        }
        if (video.readyState >= 1 && video.currentTime > 0) {
          try {
            video.currentTime = 0;
          } catch {
            // Metadata not yet available
          }
        }
      }
    });
  }, [currentIndex, isPaused, activeStory]);

  // Teardown active decoders on unmount
  useEffect(() => {
    const activeVideos = videoElementsRef.current;
    return () => {
      activeVideos.forEach((video) => {
        try {
          video.pause();
          video.removeAttribute('src');
          video.load();
        } catch {
          // Ignore unmount cleanup errors
        }
      });
      activeVideos.clear();
    };
  }, []);

  const handleMediaLoaded = useCallback((idx: number) => {
    if (idx === currentIndex && loadedNotifiedIndexRef.current !== idx) {
      loadedNotifiedIndexRef.current = idx;
      onMediaLoadedRef.current?.();
    }
  }, [currentIndex]);

  const handleVideoEnded = useCallback(
    (idx: number, e: SyntheticEvent<HTMLVideoElement, Event>) => {
      const video = e.currentTarget;
      // Guard against false/spurious ended events during initial buffer attachment
      if (
        idx === currentIndex &&
        video.duration > 0 &&
        video.currentTime >= Math.max(0, video.duration - 0.4) &&
        video.currentTime > 0.2
      ) {
        onVideoEndRef.current?.();
      }
    },
    [currentIndex]
  );

  const handleMediaError = useCallback(
    (idx: number) => {
      if (idx === currentIndex) {
        const item = stories[idx];
        const msg = `Failed to load ${item?.mediaType || 'media'}`;
        onMediaErrorRef.current?.(msg);
      }
    },
    [currentIndex, stories]
  );

  if (!stories.length) return null;

  // Windowing: Render only active and adjacent slides (max 3 DOM nodes at a time)
  const visibleIndices = [currentIndex - 1, currentIndex, currentIndex + 1].filter(
    (idx) => idx >= 0 && idx < stories.length
  );

  return (
    <div
      role="region"
      aria-label="Story media viewport"
      className="relative w-full h-full bg-neutral-950 flex items-center justify-center overflow-hidden select-none"
    >
      {visibleIndices.map((idx) => {
        const item = stories[idx];
        if (!item) return null;

        const isActive = idx === currentIndex;
        const isSafe = isSafeMediaUrl(item.mediaUrl);

        if (!isSafe) {
          return null;
        }

        return (
          <div
            key={item.id}
            aria-hidden={!isActive}
            className={`absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden bg-neutral-950 transition-opacity duration-150 ${
              isActive
                ? 'z-10 opacity-100 pointer-events-auto'
                : 'z-0 opacity-0 pointer-events-none'
            }`}
          >
            {item.mediaType === 'video' ? (
              <video
                ref={(el) => {
                  if (el) {
                    videoElementsRef.current.set(item.id, el);
                  } else {
                    videoElementsRef.current.delete(item.id);
                  }
                }}
                src={item.mediaUrl}
                crossOrigin="anonymous"
                preload={isActive ? 'auto' : 'metadata'}
                autoPlay={isActive && !isPaused}
                muted
                playsInline
                controls={false}
                controlsList="nodownload noplaybackrate"
                disablePictureInPicture
                onLoadedData={() => handleMediaLoaded(idx)}
                onCanPlay={() => handleMediaLoaded(idx)}
                onPlaying={() => handleMediaLoaded(idx)}
                onError={() => handleMediaError(idx)}
                onEnded={(e) => handleVideoEnded(idx, e)}
                onContextMenu={(e) => e.preventDefault()}
                onDragStart={(e) => e.preventDefault()}
                aria-label={item.caption || `Story video ${idx + 1}`}
                className="w-full h-full object-cover select-none pointer-events-none"
              />
            ) : (
              <img
                src={item.mediaUrl}
                crossOrigin="anonymous"
                referrerPolicy="strict-origin-when-cross-origin"
                alt={item.caption ? `Story: ${item.caption}` : `Story ${idx + 1}`}
                loading={isActive ? 'eager' : 'lazy'}
                fetchPriority={isActive ? 'high' : 'low'}
                decoding="async"
                draggable={false}
                onLoad={() => handleMediaLoaded(idx)}
                onError={() => handleMediaError(idx)}
                onContextMenu={(e) => e.preventDefault()}
                onDragStart={(e) => e.preventDefault()}
                className="w-full h-full object-cover select-none pointer-events-none"
              />
            )}
          </div>
        );
      })}
    </div>
  );
});

export default StoryMediaView;
