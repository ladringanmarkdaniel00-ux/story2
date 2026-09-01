import { Story } from '../../../stories';
import { Post } from '../../../posts';
import { ArchiveTab, ArchiveMediaItem } from '../hooks/useArchiveData';

// --- SECURITY PROTOCOL SANITIZATION ---
export function sanitizeMediaUrl(url?: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();

  // Allow https://, http://, blob:, data: (Base64 images/videos), and relative paths (/ or ./)
  if (/^(https?:\/\/|blob:|data:(image|video)\/|\/|\.\/)/i.test(trimmed)) {
    return trimmed;
  }
  return null;
}

export function extractMedia(item: Story | Post, type: ArchiveTab): ArchiveMediaItem[] {
  if (!item) return [];

  const raw = item as unknown as Record<string, unknown>;

  // 1. Stories: check mediaUrl, url, or nested media array
  if (type === 'story') {
    const candidateUrl =
      (typeof raw.mediaUrl === 'string' ? raw.mediaUrl : null) ||
      (typeof raw.url === 'string' ? raw.url : null) ||
      (Array.isArray(raw.media) && typeof (raw.media[0] as { url?: string })?.url === 'string'
        ? (raw.media[0] as { url: string }).url
        : null);

    const cleanUrl = sanitizeMediaUrl(candidateUrl || undefined);
    const detectedType =
      raw.mediaType === 'video' ||
      (Array.isArray(raw.media) && (raw.media[0] as { type?: string })?.type === 'video')
        ? 'video'
        : 'image';

    return cleanUrl ? [{ url: cleanUrl, type: detectedType }] : [];
  }

  // 2. Posts: check media array, mediaUrl, or url
  if (Array.isArray(raw.media) && raw.media.length > 0) {
    return raw.media
      .map((m: unknown) => {
        const itemObj = m as { url?: string; type?: string } | string;
        const targetUrl = typeof itemObj === 'string' ? itemObj : itemObj?.url;
        const targetType = typeof itemObj === 'object' && itemObj?.type === 'video' ? 'video' : 'image';
        return {
          url: sanitizeMediaUrl(targetUrl) || '',
          type: targetType as 'video' | 'image',
        };
      })
      .filter((m) => Boolean(m.url));
  }

  const fallbackUrl = sanitizeMediaUrl(
    (typeof raw.mediaUrl === 'string' ? raw.mediaUrl : null) ||
    (typeof raw.url === 'string' ? raw.url : undefined)
  );

  if (fallbackUrl) {
    return [{ url: fallbackUrl, type: raw.mediaType === 'video' ? 'video' : 'image' }];
  }

  return [];
}
