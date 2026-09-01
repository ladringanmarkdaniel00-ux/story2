import React from 'react';
import { Type, X } from 'lucide-react';
import { useCreatePost, CreatePostInput, TITLE_MAX_LENGTH, CAPTION_MAX_LENGTH } from '../hooks/useCreatePost';
import { MediaCarouselStrip } from './MediaCarouselStrip';
import { CreatePostHeader } from './CreatePostHeader';
import { CreatePostActions } from './CreatePostActions';
import { AccessDeniedDialog } from './AccessDeniedDialog';
import { DiscardConfirmDialog } from './DiscardConfirmDialog';

interface CreatePostProps {
  onClose: () => void;
  onPostCreated: (postInput: CreatePostInput) => Promise<void> | void;
  allowedRoles?: string[];
  userRole?: string;
}

export function CreatePost({
  onClose,
  onPostCreated,
  allowedRoles = ['admin'],
  userRole = 'guest',
}: CreatePostProps) {
  const {
    title,
    caption,
    isUploading,
    uploadProgress,
    showDiscardConfirm,
    isOnline,
    isAuthorized,
    modalRef,
    mediaUploadState,
    actions
  } = useCreatePost({
    onClose,
    onPostCreated,
    allowedRoles,
    userRole,
  });

  const {
    items,
    isDragOver,
    errorMsg,
    setErrorMsg,
    fileInputRef,
    removeMedia,
    handleFileInputChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  } = mediaUploadState;

  if (!isAuthorized) {
    return <AccessDeniedDialog userRole={userRole} onClose={onClose} />;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-post-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
      onClick={actions.requestDismissal}
    >
      <div
        ref={modalRef}
        className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh] animate-in zoom-in-95 duration-200 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <CreatePostHeader
          isOnline={isOnline}
          isUploading={isUploading}
          requestDismissal={actions.requestDismissal}
        />

        {/* Modal Form */}
        <form onSubmit={actions.handleSubmit} className="p-6 flex flex-col gap-5 overflow-y-auto">
          <MediaCarouselStrip
            items={items}
            isDragOver={isDragOver}
            fileInputRef={fileInputRef}
            onFileInputChange={handleFileInputChange}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onRemove={removeMedia}
          />

          {/* Title Field */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label
                htmlFor="post-title"
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
              id="post-title"
              type="text"
              value={title}
              maxLength={TITLE_MAX_LENGTH}
              onChange={actions.handleTitleChange}
              placeholder="Give your post a title..."
              disabled={isUploading}
              className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm font-medium text-neutral-200 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-400 transition-colors disabled:opacity-50"
            />
          </div>

          {/* Caption Field */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label
                htmlFor="post-caption"
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
              id="post-caption"
              rows={3}
              value={caption}
              maxLength={CAPTION_MAX_LENGTH}
              onChange={actions.handleCaptionChange}
              placeholder="Write a caption for your post..."
              disabled={isUploading}
              className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-400 resize-none transition-colors disabled:opacity-50"
            />
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div
              role="alert"
              aria-live="assertive"
              className="text-xs text-rose-400 bg-rose-950/40 border border-rose-900/50 p-2.5 rounded-lg flex items-center justify-between"
            >
              <span>{errorMsg}</span>
              <button
                type="button"
                onClick={() => setErrorMsg('')}
                className="text-rose-400 hover:text-rose-200 ml-2"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Progress Bar */}
          {isUploading && uploadProgress !== null && (
            <div className="w-full bg-neutral-950 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-white h-full transition-all duration-200"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}

          <CreatePostActions
            isUploading={isUploading}
            isOnline={isOnline}
            uploadProgress={uploadProgress}
            requestDismissal={actions.requestDismissal}
            handleCancelUpload={actions.handleCancelUpload}
          />
        </form>

        {showDiscardConfirm && (
          <DiscardConfirmDialog
            onKeepEditing={() => actions.setShowDiscardConfirm(false)}
            onDiscard={onClose}
          />
        )}
      </div>
    </div>
  );
}

export default CreatePost;
