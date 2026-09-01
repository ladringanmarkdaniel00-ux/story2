/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {
  type RefObject,
  type DragEvent,
  type ChangeEvent,
  useCallback,
} from 'react';
import { UploadCloud, X, Image as ImageIcon, Video as VideoIcon, AlertCircle } from 'lucide-react';
import { type UploadItem } from '../hooks/useMediaUpload';

// ============================================================================
// 1. PROTOCOL WHITELIST & TYPE CONTRACTS
// ============================================================================

const SAFE_PROTOCOLS = new Set(['https:', 'http:', 'blob:', 'data:']);

export function isValidPreviewUrl(urlStr: string): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  try {
    const parsed = new URL(urlStr, window.location.href);
    return SAFE_PROTOCOLS.has(parsed.protocol);
  } catch {
    return false;
  }
}

export interface MediaCarouselStripProps {
  readonly items: ReadonlyArray<UploadItem>;
  readonly isDragOver: boolean;
  readonly fileInputRef: RefObject<HTMLInputElement | null>;
  readonly onFileInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
  readonly onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  readonly onDragLeave: (e: DragEvent<HTMLDivElement>) => void;
  readonly onDrop: (e: DragEvent<HTMLDivElement>) => void;
  readonly onRemove: (id: string) => void;
}

// ============================================================================
// 2. MAIN MEDIA CAROUSEL STRIP COMPONENT
// ============================================================================

export function MediaCarouselStrip({
  items,
  isDragOver,
  fileInputRef,
  onFileInputChange,
  onDragOver,
  onDragLeave,
  onDrop,
  onRemove,
}: MediaCarouselStripProps): React.JSX.Element {
  const handleTriggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, [fileInputRef]);

  return (
    <div className="flex flex-col gap-2">
      {/* Header & Status Indicator */}
      <div className="flex items-center justify-between">
        <label
          htmlFor="media-carousel-input"
          className="text-xs font-semibold uppercase tracking-wider text-neutral-400"
        >
          Media Carousel
        </label>
        <span
          aria-live="polite"
          className="text-xs text-neutral-500 font-medium"
        >
          {items.length} {items.length === 1 ? 'item' : 'items'} selected
        </span>
      </div>

      {/* Drag & Drop Carousel Container */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        tabIndex={0}
        role="region"
        aria-label="Media items carousel"
        className={`flex overflow-x-auto gap-3 p-3 rounded-xl border transition-colors snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${
          isDragOver
            ? 'border-white/80 bg-neutral-800/60'
            : 'border-neutral-800 bg-neutral-950/40'
        }`}
      >
        {/* Accessible, Screen-Reader Compliant File Input */}
        <input
          id="media-carousel-input"
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          className="sr-only"
          onChange={onFileInputChange}
          tabIndex={-1}
        />

        {/* Upload Trigger Tile */}
        <button
          type="button"
          onClick={handleTriggerFileInput}
          aria-label="Upload image or video files"
          className="flex-none w-28 h-36 rounded-lg border border-dashed border-neutral-700 bg-neutral-900/60 hover:bg-neutral-800/80 flex flex-col items-center justify-center cursor-pointer transition-colors shrink-0 snap-start text-neutral-400 hover:text-neutral-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
        >
          <UploadCloud className="w-6 h-6 mb-1.5" aria-hidden="true" />
          <span className="text-xs font-medium">Add Media</span>
        </button>

        {/* Uploaded Media Items */}
        {items.map((item, idx) => {
          const isSafeUrl = isValidPreviewUrl(item.previewUrl);

          return (
            <div
              key={item.id}
              className="relative flex-none w-28 h-36 rounded-lg overflow-hidden bg-black border border-neutral-800 snap-start shrink-0 group focus-within:ring-2 focus-within:ring-white"
            >
              {!isSafeUrl ? (
                <div
                  role="alert"
                  className="w-full h-full flex flex-col items-center justify-center p-2 text-center text-rose-500 bg-neutral-900"
                >
                  <AlertCircle className="w-5 h-5 mb-1" aria-hidden="true" />
                  <span className="text-[10px] font-medium leading-tight">Unsafe media source</span>
                </div>
              ) : item.type === 'video' ? (
                <video
                  src={item.previewUrl}
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  className="w-full h-full object-cover pointer-events-none select-none"
                  aria-label={`Video preview ${idx + 1}`}
                />
              ) : (
                <img
                  src={item.previewUrl}
                  alt={`Upload preview ${idx + 1}`}
                  loading="lazy"
                  className="w-full h-full object-cover pointer-events-none select-none"
                />
              )}

              {/* Remove Action Trigger */}
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                aria-label={`Remove media item ${idx + 1}`}
                className="absolute top-1.5 right-1.5 bg-black/70 hover:bg-black p-1 rounded-full text-white backdrop-blur-md transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>

              {/* Media Type Badge */}
              <div
                aria-hidden="true"
                className="absolute bottom-1.5 left-1.5 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] text-white flex items-center gap-1 pointer-events-none"
              >
                {item.type === 'video' ? (
                  <VideoIcon className="w-3 h-3" />
                ) : (
                  <ImageIcon className="w-3 h-3" />
                )}
              </div>

              {/* Ordinal Order Tag */}
              <div
                aria-hidden="true"
                className="absolute top-1.5 left-1.5 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-medium text-white shadow-sm pointer-events-none"
              >
                {idx + 1}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MediaCarouselStrip;
