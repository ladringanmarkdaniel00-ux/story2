import React from 'react';
import { X } from 'lucide-react';

interface ProductHeaderProps {
  mode: 'create' | 'edit';
  onClose: () => void;
}

export function ProductHeader({ mode, onClose }: ProductHeaderProps) {
  return (
    <header className="flex items-center justify-between p-4 border-b border-neutral-100">
      <h2 id={`${mode}-product-title`} className="text-lg font-semibold text-neutral-900">
        {mode === 'create' ? 'Add New Product' : 'Edit Product'}
      </h2>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="p-2 text-neutral-400 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-full transition-colors"
      >
        <X className="w-5 h-5" />
      </button>
    </header>
  );
}
