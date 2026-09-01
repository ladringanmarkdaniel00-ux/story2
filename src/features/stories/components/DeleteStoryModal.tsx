import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface DeleteStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteStoryModal({ isOpen, onClose, onConfirm }: DeleteStoryModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <div 
        className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full mx-auto shadow-2xl relative"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-story-modal-title"
      >
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-7 h-7 text-rose-600" />
          </div>
          
          <h2 id="delete-story-modal-title" className="text-xl font-bold text-neutral-900">
            Delete Story
          </h2>
          
          <p className="text-sm text-neutral-500">
            Are you sure you want to delete this story? This action cannot be undone.
          </p>
        </div>

        <div className="flex flex-col-reverse sm:flex-row items-center gap-3 mt-8">
          <button
            onClick={onClose}
            className="w-full sm:w-1/2 py-3 px-4 rounded-xl text-sm font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-400"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="w-full sm:w-1/2 py-3 px-4 rounded-xl text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-sm shadow-rose-600/20 focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
