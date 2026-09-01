import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface DiscardConfirmDialogProps {
  onKeepEditing: () => void;
  onDiscard: () => void;
}

export function DiscardConfirmDialog({ onKeepEditing, onDiscard }: DiscardConfirmDialogProps) {
  return (
    <div className="absolute inset-0 z-20 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-150">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl flex flex-col items-center text-center">
        <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <h3 className="text-base font-semibold text-neutral-100 mb-1">Discard Changes?</h3>
        <p className="text-xs text-neutral-400 mb-5 leading-relaxed">
          You have unsaved changes in this post. Leaving now will permanently discard your drafted content.
        </p>
        <div className="flex w-full gap-3">
          <button
            type="button"
            onClick={onKeepEditing}
            className="flex-1 py-2 text-xs font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700 rounded-xl transition-colors cursor-pointer"
          >
            Keep Editing
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="flex-1 py-2 text-xs font-medium text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-colors cursor-pointer"
          >
            Discard
          </button>
        </div>
      </div>
    </div>
  );
}
