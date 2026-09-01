import React, { DragEvent, ChangeEvent, RefObject } from 'react';
import { 
  X, 
  WifiOff, 
  UploadCloud, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  Clock, 
  Type, 
  AlertTriangle, 
  ShieldAlert, 
  Loader2, 
  Check 
} from 'lucide-react';
import { Story, DEFAULT_EXPIRATION_OPTIONS, CreateStoryInput } from '../types';
import { useStoryForm, MAX_IMAGE_SIZE_MB, MAX_VIDEO_SIZE_MB, CAPTION_MAX_LENGTH } from '../hooks/useStoryForm';
import { useStore } from '../../../store';

interface StoryFormProps {
  story?: Story; // Provided when editing
  onClose: () => void;
  onStoryCreated?: (newStory: CreateStoryInput) => Promise<void> | void;
  onStoryUpdated?: (updatedStory: Story) => Promise<void> | void;
}

export function StoryForm({ story, onClose, onStoryCreated, onStoryUpdated }: StoryFormProps) {
  const currentUserId = useStore((state) => state.user?.id);
  const userRole = useStore((state) => state.profile?.role);

  const { state, refs, actions } = useStoryForm({
    initialStory: story,
    onClose,
    onStoryCreated,
    onStoryUpdated,
    allowedRoles: ['admin'],
    userRole,
    currentUserId,
  });

  if (!state.isAuthorized) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-sm p-6 text-center shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mb-4 mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-neutral-100 mb-2">Access Denied</h2>
          <p className="text-xs text-neutral-400 mb-6 leading-relaxed">
            Your account role (<span className="text-neutral-200 font-medium">{userRole || 'guest'}</span>)
            does not have permission to {state.isEditMode ? 'edit this' : 'post'} story.
          </p>
          <button 
            type="button"
            onClick={onClose} 
            className="w-full py-2.5 bg-neutral-100 hover:bg-white text-neutral-950 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Return
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
      onClick={actions.requestDismissal}
    >
      <div
        ref={refs.modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="story-form-title"
        className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh] relative my-auto animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {!state.isOnline && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-center gap-2 text-xs text-amber-400">
            <WifiOff className="w-3.5 h-3.5" />
            <span>You are currently offline. {state.isEditMode ? 'Publishing is temporarily disabled.' : 'Uploads are temporarily disabled.'}</span>
          </div>
        )}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <h2 id="story-form-title" className="text-lg font-medium text-neutral-100">
            {state.isEditMode ? 'Edit Story' : 'Create Story'}
          </h2>
          <button
            type="button"
            onClick={actions.requestDismissal}
            disabled={state.isUploading}
            aria-label="Close modal"
            className="text-neutral-400 hover:text-neutral-100 p-1.5 rounded-full hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-400 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={actions.handleSave} className="flex flex-col overflow-y-auto p-6 gap-6 custom-scrollbar">
          {/* Media Uploader / Preview */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Story Media (Photo or Video) <span className="text-rose-400">*</span>
            </label>

            {!state.mediaUrl ? (
              <div
                onDragOver={actions.handleDragOver}
                onDragLeave={actions.handleDragLeave}
                onDrop={actions.handleDrop}
                onClick={() => refs.fileInputRef.current?.click()}
                className={`w-full h-44 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors ${
                  state.isDragOver
                    ? 'border-white bg-neutral-800/80'
                    : 'border-neutral-700 bg-neutral-950/40 hover:bg-neutral-800/60'
                }`}
              >
                <input
                  ref={refs.fileInputRef}
                  id="media-file-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
                  className="hidden"
                  onChange={actions.handleFileInputChange}
                  disabled={state.isUploading}
                />
                <UploadCloud className="w-8 h-8 text-neutral-400 mb-1" />
                <span className="text-xs font-medium text-neutral-300">
                  Click or drag photo/video here
                </span>
                <span className="text-[10px] text-neutral-500 mt-1">
                  Max: Images {MAX_IMAGE_SIZE_MB}MB, Videos {MAX_VIDEO_SIZE_MB}MB
                </span>
              </div>
            ) : (
              <div
                onDragOver={actions.handleDragOver}
                onDragLeave={actions.handleDragLeave}
                onDrop={actions.handleDrop}
                className={`relative rounded-xl overflow-hidden bg-black aspect-[9/16] max-h-72 flex items-center justify-center border transition-colors group ${
                  state.isDragOver ? 'border-white' : 'border-neutral-800'
                }`}
              >
                {state.mediaType === 'video' ? (
                  <video
                    src={state.mediaUrl}
                    autoPlay
                    muted
                    loop
                    playsInline
                    controls
                    controlsList="nodownload noplaybackrate"
                    disablePictureInPicture
                    className={`w-full h-full object-contain select-none transition-opacity ${state.isEditMode ? 'opacity-90 group-hover:opacity-60' : ''}`}
                  />
                ) : (
                  <img
                    src={state.mediaUrl}
                    alt="Story media preview"
                    className={`w-full h-full object-contain pointer-events-none select-none transition-opacity ${state.isEditMode ? 'opacity-90 group-hover:opacity-60' : ''}`}
                  />
                )}

                {state.isEditMode && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                    <div className="bg-neutral-900/80 backdrop-blur-sm px-4 py-2 rounded-xl border border-neutral-700 flex flex-col items-center gap-1">
                      <UploadCloud className="w-5 h-5 text-neutral-300" />
                      <span className="text-xs font-medium text-neutral-200">Change Media</span>
                      <span className="text-[10px] text-neutral-400">Max: {MAX_IMAGE_SIZE_MB}MB / {MAX_VIDEO_SIZE_MB}MB</span>
                    </div>
                  </div>
                )}

                {!state.isEditMode && (
                  <button
                    type="button"
                    onClick={actions.handleClearMedia}
                    aria-label="Remove media"
                    disabled={state.isUploading}
                    className="absolute top-3 right-3 bg-neutral-900/80 hover:bg-neutral-900 text-neutral-200 hover:text-white p-1.5 rounded-full backdrop-blur-sm border border-neutral-700 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-white disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}

                <div className="absolute bottom-2 left-2 bg-neutral-900/80 backdrop-blur-sm px-2.5 py-1 rounded-md text-[11px] text-neutral-300 flex items-center gap-1.5 border border-neutral-800 pointer-events-none">
                  {state.mediaType === 'video' ? (
                    <VideoIcon className="w-3.5 h-3.5" />
                  ) : (
                    <ImageIcon className="w-3.5 h-3.5" />
                  )}
                  <span className="capitalize">{state.mediaType}</span>
                </div>
                
                {state.isEditMode && (
                  <input
                    ref={refs.fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={actions.handleFileInputChange}
                    aria-label="Change media file"
                    disabled={state.isUploading}
                  />
                )}
              </div>
            )}
          </div>

          {/* Form Fields */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="story-form-expiration-select"
              className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5"
            >
              <Clock className="w-3.5 h-3.5" />
              Story Expiration
            </label>
            <select
              id="story-form-expiration-select"
              value={state.selectedDurationMs}
              onChange={(e) => actions.setSelectedDurationMs(Number(e.target.value))}
              disabled={state.isUploading}
              className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-400 transition-colors cursor-pointer disabled:opacity-50"
            >
              {DEFAULT_EXPIRATION_OPTIONS.map((opt) => (
                <option key={opt.durationMs} value={opt.durationMs} className="bg-neutral-900 text-neutral-200">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="story-form-caption-input"
                className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5"
              >
                <Type className="w-3.5 h-3.5" />
                Story Caption
              </label>
              <span className="text-[11px] text-neutral-500">
                {state.caption.length}/{CAPTION_MAX_LENGTH}
              </span>
            </div>
            <textarea
              id="story-form-caption-input"
              rows={2}
              value={state.caption}
              maxLength={CAPTION_MAX_LENGTH}
              onChange={actions.handleCaptionChange}
              placeholder="Add an optional caption (appears next to timestamp)..."
              disabled={state.isUploading}
              className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-400 resize-none transition-colors disabled:opacity-50"
            />
          </div>

          {/* Actions */}
          <div className="pt-2">
            {state.errorMsg && (
              <div
                role="alert"
                aria-live="assertive"
                className="text-xs text-rose-400 bg-rose-950/40 border border-rose-900/50 p-2.5 rounded-lg flex items-center justify-between mb-4"
              >
                <span>{state.errorMsg}</span>
                <button
                  type="button"
                  onClick={() => actions.setErrorMsg('')}
                  className="text-rose-400 hover:text-rose-200 ml-2"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {state.isUploading && state.uploadProgress !== null && (
              <div className="w-full bg-neutral-950 rounded-full h-1.5 overflow-hidden mb-4">
                <div
                  className="bg-white h-full transition-all duration-200"
                  style={{ width: `${state.uploadProgress}%` }}
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              {state.isUploading ? (
                <button
                  type="button"
                  onClick={actions.handleCancelUpload}
                  className="px-4 py-2 text-sm font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel Upload
                </button>
              ) : (
                <button
                  type="button"
                  onClick={actions.requestDismissal}
                  className="px-4 py-2 text-sm text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-neutral-400 rounded-lg"
                >
                  Cancel
                </button>
              )}

              <button
                type="submit"
                disabled={state.isUploading || !state.isOnline || (state.isEditMode ? !state.isDirty : !state.file)}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-900 focus:ring-neutral-300 ${
                  state.isUploading || !state.isOnline || (state.isEditMode ? !state.isDirty : !state.file)
                    ? 'bg-neutral-800 text-neutral-400 cursor-not-allowed'
                    : 'bg-neutral-100 hover:bg-white text-neutral-950'
                }`}
              >
                {state.isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {state.uploadProgress !== null ? `${state.isEditMode ? 'Saving' : 'Posting'} (${state.uploadProgress}%)` : (state.isEditMode ? 'Saving...' : 'Posting...')}
                  </>
                ) : (
                  <>
                    {state.isEditMode ? <Check className="w-4 h-4" /> : <UploadCloud className="w-4 h-4" />}
                    {state.isEditMode ? 'Save Changes' : 'Post Story'}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {state.showDiscardConfirm && (
          <div className="absolute inset-0 z-20 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-150">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-neutral-100 mb-1">Discard {state.isEditMode ? 'Changes' : 'Story'}?</h3>
              <p className="text-xs text-neutral-400 mb-5 leading-relaxed">
                You have {state.isEditMode ? 'unsaved changes' : 'an unposted story'}. {state.isEditMode ? 'Are you sure you want to discard them?' : 'Leaving now will discard your selected media and caption.'}
              </p>
              <div className="flex w-full gap-3">
                <button
                  type="button"
                  onClick={() => actions.setShowDiscardConfirm(false)}
                  className="flex-1 py-2.5 text-sm font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700 rounded-xl transition-colors cursor-pointer"
                >
                  Keep Editing
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 text-sm font-medium text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-colors cursor-pointer"
                >
                  Discard
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
