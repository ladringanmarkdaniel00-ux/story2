/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { get, set, del } from 'idb-keyval';
import { type Story } from './types';
import { logger } from '../../utils/logger';

// ============================================================================
// 1. CONSTANTS, SCHEMAS & PROTOCOL VALIDATION
// ============================================================================

const STORIES_KEY = 'local_stories';
const SAFE_PROTOCOLS = new Set(['https:', 'http:', 'blob:', 'data:']);

export function isValidMediaUrl(urlStr?: string): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  try {
    const parsed = new URL(urlStr, typeof window !== 'undefined' ? window.location.href : 'http://localhost');
    return SAFE_PROTOCOLS.has(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Pure runtime type guard to validate Story objects at storage boundaries.
 */
export function isStory(value: unknown): value is Story {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.mediaUrl === 'string' &&
    typeof candidate.createdAt === 'number'
  );
}

/**
 * Checks if the browser window and LocalStorage are accessible (SSR-safe).
 */
export function isLocalStorageAvailable(): boolean {
  try {
    return (
      typeof window !== 'undefined' &&
      typeof window.localStorage !== 'undefined' &&
      typeof window.localStorage.getItem === 'function'
    );
  } catch {
    return false;
  }
}

// ============================================================================
// 2. DUAL-TIER CLIENT STORAGE ENGINE (INDEXEDDB + LOCALSTORAGE)
// ============================================================================

/**
 * Synchronous local storage persistence with automatic Base64 payload stripping on quota failure.
 */
export function saveToLocal<T>(key: string, data: T): void {
  if (!isLocalStorageAvailable()) return;

  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Quota exceeded: Store lightweight metadata copy without large Base64 media payloads
    try {
      if (Array.isArray(data)) {
        const lightweight = data.map((item: unknown) => {
          if (item && typeof item === 'object') {
            const copy = { ...(item as Record<string, unknown>) };
            if (typeof copy.mediaUrl === 'string' && copy.mediaUrl.startsWith('data:')) {
              copy.mediaUrl = '';
            }
            return copy;
          }
          return item;
        });
        localStorage.setItem(key, JSON.stringify(lightweight));
      }
    } catch {
      logger.warn('[Storage] Quota completely exhausted; unable to write fallback metadata', undefined, { key });
    }
  }
}

/**
 * Synchronous local storage retrieval.
 */
export function getFromLocal<T>(key: string): T | null {
  if (!isLocalStorageAvailable()) return null;

  try {
    const item = localStorage.getItem(key);
    return item ? (JSON.parse(item) as T) : null;
  } catch {
    return null;
  }
}

/**
 * Async durable storage using IndexedDB (via idb-keyval) with LocalStorage metadata synchronization.
 */
