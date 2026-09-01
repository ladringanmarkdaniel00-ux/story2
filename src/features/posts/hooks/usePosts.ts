/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  type Post,
  type CreatePostInput,
  type PostMedia,
  fetchPosts,
  createPost,
  updatePost,
  deletePost,
} from '../index';
import { getFromLocal, saveToLocal as setToLocal } from '../../stories/utils';
import { logger } from '../../../lib/core/logger';

// ============================================================================
// 1. IMMUTABLE CONTRACTS, CONSTANTS & URL SANITIZATION
// ============================================================================

const STORAGE_KEY = 'local_posts';
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

function generateSecureId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Pure helper: sorts pinned posts first, then descending by createdAt timestamp
export function sortPosts(posts: ReadonlyArray<Post>): ReadonlyArray<Post> {
  return [...posts].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    const timeA = typeof a.createdAt === 'number' ? a.createdAt : new Date(a.createdAt || 0).getTime();
    const timeB = typeof b.createdAt === 'number' ? b.createdAt : new Date(b.createdAt || 0).getTime();
    return timeB - timeA;
  });
}

// Memory-safe image preloader
function preloadPostMedia(posts: ReadonlyArray<Post>): void {
  if (typeof window === 'undefined') return;

  posts.slice(0, 5).forEach((p) => {
    const mediaList: ReadonlyArray<PostMedia> =
      p.media || (p.mediaUrl ? [{ url: p.mediaUrl, type: p.mediaType || 'image' }] : []);

    mediaList.forEach((m) => {
      if (m.type === 'image' && m.url && isValidMediaUrl(m.url)) {
        const img = new Image();
        img.src = m.url;
      }
    });
  });
}

// Safe storage wrapper with quota overflow protection
function persistPosts(posts: ReadonlyArray<Post>): void {
  try {
    setToLocal(STORAGE_KEY, posts);
  } catch (err: any) {
    if (err?.name === 'QuotaExceededError' || err?.code === 22) {
      // Strip heavy media payloads to preserve core metadata
      const stripped = posts.map((p) => ({
        ...p,
        media: p.media?.map((m) => (m.url.startsWith('data:') ? { ...m, url: '' } : m)),
      }));
      try {
        setToLocal(STORAGE_KEY, stripped);
      } catch {
        logger.warn('Failed to persist stripped posts to local storage');
      }
    }
  }
}

// ============================================================================
// 2. USE POSTS HOOK IMPLEMENTATION
// ============================================================================

export interface UsePostsReturn {
  readonly posts: ReadonlyArray<Post>;
  readonly archivedPosts: ReadonlyArray<Post>;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly isCreating: boolean;
  readonly setIsCreating: (isCreating: boolean) => void;
  readonly editingPost: Post | null;
  readonly setEditingPost: (post: Post | null) => void;
  readonly handleCreate: (postInput: CreatePostInput | Post) => Promise<void>;
  readonly handleUpdate: (updatedPost: Post) => Promise<void>;
  readonly handleDelete: (postId: string) => Promise<void>;
  readonly handlePin: (post: Post) => Promise<void>;
  readonly handleArchive: (post: Post) => Promise<void>;
}

