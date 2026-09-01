import React, { ChangeEvent, RefObject } from 'react';
import { X, Plus, Video } from 'lucide-react';

export interface MediaItem {
  id?: string;
  url: string;
  isVideo: boolean;
  file?: File;
  previewUrl?: string; // some hooks use previewUrl instead of url
}

interface ProductMediaManagerProps {
  mediaItems: MediaItem[];
  fileInputRef: RefObject<HTMLInputElement>;
  maxFiles?: number;
  onFilesChange: (files: FileList | null) => void;
  onRemoveFile: (index: number) => void;
  onSetThumbnail: (index: number) => void;
}

export function ProductMediaManager({
  mediaItems,
  fileInputRef,
  maxFiles = 10,
  onFilesChange,
  onRemoveFile,
  onSetThumbnail,
}: ProductMediaManagerProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-neutral-700 mb-2">
        Media (Photos & Videos) <span className="text-red-500">*</span>
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {mediaItems.map((item, idx) => {
          const itemUrl = item.previewUrl || item.url;
          return (
            <div
              key={item.id || idx}
              className="relative aspect-square bg-neutral-100 rounded-xl overflow-hidden border border-neutral-200 group"
            >
              {item.isVideo ? (
                <video src={itemUrl} className="w-full h-full object-cover" muted />
              ) : (
                <img src={itemUrl} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
              )}
              
              {item.isVideo && (
                <div className="absolute bottom-1 right-1 bg-black/60 p-1 rounded backdrop-blur-sm text-white">
                  <Video className="w-3 h-3" />
                </div>
              )}
              
              {idx === 0 ? (
                <div className="absolute top-2 left-2 z-10 bg-emerald-500 text-white px-2 py-1 rounded-full text-[10px] font-semibold shadow-sm">
                  Thumbnail
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onSetThumbnail(idx)}
                  className="absolute top-2 left-2 z-10 bg-black/60 hover:bg-black/90 px-2 py-1 rounded-full text-white text-[10px] font-semibold backdrop-blur-md transition-colors shadow-sm"
                >
                  Set Thumbnail
                </button>
              )}
              
              <button
                type="button"
                onClick={() => onRemoveFile(idx)}
                aria-label="Remove media"
                className="absolute top-2 right-2 z-10 bg-black/60 hover:bg-black/90 p-1.5 rounded-full text-white backdrop-blur-md shadow-sm transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}

        {mediaItems.length < maxFiles && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full aspect-square rounded-xl border-2 border-dashed border-neutral-200 bg-neutral-50 hover:bg-neutral-100 flex flex-col items-center justify-center cursor-pointer transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => onFilesChange(e.target.files)}
            />
            <Plus className="w-6 h-6 text-neutral-400" />
            <span className="text-[11px] font-medium text-neutral-500 mt-1">Add Media</span>
          </button>
        )}
      </div>
    </div>
  );
}
