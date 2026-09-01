// useArchiveData.ts

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Story, fetchStories, updateStory, deleteStory } from '../../../stories';
import { Post, fetchPosts, updatePost, deletePost } from '../../../posts';
import { logger } from '../../../../lib/core/logger';

export type ArchiveTab = 'story' | 'post';

export interface ArchiveMediaItem {
  readonly url: string;
  readonly type: 'image' | 'video';
}

export interface UseArchiveDataReturn {
  readonly activeTab: ArchiveTab;
  readonly setActiveTab: (tab: ArchiveTab) => void;
  readonly stories: readonly Story[];
  readonly posts: readonly Post[];
  readonly isLoading: boolean;
  readonly errorMessage: string | null;
  readonly restoreItem: (item: Story | Post, type: ArchiveTab) => Promise<boolean>;
  readonly deleteItem: (id: string, type: ArchiveTab) => Promise<boolean>;
  readonly retry: () => void;
  readonly clearError: () => void;
}

/**
 * Strict whitelist sanitizer for URL search parameters
 */
function sanitizeTabParam(rawTab: string | null): ArchiveTab {
  return rawTab === 'post' ? 'post' : 'story';
}

/**
 * Custom hook providing robust archive management, optimistic mutation rollbacks,
 * and referentially stable mutators for high-performance virtualized or memoized rendering.
 */
export function useArchiveData(isAdmin: boolean): UseArchiveDataReturn {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = sanitizeTabParam(searchParams.get('tab'));

  const [stories, setStories] = useState<Story[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Snapshot refs keep mutators referentially stable (prevents ArchiveCard re-renders)
  const storiesSnapshotRef = useRef<Story[]>([]);
  const postsSnapshotRef = useRef<Post[]>([]);
  storiesSnapshotRef.current = stories;
  postsSnapshotRef.current = posts;

  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  // Synchronize Tab with URL query params
  const setActiveTab = useCallback(
    (tab: ArchiveTab) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (tab === 'story') {
            next.delete('tab'); // Clean default URL
          } else {
            next.set('tab', tab);
          }
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const clearError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  // Fetch Archive Dataset with AbortSignal Forwarding
  const loadArchiveData = useCallback(async () => {
    if (!isAdmin) {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
      return;
    }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Forward signal to prevent wasted backend bandwidth on rapid navigation
      const [storiesResult, postsResult] = await Promise.all([
        fetchStories(controller.signal),
        fetchPosts(controller.signal),
      ]);

      if (isMountedRef.current && !controller.signal.aborted) {
        setStories(storiesResult.filter((s) => Boolean(s?.isArchived)));
        setPosts(postsResult.filter((p) => Boolean(p?.isArchived)));
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Normal cleanup cancellation
      }

      logger.error('Failed to load archive dataset', err);
      if (isMountedRef.current && !controller.signal.aborted) {
        setErrorMessage(
          err instanceof Error ? err.message : 'Failed to retrieve archive items. Please try again.'
        );
      }
    } finally {
      if (isMountedRef.current && !controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [isAdmin]);

  useEffect(() => {
    void loadArchiveData();
  }, [loadArchiveData]);

  // Optimistic Restore Mutator (Referentially Stable: 0 Dependency Re-creations)
  const restoreItem = useCallback(
    async (item: Story | Post, type: ArchiveTab): Promise<boolean> => {
      if (!item?.id) return false;

      // 1. Capture atomic state snapshot for rollback
      const previousStories = [...storiesSnapshotRef.current];
      const previousPosts = [...postsSnapshotRef.current];

      // 2. Apply immediate optimistic UI removal
      if (type === 'story') {
        setStories((prev) => prev.filter((s) => s.id !== item.id));
      } else {
        setPosts((prev) => prev.filter((p) => p.id !== item.id));
      }

      try {
        if (type === 'story') {
          await updateStory({ ...(item as Story), isArchived: false });
        } else {
          await updatePost({ ...(item as Post), isArchived: false });
        }
        return true;
      } catch (err: unknown) {
        logger.error(`Failed to restore archived ${type}`, err, { itemId: item.id });

        // 3. Rollback state on mutation failure
        if (isMountedRef.current) {
          setStories(previousStories);
          setPosts(previousPosts);
          setErrorMessage(`Failed to restore ${type}. Reverting optimistic changes.`);
        }
        return false;
      }
    },
    [] // Stable reference preserved across renders
  );

  // Optimistic Delete Mutator (Referentially Stable: 0 Dependency Re-creations)
  const deleteItem = useCallback(
    async (id: string, type: ArchiveTab): Promise<boolean> => {
      if (!id || typeof id !== 'string') return false;

      // 1. Capture atomic state snapshot for rollback
      const previousStories = [...storiesSnapshotRef.current];
      const previousPosts = [...postsSnapshotRef.current];

      // 2. Apply immediate optimistic UI removal
      if (type === 'story') {
        setStories((prev) => prev.filter((s) => s.id !== id));
      } else {
        setPosts((prev) => prev.filter((p) => p.id !== id));
      }

      try {
        if (type === 'story') {
          await deleteStory(id);
        } else {
          await deletePost(id);
        }
        return true;
      } catch (err: unknown) {
        logger.error(`Failed to permanently delete ${type}`, err, { itemId: id });

        // 3. Rollback state on mutation failure
        if (isMountedRef.current) {
          setStories(previousStories);
          setPosts(previousPosts);
          setErrorMessage(`Failed to delete ${type}. Reverting optimistic changes.`);
        }
        return false;
      }
    },
    [] // Stable reference preserved across renders
  );

  return {
    activeTab,
    setActiveTab,
    stories,
    posts,
    isLoading,
    errorMessage,
    restoreItem,
    deleteItem,
    retry: loadArchiveData,
    clearError,
  };
}
