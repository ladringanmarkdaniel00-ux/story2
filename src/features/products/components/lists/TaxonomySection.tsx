// src/features/products/components/lists/TaxonomySection.tsx
import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

interface TaxonomySectionProps {
  title: string;
  icon: React.ReactNode;
  items: string[];
  onAdd: (item: string) => void;
  onRemove: (item: string) => void;
  placeholder?: string;
}

export function TaxonomySection({
  title,
  icon,
  items,
  onAdd,
  onRemove,
  placeholder = 'Add new...',
}: TaxonomySectionProps) {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !items.includes(trimmed)) {
      onAdd(trimmed);
      setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-100 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 bg-white rounded-md shadow-sm text-neutral-600">
          {icon}
        </div>
        <h3 className="font-semibold text-sm text-neutral-900">{title}</h3>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 min-w-0 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-400"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!inputValue.trim()}
          aria-label={`Add ${title}`}
          className="shrink-0 px-3 py-2 bg-black text-white rounded-lg hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center cursor-pointer"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-white rounded-lg border border-neutral-200 p-2 min-h-[160px] max-h-[300px]">
        {items.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-neutral-400 py-6">
            No {title.toLowerCase()} added
          </div>
        ) : (
          <ul className="flex flex-col gap-1">
            {items.map((item) => (
              <li
                key={item}
                className="flex items-center justify-between p-2 hover:bg-neutral-50 rounded-md group transition-colors"
              >
                <span className="text-sm text-neutral-700 break-all">{item}</span>
                <button
                  type="button"
                  onClick={() => onRemove(item)}
                  aria-label={`Delete ${item}`}
                  className="text-neutral-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all p-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
