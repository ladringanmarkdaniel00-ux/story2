export const MEDIA_LIMITS = {
  MAX_IMAGE_SIZE_MB: 15,
  MAX_VIDEO_SIZE_MB: 100,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/webm'],
};

export interface ValidationResult {
  isValid: boolean;
  errorMsg?: string;
  mediaType?: 'image' | 'video';
}

/**
 * Pure function to validate a selected media file (image or video)
 * against predefined size and type constraints.
 */
export function validateMediaFile(file: File): ValidationResult {
  if (!file) {
    return { isValid: false, errorMsg: 'No file provided.' };
  }

  const isVideo = file.type.startsWith('video/');
  const isImage = file.type.startsWith('image/');

  if (!isVideo && !isImage) {
    return { 
      isValid: false, 
      errorMsg: 'Please upload a valid image (JPEG, PNG, WebP) or video (MP4, WebM).' 
    };
  }

  const limitMB = isVideo ? MEDIA_LIMITS.MAX_VIDEO_SIZE_MB : MEDIA_LIMITS.MAX_IMAGE_SIZE_MB;
  const limitBytes = limitMB * 1024 * 1024;

  if (file.size > limitBytes) {
    return { 
      isValid: false, 
      errorMsg: `"${file.name}" exceeds the ${limitMB}MB size limit.` 
    };
  }

  return {
    isValid: true,
    mediaType: isVideo ? 'video' : 'image'
  };
}
