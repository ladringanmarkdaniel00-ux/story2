import React from 'react';
import { Plus, Loader2 } from 'lucide-react';

interface CreatePostActionsProps {
  isUploading: boolean;
  isOnline: boolean;
  uploadProgress: number | null;
  requestDismissal: () => void;
  handleCancelUpload: () => void;
}

export function CreatePostActions({
  isUploading,
  isOnline,
  uploadProgress,
  requestDismissal,
  handleCancelUpload,
}: CreatePostActionsProps) {
  return (
    <div className="flex items-center justify-end gap-3 pt-2">
      {isUploading ? (
        <button
          type="button"
          onClick={handleCancelUpload}
          className="px-4 py-2 text-sm font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
        >
          Cancel Upload
        </button>
      ) : (
        <button
          type="button"
          onClick={requestDismissal}
          className="px-4 py-2 text-sm text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-neutral-400 rounded-lg"
        >
          Cancel
        </button>
      )}

      <button
        type="submit"
        disabled={isUploading || !isOnline}
        className={`px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-900 focus:ring-neutral-300 ${
          isUploading || !isOnline
            ? 'bg-neutral-800 text-neutral-400 cursor-not-allowed'
            : 'bg-neutral-100 hover:bg-white text-neutral-950'
        }`}
      >
        {isUploading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {uploadProgress !== null ? `Uploading (${uploadProgress}%)` : 'Uploading...'}
          </>
        ) : (
          <>
            <Plus className="w-4 h-4" />
            Create Post
          </>
        )}
      </button>
    </div>
  );
}
