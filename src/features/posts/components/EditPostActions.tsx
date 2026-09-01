import React from 'react';
import { Loader2, Check, X } from 'lucide-react';

interface EditPostActionsProps {
  isUploading: boolean;
  isOnline: boolean;
  isDirty: boolean;
  uploadProgress: number | null;
  errorMsg: string;
  onClearError: () => void;
  onCancelUpload: () => void;
  onRequestDismissal: () => void;
}

export function EditPostActions({
  isUploading,
  isOnline,
  isDirty,
  uploadProgress,
  errorMsg,
  onClearError,
  onCancelUpload,
  onRequestDismissal,
}: EditPostActionsProps) {
  return (
    <>
      {errorMsg && (
        <div
          role="alert"
          aria-live="assertive"
          className="text-xs text-rose-400 bg-rose-950/40 border border-rose-900/50 p-2.5 rounded-lg flex items-center justify-between"
        >
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={onClearError}
            className="text-rose-400 hover:text-rose-200 ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {isUploading && uploadProgress !== null && (
        <div className="w-full bg-neutral-950 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-white h-full transition-all duration-200"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-2">
        {isUploading ? (
          <button
            type="button"
            onClick={onCancelUpload}
            className="px-4 py-2 text-sm font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
          >
            Cancel Upload
          </button>
        ) : (
          <button
            type="button"
            onClick={onRequestDismissal}
            className="px-4 py-2 text-sm text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-neutral-400 rounded-lg"
          >
            Cancel
          </button>
        )}

        <button
          type="submit"
          disabled={isUploading || !isOnline || !isDirty}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-900 focus:ring-neutral-300 ${
            isUploading || !isOnline || !isDirty
              ? 'bg-neutral-800 text-neutral-400 cursor-not-allowed'
              : 'bg-neutral-100 hover:bg-white text-neutral-950'
          }`}
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {uploadProgress !== null ? `Saving (${uploadProgress}%)` : 'Saving...'}
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </>
  );
}
