import React from 'react';
import { ShieldAlert, AlertTriangle } from 'lucide-react';
import { useEditPost, EditPostProps } from '../hooks/useEditPost';
import { EditPostHeader } from './EditPostHeader';
import { EditPostMediaCarousel } from './EditPostMediaCarousel';
import { EditPostFormFields } from './EditPostFormFields';
import { EditPostActions } from './EditPostActions';

export function EditPost(props: EditPostProps) {
  const { state, refs, actions } = useEditPost(props);

  if (!state.isAuthorized) {
    return (
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="post-rbac-denied"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200"
      >
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mb-4">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 id="post-rbac-denied" className="text-lg font-bold text-neutral-100 mb-2">
            Access Denied
          </h2>
          <p className="text-xs text-neutral-400 mb-6 leading-relaxed">
            Your account role (<span className="text-neutral-200 font-medium">{props.userRole || 'guest'}</span>)
            does not have permission to edit posts.
          </p>
          <button
            type="button"
            onClick={props.onClose}
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
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-post-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
      onClick={actions.requestDismissal}
    >
      <div
        ref={refs.modalRef}
        className="w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh] animate-in zoom-in-95 duration-200 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <EditPostHeader
          isOnline={state.isOnline}
          isUploading={state.isUploading}
          requestDismissal={actions.requestDismissal}
        />

        <form onSubmit={actions.handleUpdate} className="p-6 flex flex-col gap-6 overflow-y-auto">
          <EditPostMediaCarousel
            items={state.items}
            isDragOver={state.isDragOver}
            fileInputRef={refs.fileInputRef}
            onDragOver={actions.handleDragOver}
            onDragLeave={actions.handleDragLeave}
            onDrop={actions.handleDrop}
            onFileInputChange={actions.handleFileInputChange}
            onRemoveMedia={actions.removeMedia}
          />

          <EditPostFormFields
            title={state.title}
            caption={state.caption}
            isUploading={state.isUploading}
            onTitleChange={(e) => actions.setTitle(e.target.value)}
            onCaptionChange={(e) => actions.setCaption(e.target.value)}
          />

          <EditPostActions
            isUploading={state.isUploading}
            isOnline={state.isOnline}
            isDirty={state.isDirty}
            uploadProgress={state.uploadProgress}
            errorMsg={state.errorMsg}
            onClearError={() => actions.setErrorMsg('')}
            onCancelUpload={actions.handleCancelUpload}
            onRequestDismissal={actions.requestDismissal}
          />
        </form>

        {state.showDiscardConfirm && (
          <div className="absolute inset-0 z-20 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-150">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-neutral-100 mb-1">Discard Edits?</h3>
              <p className="text-xs text-neutral-400 mb-5 leading-relaxed">
                You have unsaved changes. Leaving now will revert all your modifications.
              </p>
              <div className="flex w-full gap-3">
                <button
                  type="button"
                  onClick={() => actions.setShowDiscardConfirm(false)}
                  className="flex-1 py-2 text-xs font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700 rounded-xl transition-colors cursor-pointer"
                >
                  Keep Editing
                </button>
                <button
                  type="button"
                  onClick={props.onClose}
                  className="flex-1 py-2 text-xs font-medium text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-colors cursor-pointer"
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

export default EditPost;
