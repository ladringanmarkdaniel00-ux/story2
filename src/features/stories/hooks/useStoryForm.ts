import { useState, useRef, useEffect, useCallback, useMemo, ChangeEvent, FormEvent, DragEvent } from 'react';
import { Story, DEFAULT_EXPIRATION_OPTIONS, CreateStoryInput } from '../types';
import { optimizeImageFile } from '../utils';
import { validateMediaFile } from '../../../utils/mediaValidation';
import { storageService } from '../../../services/supabase/storage.service';

export interface UseStoryFormProps {
  initialStory?: Story; // if provided, we are in Edit mode
  onClose: () => void;
  onStoryCreated?: (newStory: CreateStoryInput) => Promise<void> | void;
  onStoryUpdated?: (updatedStory: Story) => Promise<void> | void;
  allowedRoles?: string[];
  userRole?: string;
  currentUserId?: string;
}

export const MAX_IMAGE_SIZE_MB = 15;
export const MAX_VIDEO_SIZE_MB = 100;
export const CAPTION_MAX_LENGTH = 500;
export const DEFAULT_DURATION_MS = 24 * 60 * 60 * 1000;

export function useStoryForm({
  initialStory,
  onClose,
  onStoryCreated,
  onStoryUpdated,
  allowedRoles = ['admin'],
  userRole = 'guest',
  currentUserId,
}: UseStoryFormProps) {
  const isEditMode = !!initialStory;

  const [file, setFile] = useState<File | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string>(initialStory?.mediaUrl || '');
  const [mediaType, setMediaType] = useState<'image' | 'video'>(initialStory?.mediaType || 'image');
  const [caption, setCaption] = useState<string>(initialStory?.caption || '');
  
  const initialDurationMs = useMemo(() => {
    if (!initialStory) return DEFAULT_DURATION_MS;
    if (initialStory.expiresAt === Number.MAX_SAFE_INTEGER) return Number.MAX_SAFE_INTEGER;
    const remainingDuration = initialStory.expiresAt - initialStory.createdAt;
    const optionExists = DEFAULT_EXPIRATION_OPTIONS.some((opt) => opt.durationMs === remainingDuration);
    if (optionExists) return remainingDuration;
    
    const validOption = DEFAULT_EXPIRATION_OPTIONS.find(
      (opt) => opt.durationMs !== Number.MAX_SAFE_INTEGER && initialStory.createdAt + opt.durationMs > Date.now()
    );
    return validOption ? validOption.durationMs : Number.MAX_SAFE_INTEGER;
  }, [initialStory]);

  const [selectedDurationMs, setSelectedDurationMs] = useState<number>(initialDurationMs);
  
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  const modalRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const isDirty = useMemo(() => {
    if (!isEditMode) {
      return Boolean(file || caption.trim().length > 0);
    }
    const fileChanged = file !== null;
    const captionChanged = caption.trim() !== (initialStory?.caption || '').trim();
    const durationChanged = selectedDurationMs !== initialDurationMs;
    return fileChanged || captionChanged || durationChanged;
  }, [file, caption, selectedDurationMs, initialStory, initialDurationMs, isEditMode]);

  const isAuthorized = useMemo(() => {
    if (isEditMode) {
      // Allow if admin or if they are the author
      return userRole === 'admin' || (currentUserId && initialStory?.userId === currentUserId);
    }
    return allowedRoles.includes(userRole);
  }, [isEditMode, userRole, currentUserId, initialStory, allowedRoles]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    previouslyFocusedElement.current = document.activeElement as HTMLElement;
    return () => {
      previouslyFocusedElement.current?.focus();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (file && mediaUrl && mediaUrl.startsWith('blob:')) {
        URL.revokeObjectURL(mediaUrl);
      }
    };
  }, [file, mediaUrl]);

  const requestDismissal = useCallback(() => {
    if (isUploading) return;
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  }, [isUploading, isDirty, onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDiscardConfirm) {
          setShowDiscardConfirm(false);
          return;
        }
        requestDismissal();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
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
  }, [requestDismissal, showDiscardConfirm]);

  const handleFileValidationAndSet = useCallback(
    (newFile: File) => {
      setErrorMsg('');
      if (!newFile) return;

      const validation = validateMediaFile(newFile);
      if (!validation.isValid) {
        setErrorMsg(validation.errorMsg || 'Invalid file');
        return;
      }

      if (file && mediaUrl && mediaUrl.startsWith('blob:')) {
        URL.revokeObjectURL(mediaUrl);
      }

      setFile(newFile);
      setMediaUrl(URL.createObjectURL(newFile));
      setMediaType(validation.mediaType || 'image');
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [file, mediaUrl]
  );

  const handleClearMedia = useCallback(() => {
    if (mediaUrl && mediaUrl.startsWith('blob:')) URL.revokeObjectURL(mediaUrl);
    setFile(null);
    setMediaUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [mediaUrl]);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      if (isUploading) return;
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileValidationAndSet(e.dataTransfer.files[0]);
      }
    },
    [handleFileValidationAndSet, isUploading]
  );

  const handleFileInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileValidationAndSet(e.target.files[0]);
    }
  }, [handleFileValidationAndSet]);

  const handleCancelUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsUploading(false);
    setUploadProgress(null);
    setErrorMsg('Upload was canceled.');
  }, []);

  const handleCaptionChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    if (e.target.value.length <= CAPTION_MAX_LENGTH) {
      setCaption(e.target.value);
    }
  }, []);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();

    if (!isOnline) {
      setErrorMsg(`Cannot ${isEditMode ? 'save changes' : 'upload'} while offline. Please verify your connection.`);
      return;
    }

    if (!isEditMode && !file) {
      setErrorMsg('Please select or drop a photo or video to create a story.');
      return;
    }
    
    if (isEditMode && !mediaUrl) {
      setErrorMsg('Media cannot be empty.');
      return;
    }

    setIsUploading(true);
    setErrorMsg('');
    setUploadProgress(10);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      let finalUrl = mediaUrl;

      if (file) {
        const fileToUpload = mediaType === 'image' ? await optimizeImageFile(file) : file;
        setUploadProgress(40);
        
        finalUrl = await storageService.uploadMedia(fileToUpload, {
          contentType: 'story',
          signal: controller.signal,
        });
        
        setUploadProgress(90);
      }

      if (controller.signal.aborted) return;

      const cleanCaption = caption.trim();

      if (isEditMode && initialStory && onStoryUpdated) {
        const newExpiresAt =
          selectedDurationMs === Number.MAX_SAFE_INTEGER
            ? Number.MAX_SAFE_INTEGER
            : Date.now() + selectedDurationMs;

        const updatedStory: Story = {
          ...initialStory,
          caption: cleanCaption,
          mediaUrl: finalUrl,
          mediaType,
          expiresAt: newExpiresAt,
        };

        await onStoryUpdated(updatedStory);
      } else if (!isEditMode && onStoryCreated) {
        await onStoryCreated({
          mediaUrl: finalUrl,
          mediaType,
          caption: cleanCaption || undefined,
          durationMs: selectedDurationMs,
        });
      }

      onClose();
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        setErrorMsg('Upload canceled by user.');
      } else if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg(`Failed to ${isEditMode ? 'update story' : 'upload media'}. Please try again.`);
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      abortControllerRef.current = null;
    }
  };

  return {
    state: {
      file,
      mediaUrl,
      mediaType,
      caption,
      selectedDurationMs,
      isDragOver,
      errorMsg,
      isUploading,
      uploadProgress,
      showDiscardConfirm,
      isOnline,
      isAuthorized,
      isDirty,
      isEditMode,
    },
    refs: {
      modalRef,
      fileInputRef,
    },
    actions: {
      setCaption,
      setSelectedDurationMs,
      setErrorMsg,
      setShowDiscardConfirm,
      requestDismissal,
      handleClearMedia,
      handleDragOver,
      handleDragLeave,
      handleDrop,
      handleFileInputChange,
      handleCancelUpload,
      handleSave,
      handleCaptionChange,
    }
  };
}
