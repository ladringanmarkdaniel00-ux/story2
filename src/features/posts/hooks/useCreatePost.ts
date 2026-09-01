import { useEffect, useRef, useCallback, type FormEvent, type ChangeEvent } from 'react';
import { storageService } from '../../../services/supabase/storage.service';
import { optimizeImageFile } from '../../stories/utils';
import { useMediaUpload } from './useMediaUpload';
import { usePostFormReducer } from './usePostFormReducer';
import type { PostMedia } from '../types';

export interface CreatePostInput {
  title?: string;
  caption: string;
  media: PostMedia[];
}

export const TITLE_MAX_LENGTH = 100;
export const CAPTION_MAX_LENGTH = 2000;

interface UseCreatePostProps {
  onClose: () => void;
  onPostCreated: (postInput: CreatePostInput) => Promise<void> | void;
  allowedRoles: string[];
  userRole: string;
}

export function useCreatePost({ onClose, onPostCreated, allowedRoles, userRole }: UseCreatePostProps) {
  const [state, dispatch] = usePostFormReducer();
  
  const mediaUploadState = useMediaUpload();
  const { items, errorMsg: mediaErrorMsg, setErrorMsg: setMediaErrorMsg } = mediaUploadState;

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  
  const modalRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const isDirty = state.title.trim().length > 0 || state.caption.trim().length > 0 || items.length > 0;
  const isAuthorized = allowedRoles.includes(userRole);

  // Sync media error messages with the form reducer
  useEffect(() => {
    if (mediaErrorMsg) {
      dispatch({ type: 'SET_ERROR', payload: mediaErrorMsg });
    }
  }, [mediaErrorMsg, dispatch]);

  const setErrorMsg = useCallback((msg: string) => {
    setMediaErrorMsg(msg);
    dispatch({ type: 'SET_ERROR', payload: msg });
  }, [setMediaErrorMsg, dispatch]);

  // Save and restore active focus & abort lingering requests
  useEffect(() => {
    previouslyFocusedElement.current = document.activeElement as HTMLElement;
    return () => {
      previouslyFocusedElement.current?.focus();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const requestDismissal = useCallback(() => {
    if (state.isUploading) return;
    if (isDirty) {
      dispatch({ type: 'SET_DISCARD_CONFIRM', payload: true });
    } else {
      onClose();
    }
  }, [state.isUploading, isDirty, onClose, dispatch]);

  // Keyboard navigation: Escape & Focus Trap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (state.showDiscardConfirm) {
          dispatch({ type: 'SET_DISCARD_CONFIRM', payload: false });
          return;
        }
        requestDismissal();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [requestDismissal, state.showDiscardConfirm, dispatch]);

  const handleCancelUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    dispatch({ type: 'CANCEL_UPLOAD' });
  }, [dispatch]);

  const handleTitleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.value.length <= TITLE_MAX_LENGTH) {
      dispatch({ type: 'SET_TITLE', payload: e.target.value });
    }
  }, [dispatch]);

  const handleCaptionChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    if (e.target.value.length <= CAPTION_MAX_LENGTH) {
      dispatch({ type: 'SET_CAPTION', payload: e.target.value });
    }
  }, [dispatch]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!isOnline) {
      setErrorMsg('Cannot upload while offline. Check your internet connection.');
      return;
    }

    const cleanTitle = state.title.trim();
    const cleanCaption = state.caption.trim();

    if (items.length === 0 && !cleanCaption) {
      setErrorMsg('Please add either media or a caption to create a post.');
      return;
    }

    dispatch({ type: 'START_UPLOAD' });
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      let completed = 0;
      const uploadedMedia: PostMedia[] = await Promise.all(
        items.map(async (item) => {
          const fileToUpload =
            item.type === 'image' ? await optimizeImageFile(item.file) : item.file;

          const publicUrl = await storageService.uploadMedia(fileToUpload, {
            contentType: 'post',
            signal: controller.signal,
          });

          completed += 1;
          dispatch({ type: 'SET_PROGRESS', payload: Math.round((completed / items.length) * 100) });
          return { url: publicUrl, type: item.type };
        })
      );

      if (controller.signal.aborted) return;

      await onPostCreated({
        title: cleanTitle || undefined,
        caption: cleanCaption,
        media: uploadedMedia,
      });

      dispatch({ type: 'UPLOAD_SUCCESS' });
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        dispatch({ type: 'UPLOAD_ERROR', payload: 'Upload aborted by user.' });
      } else if (err instanceof Error) {
        dispatch({ type: 'UPLOAD_ERROR', payload: err.message });
      } else {
        dispatch({ type: 'UPLOAD_ERROR', payload: 'Failed to upload media. Please try again.' });
      }
    } finally {
      abortControllerRef.current = null;
    }
  };

  return {
    title: state.title,
    caption: state.caption,
    isUploading: state.isUploading,
    uploadProgress: state.uploadProgress,
    showDiscardConfirm: state.showDiscardConfirm,
    errorMsg: state.errorMsg,
    isOnline,
    isAuthorized,
    modalRef,
    mediaUploadState,
    actions: {
      requestDismissal,
      handleCancelUpload,
      handleTitleChange,
      handleCaptionChange,
      handleSubmit,
      setShowDiscardConfirm: (val: boolean) => dispatch({ type: 'SET_DISCARD_CONFIRM', payload: val }),
    }
  };
}
