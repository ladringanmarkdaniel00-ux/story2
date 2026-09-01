import { describe, it, expect } from 'vitest';
import { validateMediaFile, MEDIA_LIMITS } from './mediaValidation';

describe('mediaValidation', () => {
  it('should reject non-media files', () => {
    const file = new File([''], 'test.txt', { type: 'text/plain' });
    const result = validateMediaFile(file);
    
    expect(result.isValid).toBe(false);
    expect(result.errorMsg).toContain('Please upload a valid image');
  });

  it('should accept valid images under size limit', () => {
    const file = new File(['dummy content'], 'test.jpg', { type: 'image/jpeg' });
    const result = validateMediaFile(file);
    
    expect(result.isValid).toBe(true);
    expect(result.mediaType).toBe('image');
  });

  it('should reject images over size limit', () => {
    const oversizedBuffer = new ArrayBuffer(MEDIA_LIMITS.MAX_IMAGE_SIZE_MB * 1024 * 1024 + 1);
    const file = new File([oversizedBuffer], 'huge.png', { type: 'image/png' });
    
    const result = validateMediaFile(file);
    expect(result.isValid).toBe(false);
    expect(result.errorMsg).toContain('exceeds the 15MB size limit');
  });

  it('should accept valid videos under size limit', () => {
    const file = new File(['video content'], 'test.mp4', { type: 'video/mp4' });
    const result = validateMediaFile(file);
    
    expect(result.isValid).toBe(true);
    expect(result.mediaType).toBe('video');
  });

  it('should reject videos over size limit', () => {
    const oversizedBuffer = new ArrayBuffer(MEDIA_LIMITS.MAX_VIDEO_SIZE_MB * 1024 * 1024 + 1);
    const file = new File([oversizedBuffer], 'huge.mp4', { type: 'video/mp4' });
    
    const result = validateMediaFile(file);
    expect(result.isValid).toBe(false);
    expect(result.errorMsg).toContain('exceeds the 100MB size limit');
  });
});
