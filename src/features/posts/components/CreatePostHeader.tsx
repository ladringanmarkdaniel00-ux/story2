import React from 'react';
import { WifiOff, X } from 'lucide-react';

interface CreatePostHeaderProps {
  isOnline: boolean;
  isUploading: boolean;
  requestDismissal: () => void;
}

export function CreatePostHeader({
  isOnline,
  isUploading,
  requestDismissal,
}: CreatePostHeaderProps) {
  return (
    <>
      {!isOnline && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-center gap-2 text-xs text-amber-400">
          <WifiOff className="w-3.5 h-3.5" />
          <span>You are currently offline. Publishing is temporarily disabled.</span>
        </div>
      )}
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
        <h2 id="create-post-title" className="text-lg font-medium text-neutral-100">
          Create Post
        </h2>
        <button
          type="button"
          onClick={requestDismissal}
          disabled={isUploading}
          aria-label="Close modal"
          className="text-neutral-400 hover:text-neutral-100 p-1.5 rounded-full hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-400 transition-colors cursor-pointer disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </>
  );
}
