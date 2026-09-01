import React, { DragEvent, ChangeEvent, RefObject } from 'react';
import { Plus, X, Image as ImageIcon, Video as VideoIcon } from 'lucide-react';
import { EditUploadItem, MAX_MEDIA_ITEMS } from '../hooks/useEditPost';

interface EditPostMediaCarouselProps {
  items: EditUploadItem[];
  isDragOver: boolean;
  fileInputRef: RefObject<HTMLInputElement>;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: DragEvent<HTMLDivElement>) => void;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
  onFileInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onRemoveMedia: (id: string) => void;
}

export function EditPostMediaCarousel({
  items,
  isDragOver,
  fileInputRef,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileInputChange,
  onRemoveMedia,
}: EditPostMediaCarouselProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
          Media
        </label>
        <span className="text-[11px] text-neutral-500">
          {items.length}/{MAX_MEDIA_ITEMS}
        </span>
      </div>

      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`w-full min-h-[140px] p-4 rounded-xl border-2 flex gap-3 overflow-x-auto snap-x snap-mandatory hide-scrollbar transition-colors ${
          isDragOver
            ? 'border-white bg-neutral-800/80 border-solid'
            : 'border-neutral-800 bg-neutral-950/40 border-dashed hover:border-neutral-700'
        }`}
      >
        {items.length < MAX_MEDIA_ITEMS && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 snap-start w-28 h-36 rounded-lg border border-dashed border-neutral-700 hover:border-neutral-500 hover:bg-neutral-800/50 flex flex-col items-center justify-center gap-2 text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer"
          >
            <Plus className="w-6 h-6" />
            <span className="text-[10px] font-medium text-center px-2">
              Add Photo or Video
            </span>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
              className="hidden"
              onChange={onFileInputChange}
            />
          </button>
        )}

        {items.map((item, idx) => (
          <div
            key={item.id}
            className="shrink-0 snap-start w-28 h-36 relative rounded-lg overflow-hidden bg-black border border-neutral-800 group"
          >
            {item.type === 'video' ? (
              <video
                src={item.url}
                className="w-full h-full object-cover pointer-events-none select-none"
                preload="metadata"
                muted
              />
            ) : (
              <img
                src={item.url}
                alt={`Item ${idx + 1}`}
                className="w-full h-full object-cover pointer-events-none select-none"
              />
            )}

            <button
              type="button"
              onClick={() => onRemoveMedia(item.id)}
              aria-label={`Remove media ${idx + 1}`}
              className="absolute top-1.5 right-1.5 bg-black/70 hover:bg-black p-1 rounded-full text-white backdrop-blur-md transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <div className="absolute bottom-1.5 left-1.5 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] text-white flex items-center gap-1">
              {item.type === 'video' ? (
                <VideoIcon className="w-3 h-3" />
              ) : (
                <ImageIcon className="w-3 h-3" />
              )}
            </div>
            
            <div className="absolute top-1.5 left-1.5 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-medium text-white shadow-sm">
              {idx + 1}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
