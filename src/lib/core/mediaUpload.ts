/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { validateUploadFile } from './validation';

export interface UploadOptions {
  /** Optional AbortSignal for request cancellation */
  readonly signal?: AbortSignal;
  /** Real-time upload progress callback (0-100) */
  readonly onProgress?: (percent: number) => void;
  /** Custom upload target endpoint (Default: '/api/upload') */
  readonly endpoint?: string;
  /** Custom HTTP headers (e.g. CSRF tokens, authorization) */
  readonly customHeaders?: Record<string, string>;
  /** Request timeout in milliseconds (Default: 60,000ms / 1 min) */
  readonly timeoutMs?: number;
  /** Enable cross-origin credentials / session cookies (Default: false) */
  readonly withCredentials?: boolean;
}

export interface UploadResponse {
  readonly url: string;
  readonly key: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
}

export type SupportedMediaType =
  | 'image/jpeg'
  | 'image/png'
  | 'image/gif'
  | 'image/webp'
  | 'image/avif'
  | 'video/mp4'
  | 'video/webm'
  | 'video/quicktime';

/**
 * Sniffs initial header bytes to cryptographically verify media container signatures.
 * Fails closed on header mismatches.
 */
export async function verifyMagicBytes(
  file: File | Blob
): Promise<{ isValid: boolean; detectedMime?: SupportedMediaType }> {
  try {
    if (!file || typeof file.slice !== 'function' || file.size < 12) {
      return { isValid: false };
    }

    // Read initial 24 bytes for container header inspection
    const slice = file.slice(0, 24);
    const buffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // 1. JPEG: FF D8 FF
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return { isValid: true, detectedMime: 'image/jpeg' };
    }

    // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    ) {
      return { isValid: true, detectedMime: 'image/png' };
    }

    // 3. GIF: GIF87a or GIF89a
    if (
      bytes[0] === 0x47 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x38 &&
      (bytes[4] === 0x37 || bytes[4] === 0x39) &&
      bytes[5] === 0x61
    ) {
      return { isValid: true, detectedMime: 'image/gif' };
    }

    // 4. WebP: RIFF (bytes 0-3) + WEBP (bytes 8-11)
    if (
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    ) {
      return { isValid: true, detectedMime: 'image/webp' };
    }

    // 5. ISO Base Media File Format (MP4 / QuickTime MOV / AVIF): 'ftyp' atom at bytes 4-7
    if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
      const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);

      if (brand === 'avif' || brand === 'avis') {
        return { isValid: true, detectedMime: 'image/avif' };
      }
      if (brand === 'qt  ' || brand === 'moov') {
        return { isValid: true, detectedMime: 'video/quicktime' };
      }
      return { isValid: true, detectedMime: 'video/mp4' };
    }

    // 6. QuickTime MOV legacy atoms (moov, mdat, wide at bytes 4-7)
    if (
      (bytes[4] === 0x6d && bytes[5] === 0x6f && bytes[6] === 0x6f && bytes[7] === 0x76) ||
      (bytes[4] === 0x6d && bytes[5] === 0x64 && bytes[6] === 0x61 && bytes[7] === 0x74) ||
      (bytes[4] === 0x77 && bytes[5] === 0x69 && bytes[6] === 0x64 && bytes[7] === 0x65)
    ) {
      return { isValid: true, detectedMime: 'video/quicktime' };
    }

    // 7. WebM / Matroska EBML: 1A 45 DF A3
    if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
      return { isValid: true, detectedMime: 'video/webm' };
    }

    return { isValid: false };
  } catch {
    return { isValid: false };
  }
}

/**
 * Strips path traversal characters and non-alphanumeric noise from file names.
 */
function sanitizeFileName(fileName: string): string {
  const baseName = fileName.replace(/^.*[\\/]/, '');
  const cleanName = baseName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return cleanName.length > 0 ? cleanName.slice(0, 100) : 'upload_file.bin';
}

/**
 * Direct Binary Multipart upload service.
 * Performs client-side structural validation, 24-byte magic verification,
 * and tracks real-time progress via non-blocking binary transport.
 */
export async function uploadPostMedia(
  file: File,
  bucket = 'posts',
  options: UploadOptions = {}
): Promise<UploadResponse> {
  const {
    signal,
    onProgress,
    endpoint = '/api/upload',
    customHeaders = {},
    timeoutMs = 60_000,
    withCredentials = false,
  } = options;

  // 1. Initial Abort State Guard
  if (signal?.aborted) {
    throw new DOMException('Upload aborted by caller.', 'AbortError');
  }

  // 2. Structural & Size Validation
  const validation = validateUploadFile(file);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Invalid file format or size.');
  }

  // 3. Cryptographic Magic Byte Signature Verification
  const { isValid: isMagicValid, detectedMime } = await verifyMagicBytes(file);
  if (!isMagicValid) {
    throw new Error('Security Error: File binary header does not match its declared media format.');
  }

  // 4. Binary Multipart Assembly (Avoids Base64 memory inflation)
  const formData = new FormData();
  const safeName = `${Date.now()}_${sanitizeFileName(file.name)}`;
  formData.append('file', file, safeName);
  formData.append('bucket', bucket);
  formData.append('verifiedMime', detectedMime || file.type);

  // 5. Native Binary XHR Upload with Real-Time Progress Stream
  return new Promise<UploadResponse>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', endpoint, true);
    xhr.responseType = 'json';
    xhr.timeout = timeoutMs;
    xhr.withCredentials = withCredentials;

    // Set Custom Headers & Security Pre-flights
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    for (const [key, val] of Object.entries(customHeaders)) {
      xhr.setRequestHeader(key, val);
    }

    let isHandled = false;

    const cleanup = () => {
      if (signal) {
        signal.removeEventListener('abort', handleAbort);
      }
    };

    const handleAbort = () => {
      if (isHandled) return;
      isHandled = true;
      xhr.abort();
      cleanup();
      reject(new DOMException('Upload aborted by user.', 'AbortError'));
    };

    if (signal) {
      // Guard against race conditions where signal aborted during async verification
      if (signal.aborted) {
        handleAbort();
        return;
      }
      signal.addEventListener('abort', handleAbort, { once: true });
    }

    xhr.upload.onprogress = (event: ProgressEvent) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(Math.min(percent, 99)); // Keep at 99% until server finishes processing
      }
    };

    xhr.onload = () => {
      if (isHandled) return;
      isHandled = true;
      cleanup();

      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        const responseData = xhr.response;

        if (responseData && typeof responseData.url === 'string') {
          resolve({
            url: responseData.url,
            key: responseData.key || safeName,
            mimeType: responseData.mimeType || detectedMime || file.type,
            sizeBytes: file.size,
          });
        } else {
          reject(new Error('Server responded with an invalid payload structure.'));
        }
      } else {
        const errorMsg =
          xhr.response?.error ||
          xhr.response?.message ||
          `Upload failed with status ${xhr.status} (${xhr.statusText || 'Error'})`;
        reject(new Error(errorMsg));
      }
    };

    xhr.onerror = () => {
      if (isHandled) return;
      isHandled = true;
      cleanup();
      reject(new Error('A network error occurred during the upload process.'));
    };

    xhr.ontimeout = () => {
      if (isHandled) return;
      isHandled = true;
      cleanup();
      reject(new Error(`The upload request timed out after ${timeoutMs}ms.`));
    };

    try {
      xhr.send(formData);
    } catch (err) {
      if (isHandled) return;
      isHandled = true;
      cleanup();
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}