export async function saveToStorage<T>(key: string, data: T): Promise<void> {
  // 1. Persist to IndexedDB (virtually unlimited quota for large video/image media)
  try {
    await set(key, data);
  } catch (err) {
    logger.warn('[Storage] Failed to write to IndexedDB', undefined, {
      key,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // 2. Sync lightweight copy to localStorage for fast synchronous boots
  saveToLocal(key, data);
}

/**
 * Retrieves data from durable IndexedDB with automatic LocalStorage fallback and lazy migration.
 */
export async function getFromStorage<T>(key: string): Promise<T | null> {
  // 1. Try IndexedDB first
  try {
    const data = await get<T>(key);
    if (data !== undefined && data !== null) {
      return data;
    }
  } catch (err) {
    logger.warn('[Storage] Failed to read from IndexedDB', undefined, {
      key,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // 2. Fall back to LocalStorage (and migrate to IndexedDB if found)
  const localData = getFromLocal<T>(key);
  if (localData !== null) {
    try {
      await set(key, localData);
    } catch {
      // Ignore migration errors
    }
    return localData;
  }

  return null;
}

/**
 * Purges item from both IndexedDB and LocalStorage.
 */
export async function removeFromStorage(key: string): Promise<void> {
  try {
    await del(key);
  } catch (err) {
    logger.warn('[Storage] Failed to delete from IndexedDB', undefined, {
      key,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  if (isLocalStorageAvailable()) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore removal errors
    }
  }
}

// ============================================================================
// 3. MEDIA CONVERSION & CANVAS WEBP OPTIMIZER
// ============================================================================

export interface UploadMediaOptions {
  readonly signal?: AbortSignal;
}

/**
 * Converts a File to a Data URL with AbortSignal cancellation support.
 */
export async function uploadMedia(file: File, options?: UploadMediaOptions): Promise<string> {
  if (options?.signal?.aborted) {
    const error = new Error('Upload aborted');
    error.name = 'AbortError';
    throw error;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    if (options?.signal) {
      options.signal.addEventListener(
        'abort',
        () => {
          reader.abort();
          const error = new Error('Upload aborted');
          error.name = 'AbortError';
          reject(error);
        },
        { once: true }
      );
    }

    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => {
      if (options?.signal?.aborted) {
        const error = new Error('Upload aborted');
        error.name = 'AbortError';
        reject(error);
      } else {
        reject(reader.error || new Error('Failed to read media file'));
      }
    };

    reader.readAsDataURL(file);
  });
}

/**
 * High-performance client-side image optimization using Object URLs and Canvas WebP encoding.
 */
export async function optimizeImageFile(
  file: File,
  maxDimension = 1440,
  quality = 0.82
): Promise<File> {
  // Pass through non-scalable or vector image formats untouched
  if (
    !file.type.startsWith('image/') ||
    file.type === 'image/gif' ||
    file.type === 'image/svg+xml' ||
    typeof window === 'undefined' ||
    typeof document === 'undefined'
  ) {
    return file;
  }

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    const cleanup = () => {
      try {
        URL.revokeObjectURL(objectUrl);
      } catch {
        // Ignore cleanup failure
      }
    };

    img.onload = () => {
      let { width, height } = img;

      // Downscale proportionally if dimensions exceed maxDimension
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        cleanup();
        return resolve(file);
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      const outputType = 'image/webp';

      canvas.toBlob(
        (blob) => {
          cleanup();
          // Fall back to original file if compression did not reduce size
          if (!blob || blob.size >= file.size) {
            return resolve(file);
          }

          const cleanName = file.name.replace(/\.[^/.]+$/, '') + '.webp';
          const optimizedFile = new File([blob], cleanName, {
            type: outputType,
            lastModified: Date.now(),
          });

          resolve(optimizedFile);
        },
        outputType,
        quality
      );
    };

    img.onerror = () => {
      cleanup();
      resolve(file);
    };

    img.src = objectUrl;
  });
}

// ============================================================================
// 4. DATE FORMATTING & DETERMINISTIC STORY SORTING
// ============================================================================

/**
 * Formats a Unix timestamp into a human-readable relative short duration with bounds clamping.
 */
export function formatUnixTimestamp(timestamp: number): string {
  if (!timestamp || Number.isNaN(timestamp)) return 'Now';

  const now = Date.now();
  // Clamp negative differences resulting from clock skew
  const diffInSeconds = Math.max(0, Math.floor((now - timestamp) / 1000));

  if (diffInSeconds < 60) {
    return diffInSeconds <= 5 ? 'Now' : `${diffInSeconds}s`;
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}min`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}hr`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}d`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  return `${diffInWeeks}w`;
}

/**
 * Deterministically sorts stories: pinned stories first, followed by newest createdAt.
 */
export function sortStories(stories: ReadonlyArray<Story>): ReadonlyArray<Story> {
  return [...stories].sort(
    (a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0) || b.createdAt - a.createdAt
  );
}

/**
 * Performs deep equality checking between two story collections.
 */
export function areStoriesEqual(
  a: ReadonlyArray<Story>,
  b: ReadonlyArray<Story>
): boolean {
  if (a.length !== b.length) return false;

  for (let i = 0; i < a.length; i++) {
    const itemA = a[i];
    const itemB = b[i];

    if (
      !itemA ||
      !itemB ||
      itemA.id !== itemB.id ||
      itemA.mediaType !== itemB.mediaType ||
      itemA.mediaUrl !== itemB.mediaUrl ||
      itemA.caption !== itemB.caption ||
      itemA.isPinned !== itemB.isPinned ||
      itemA.isArchived !== itemB.isArchived ||
      itemA.createdAt !== itemB.createdAt ||
      itemA.expiresAt !== itemB.expiresAt ||
      itemA.viewerCount !== itemB.viewerCount
    ) {
      return false;
    }
  }

  return true;
}

// ============================================================================
// 5. STORY STORAGE CRUD OPERATIONS WITH PRUNING
// ============================================================================

/**
 * Fetches and prunes expired stories from durable storage.
 */
export async function fetchStories(signal?: AbortSignal): Promise<ReadonlyArray<Story>> {
  if (signal?.aborted) {
    const error = new Error('Fetch stories aborted');
    error.name = 'AbortError';
    throw error;
  }

  const rawList = (await getFromStorage<Story[]>(STORIES_KEY)) || [];
  const list = rawList.filter(isStory).filter((s) => isValidMediaUrl(s.mediaUrl));
  const now = Date.now();
  
  let needsSave = false;
  const processed = list.map(s => {
    if (s.expiresAt && s.expiresAt <= now && !s.isArchived) {
      needsSave = true;
      return { ...s, isArchived: true };
    }
    return s;
  });

  const valid = sortStories(processed);

  // Prune invalid stories or update auto-archived ones in background storage
  if (needsSave || valid.length !== rawList.length) {
    await saveToStorage(STORIES_KEY, valid);
  }

  return valid;
}

/**
 * Inserts a new story into durable storage.
 */
export async function createStory(story: Story): Promise<void> {
  if (!isStory(story) || !isValidMediaUrl(story.mediaUrl)) {
    throw new Error('Invalid story payload or media protocol');
  }

  const current = (await getFromStorage<Story[]>(STORIES_KEY)) || [];
  const now = Date.now();
  const processed = current.map(s => {
    if (s.expiresAt && s.expiresAt <= now && !s.isArchived) {
      return { ...s, isArchived: true };
    }
    return s;
  });
  const valid = processed.filter((s) => s.id !== story.id);
  const updated = sortStories([story, ...valid]);
  await saveToStorage(STORIES_KEY, updated);
}

/**
 * Updates an existing story in durable storage.
 */
export async function updateStory(story: Story): Promise<void> {
  if (!isStory(story) || !isValidMediaUrl(story.mediaUrl)) {
    throw new Error('Invalid story payload or media protocol');
  }

  const current = (await getFromStorage<Story[]>(STORIES_KEY)) || [];
  const updated = sortStories(current.map((s) => (s.id === story.id ? story : s)));
  await saveToStorage(STORIES_KEY, updated);
}

/**
 * Removes a story by ID from durable storage.
 */
export async function deleteStory(id: string): Promise<void> {
  const current = (await getFromStorage<Story[]>(STORIES_KEY)) || [];
  const updated = sortStories(current.filter((s) => s.id !== id));
  await saveToStorage(STORIES_KEY, updated);
}
