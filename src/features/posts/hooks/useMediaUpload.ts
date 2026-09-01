/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type RefObject,
  type DragEvent,
  type ChangeEvent,
} from 'react';

// ============================================================================
// 1. IMMUTABLE TYPE CONTRACTS & SCHEMAS
// ============================================================================

export type MediaType = 'image' | 'video';

export interface UploadItem {
  readonly id: string;
  readonly file: File;
  readonly previewUrl: string;
  readonly type: MediaType;
  readonly size: number;
}

export interface UseMediaUploadReturn {
  readonly items: ReadonlyArray<UploadItem>;
  readonly isDragOver: boolean;
  readonly errorMsg: string;
  readonly setErrorMsg: (msg: string) => void;
  readonly fileInputRef: RefObject<HTMLInputElement | null>;
  readonly removeMedia: (id: string) => void;
  readonly clearAllMedia: () => void;
  readonly handleFileInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
  readonly handleDragOver: (e: DragEvent<HTMLDivElement>) => void;
  readonly handleDragLeave: (e: DragEvent<HTMLDivElement>) => void;
  readonly handleDrop: (e: DragEvent<HTMLDivElement>) => void;
}

const MAX_FILES = 10;
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);
const ALLOWED_VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);

// ============================================================================
// 2. OBSERVABILITY & UTILITIES
// ============================================================================

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function logUploadWarning(reason: string, details?: Record<string, unknown>): void {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(
      JSON.stringify({
        level: 'warn',
        scope: 'useMediaUpload',
        reason,
        details,
        timestamp: new Date().toISOString(),
      })
    );
  }
}

// ============================================================================
// 3. MEDIA UPLOAD HOOK
// ============================================================================

export function useMediaUpload(): UseMediaUploadReturn {
  const [items, setItems] = useState<ReadonlyArray<UploadItem>>([]);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const itemsRef = useRef<ReadonlyArray<UploadItem>>(items);
  itemsRef.current = items;

  // Global object URL memory cleanup on unmount
  useEffect(() => {
    return () => {
      itemsRef.current.forEach((item) => {
        try {
          URL.revokeObjectURL(item.previewUrl);
        } catch {
          // Ignore revocation failure
        }
      });
    };
  }, []);

  const clearAllMedia = useCallback((): void => {
    itemsRef.current.forEach((item) => {
      try {
        URL.revokeObjectURL(item.previewUrl);
      } catch {
        // Ignore revocation failure
      }
    });
    setItems([]);
    setErrorMsg('');
  }, []);

  const removeMedia = useCallback((id: string): void => {
    setItems((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) {
        try {
          URL.revokeObjectURL(target.previewUrl);
        } catch {
          // Ignore revocation failure
        }
      }
      return prev.filter((item) => item.id !== id);
    });
  }, []);

  const processFiles = useCallback((incomingFiles: FileList | File[]): void => {
    setErrorMsg('');
    const filesArray = Array.from(incomingFiles);

    if (itemsRef.current.length + filesArray.length > MAX_FILES) {
      const msg = `You can upload a maximum of ${MAX_FILES} items.`;
      setErrorMsg(msg);
      logUploadWarning('MAX_FILES_EXCEEDED', { current: itemsRef.current.length, incoming: filesArray.length });
      return;
    }

    const validNewItems: UploadItem[] = [];
    let skippedCount = 0;

    for (const file of filesArray) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setErrorMsg(`"${file.name}" exceeds the 50MB size limit.`);
        logUploadWarning('FILE_SIZE_EXCEEDED', { name: file.name, size: file.size });
        skippedCount++;
        continue;
      }

      const isImage = ALLOWED_IMAGE_TYPES.has(file.type);
      const isVideo = ALLOWED_VIDEO_TYPES.has(file.type);

      if (!isImage && !isVideo) {
        logUploadWarning('UNSUPPORTED_MIME_TYPE', { name: file.name, type: file.type });
        skippedCount++;
        continue;
      }

      validNewItems.push({
        id: generateId(),
        file,
        previewUrl: URL.createObjectURL(file),
        type: isVideo ? 'video' : 'image',
        size: file.size,
      });
    }

    if (skippedCount > 0 && filesArray.length === skippedCount) {
      setErrorMsg('Unsupported file types were skipped. Only valid images and videos are allowed.');
    }

    if (validNewItems.length > 0) {
      setItems((prev) => [...prev, ...validNewItems]);
    }
  }, []);

  const handleFileInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>): void => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files);
      }
      e.target.value = ''; // Reset input value so identical files can be re-selected
    },
    [processFiles]
  );

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>): void => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    },
    [processFiles]
  );

  return {
    items,
    isDragOver,
    errorMsg,
    setErrorMsg,
    fileInputRef,
    removeMedia,
    clearAllMedia,
    handleFileInputChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
}

export default useMediaUpload;