export function usePosts(): UsePostsReturn {
  // 1. Initialize state from LocalStorage cache
  const [posts, setPosts] = useState<ReadonlyArray<Post>>(() => {
    const cached = getFromLocal<Post[]>(STORAGE_KEY) || [];
    return sortPosts(cached);
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal / Selection State
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);

  // Active mutation controllers and rollback snapshots
  const singleRollbackMapRef = useRef<Map<string, Post | null>>(new Map());
  const activeAbortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (activeAbortControllerRef.current) {
        activeAbortControllerRef.current.abort();
      }
    };
  }, []);

  // Synchronize state changes to LocalStorage and trigger media preloads
  const updatePostsState = useCallback((updater: (prev: ReadonlyArray<Post>) => ReadonlyArray<Post>) => {
    setPosts((prev) => {
      const next = sortPosts(updater(prev));
      persistPosts(next);
      preloadPostMedia(next);
      return next;
    });
  }, []);

  // 2. Fetch fresh posts on mount
  useEffect(() => {
    const controller = new AbortController();
    activeAbortControllerRef.current = controller;

    async function loadData() {
      try {
        setError(null);
        const data = await fetchPosts();
        if (!isMountedRef.current || controller.signal.aborted) return;

        let sorted = sortPosts(data);

        // Pin latest post if no items are currently pinned
        if (sorted.length > 0 && !sorted.some((p) => p.isPinned)) {
          const [first, ...rest] = sorted;
          sorted = [{ ...first, isPinned: true }, ...rest];
        }

        updatePostsState(() => sorted);
      } catch (err: unknown) {
        if (!isMountedRef.current || controller.signal.aborted) return;
        const msg = err instanceof Error ? err.message : 'Failed to load posts';
        setError(msg);
        logger.error('Failed to fetch posts', undefined, { error: msg });
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      controller.abort();
    };
  }, [updatePostsState]);

  // 3. Optimistic CREATE with isolated rollback
  const handleCreate = useCallback(
    async (postInput: CreatePostInput | Post): Promise<void> => {
      const newPost: Post =
        'id' in postInput && postInput.id
          ? postInput
          : {
              id: generateSecureId(),
              title: postInput.title,
              caption: postInput.caption,
              media: postInput.media,
              createdAt: Date.now(),
              userId: postInput.userId,
              isPinned: true,
            };

      // Optimistically insert
      updatePostsState((prev) => [newPost, ...prev]);

      try {
        await createPost(newPost);
      } catch (err: unknown) {
        // Rollback only the created item
        updatePostsState((prev) => prev.filter((p) => p.id !== newPost.id));
        if (isMountedRef.current) {
          setError('Failed to create post. Please try again.');
        }
        logger.error('Failed to create post', undefined, { error: String(err), postId: newPost.id });
        throw err;
      }
    },
    [updatePostsState]
  );

  // 4. Optimistic UPDATE with isolated single-item rollback
  const handleUpdate = useCallback(
    async (updatedPost: Post): Promise<void> => {
      // Snapshot original post for single-item rollback
      const originalPost = posts.find((p) => p.id === updatedPost.id) || null;
      singleRollbackMapRef.current.set(updatedPost.id, originalPost);

      // Optimistically update
      updatePostsState((prev) => prev.map((p) => (p.id === updatedPost.id ? updatedPost : p)));

      try {
        await updatePost(updatedPost);
        singleRollbackMapRef.current.delete(updatedPost.id);
      } catch (err: unknown) {
        // Roll back only the specific target post
        const rollbackItem = singleRollbackMapRef.current.get(updatedPost.id);
        if (rollbackItem) {
          updatePostsState((prev) => prev.map((p) => (p.id === updatedPost.id ? rollbackItem : p)));
        }
        singleRollbackMapRef.current.delete(updatedPost.id);

        if (isMountedRef.current) {
          setError('Failed to update post. Please try again.');
        }
        logger.error('Failed to update post', undefined, { error: String(err), postId: updatedPost.id });
        throw err;
      }
    },
    [posts, updatePostsState]
  );

  // 5. Optimistic DELETE with isolated rollback
  const handleDelete = useCallback(
    async (postId: string): Promise<void> => {
      const deletedPost = posts.find((p) => p.id === postId) || null;
      singleRollbackMapRef.current.set(postId, deletedPost);

      // Optimistically remove
      updatePostsState((prev) => prev.filter((p) => p.id !== postId));

      try {
        await deletePost(postId);
        singleRollbackMapRef.current.delete(postId);
      } catch (err: unknown) {
        // Rollback specific deleted post
        const rollbackItem = singleRollbackMapRef.current.get(postId);
        if (rollbackItem) {
          updatePostsState((prev) => [...prev, rollbackItem]);
        }
        singleRollbackMapRef.current.delete(postId);

        if (isMountedRef.current) {
          setError('Failed to delete post. Please try again.');
        }
        logger.error('Failed to delete post', undefined, { error: String(err), postId });
        throw err;
      }
    },
    [posts, updatePostsState]
  );

  // 6. Action wrappers
  const handlePin = useCallback(
    (post: Post) => handleUpdate({ ...post, isPinned: !post.isPinned }).catch(() => {}),
    [handleUpdate]
  );

  const handleArchive = useCallback(
    (post: Post) => handleUpdate({ ...post, isArchived: true }).catch(() => {}),
    [handleUpdate]
  );

  return {
    posts: posts.filter((p) => !p.isArchived),
    archivedPosts: posts.filter((p) => p.isArchived),
    isLoading,
    error,
    isCreating,
    setIsCreating,
    editingPost,
    setEditingPost,
    handleCreate,
    handleUpdate,
    handleDelete,
    handlePin,
    handleArchive,
  };
}

export default usePosts;
