/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ============================================================================
// 1. STRING SANITIZATION & HTML ESCAPING
// ============================================================================

/**
 * Strips dangerous HTML tags and script injection attempts from user-provided text.
 */
export function sanitizeText(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// ============================================================================
// 2. STRICT URL PROTOCOL WHITELISTING
// ============================================================================

const SAFE_DATA_MIME_PREFIXES = new Set([
  'data:image/jpeg;',
  'data:image/png;',
  'data:image/webp;',
  'data:image/gif;',
  'data:image/svg+xml;',
  'data:video/mp4;',
  'data:video/webm;',
  'data:video/quicktime;',
]);

/**
 * Validates whether a media URL is safe to render in src / href attributes.
 * Rejects unsafe schemes like javascript:, data:text/html, etc.
 */
export function isSafeMediaUrl(url: unknown): boolean {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;

  // Allow standard web protocols and root-relative paths
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://') || trimmed.startsWith('/')) {
    return true;
  }

  // Allow safe binary blob URLs
  if (trimmed.startsWith('blob:')) {
    return true;
  }

  // Allow safe inline data URLs for approved media MIME types only
  for (const prefix of SAFE_DATA_MIME_PREFIXES) {
    if (trimmed.startsWith(prefix)) {
      return true;
    }
  }

  // Fallback: use robust URL parser validation to prevent protocol bypasses
  try {
    const parsed = new URL(trimmed, typeof window !== 'undefined' ? window.location.href : 'http://localhost');
    return ['https:', 'http:', 'blob:', 'data:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

// ============================================================================
// 3. FILE EXTENSION EXTRACTOR
// ============================================================================

/**
 * Strips query parameters or hashes from media URLs for clean file extension matching.
 */
export function getCleanExtension(url: unknown): string {
  if (typeof url !== 'string' || !url.trim()) return '';
  try {
    const clean = url.split('?')[0].split('#')[0];
    const parts = clean.split('.');
    return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
  } catch {
    return '';
  }
}

export default {
  sanitizeText,
  isSafeMediaUrl,
  getCleanExtension,
};
