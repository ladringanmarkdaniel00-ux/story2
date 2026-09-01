import React, { ChangeEvent } from 'react';
import { Type } from 'lucide-react';
import { TITLE_MAX_LENGTH, CAPTION_MAX_LENGTH } from '../hooks/useEditPost';

interface EditPostFormFieldsProps {
  title: string;
  caption: string;
  isUploading: boolean;
  onTitleChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onCaptionChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
}

export function EditPostFormFields({
  title,
  caption,
  isUploading,
  onTitleChange,
  onCaptionChange,
}: EditPostFormFieldsProps) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between items-center">
          <label
            htmlFor="edit-post-title"
            className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5"
          >
            <Type className="w-3.5 h-3.5" />
            Title (Optional)
          </label>
          <span className="text-[11px] text-neutral-500">
            {title.length}/{TITLE_MAX_LENGTH}
          </span>
        </div>
        <input
          id="edit-post-title"
          type="text"
          value={title}
          maxLength={TITLE_MAX_LENGTH}
          onChange={onTitleChange}
          placeholder="Give your post a title..."
          disabled={isUploading}
          className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm font-medium text-neutral-200 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-400 transition-colors disabled:opacity-50"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between items-center">
          <label
            htmlFor="edit-post-caption"
            className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5"
          >
            <Type className="w-3.5 h-3.5" />
            Caption
          </label>
          <span className="text-[11px] text-neutral-500">
            {caption.length}/{CAPTION_MAX_LENGTH}
          </span>
        </div>
        <textarea
          id="edit-post-caption"
          rows={3}
          value={caption}
          maxLength={CAPTION_MAX_LENGTH}
          onChange={onCaptionChange}
          placeholder="Write a caption for your post..."
          disabled={isUploading}
          className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-400 resize-none transition-colors disabled:opacity-50"
        />
      </div>
    </>
  );
}
