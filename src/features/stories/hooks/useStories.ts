/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  type Story,
  type CreateStoryInput,
  fetchStories,
  createStory,
  updateStory,
  deleteStory,
} from '../index';
import { getFromLocal, saveToLocal, sortStories, areStoriesEqual } from '../utils';
import { logger } from '../../../utils/logger';

const STORIES_KEY = 'local_stories';

export interface UseStoriesReturn {
  stories: ReadonlyArray<Story>;
  allStories: ReadonlyArray<Story>;
  isLoading: boolean;
  isCreating: boolean;
  setIsCreating: (isCreating: boolean) => void;
  editingStory: Story | null;
  setEditingStory: (story: Story | null) => void;
  handleCreate: (input: CreateStoryInput | Story) => Promise<Story | null>;
  handleUpdate: (updated: Story) => Promise<boolean>;
  handleDelete: (id: string) => Promise<boolean>;
  handlePin: (story: Story) => Promise<boolean>;
  handleArchive: (story: Story) => Promise<boolean>;
  handleRecordView: (id: string) => Promise<void>;
  setStories: React.Dispatch<React.SetStateAction<ReadonlyArray<Story>>>;
  sortStories: typeof sortStories;
}

export function useStories(): UseStoriesReturn {
  const [stories, setStories] = useState<ReadonlyArray<Story>>(() => {
    try {
      const cached = getFromLocal<Story[]>('local_stories') || [];
      const now = Date.now();
      return sortStories(cached.map((s) => {
        if (s.expiresAt && s.expiresAt <= now && !s.isArchived) {
          return { ...s, isArchived: true };
        }
        return s;
      }));
    } catch {
      return [];
    }
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [editingStory, setEditingStory] = useState<Story | null>(null);

  // Keep a ref to stories for atomic, race-condition-free rollbacks
  const storiesRef = useRef<ReadonlyArray<Story>>(stories);
  useEffect(() => {
    storiesRef.current = stories;
  }, [stories]);

  // Load from durable storage (IndexedDB) on mount
  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const persisted = await fetchStories();
        if (isMounted && persisted) {
          const sorted = sortStories(persisted);
          setStories((prev) => {
            if (areStoriesEqual(prev, sorted)) {
              return prev;
            }
            saveToLocal(STORIES_KEY, sorted);
            return sorted;
          });
        }
      } catch (err) {
        logger.warn('[useStories] Error loading persistent stories', undefined, {
          error: err instanceof Error ? err.message : String(err),
        });
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  // Optimistic create with granular rollback
  const handleCreate = useCallback(async (input: CreateStoryInput | Story): Promise<Story | null> => {
    const now = Date.now();
    const newStory: Story =
      'id' in input
        ? input
        : {
            id:
              typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : `story-${now}-${Math.random().toString(36).slice(2, 7)}`,
            mediaUrl: input.mediaUrl,
            mediaType: input.mediaType,
            caption: input.caption || '',
            createdAt: now,
            expiresAt:
              input.durationMs === Number.MAX_SAFE_INTEGER
                ? Number.MAX_SAFE_INTEGER
                : now + (input.durationMs ?? 86400000),
            isPinned: false,
            viewerCount: 0,
          };

    // Mark as viewed by creator so it doesn't increment their own view
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(`viewed_story_${newStory.id}`, '1');
    }

    // Apply optimistic update
    setStories((prev) => {
      const next = sortStories([newStory, ...prev.filter((s) => s.id !== newStory.id)]);
      saveToLocal(STORIES_KEY, next);
      return next;
    });

    try {
      await createStory(newStory);
      return newStory;
    } catch (err) {
      // Granular rollback: remove only the failed story
      setStories((prev) => {
        const reverted = prev.filter((s) => s.id !== newStory.id);
        saveToLocal(STORIES_KEY, reverted);
        return reverted;
      });
      logger.error('Failed to create story', undefined, undefined, {
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }, []);

  // Optimistic update with granular rollback
  const handleUpdate = useCallback(async (updated: Story): Promise<boolean> => {
    const originalStory = storiesRef.current.find((s) => s.id === updated.id);

    // Apply optimistic update
    setStories((prev) => {
      const next = sortStories(prev.map((s) => (s.id === updated.id ? updated : s)));
      saveToLocal(STORIES_KEY, next);
      return next;
    });

    try {
      await updateStory(updated);
      return true;
    } catch (err) {
      // Granular rollback: revert only the specific target story
      if (originalStory) {
        setStories((prev) => {
          const reverted = sortStories(
            prev.map((s) => (s.id === updated.id ? originalStory : s))
          );
          saveToLocal(STORIES_KEY, reverted);
          return reverted;
        });
      }
      logger.error('Failed to update story', undefined, undefined, {
        error: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  }, []);

  // Optimistic delete with granular rollback
  const handleDelete = useCallback(async (id: string): Promise<boolean> => {
    const storyToDelete = storiesRef.current.find((s) => s.id === id);

    // Apply optimistic delete
    setStories((prev) => {
      const next = prev.filter((s) => s.id !== id);
      saveToLocal(STORIES_KEY, next);
      return next;
    });

    try {
      await deleteStory(id);
      return true;
    } catch (err) {
      // Granular rollback: re-insert deleted story
      if (storyToDelete) {
        setStories((prev) => {
          const reverted = sortStories([...prev, storyToDelete]);
          saveToLocal(STORIES_KEY, reverted);
          return reverted;
        });
      }
      logger.error('Failed to delete story', undefined, undefined, {
        error: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  }, []);

  const handlePin = useCallback(
    (story: Story) => handleUpdate({ ...story, isPinned: !story.isPinned }),
    [handleUpdate]
  );

  const handleArchive = useCallback(
    (story: Story) => handleUpdate({ ...story, isArchived: true }),
    [handleUpdate]
  );

  const handleRecordView = useCallback(async (id: string): Promise<void> => {
    if (typeof window === 'undefined') return;
    
    // Prevent spamming views from the same session
    const viewedKey = `viewed_story_${id}`;
    if (sessionStorage.getItem(viewedKey)) return;
    sessionStorage.setItem(viewedKey, '1');

    const storyToUpdate = storiesRef.current.find(s => s.id === id);
    if (!storyToUpdate) return;
    
    const updatedStory = { ...storyToUpdate, viewerCount: (storyToUpdate.viewerCount || 0) + 1 };

    // 1. Optimistic local update
    setStories((prev) => {
      const next = sortStories(
        prev.map((s) => (s.id === id ? updatedStory : s))
      );
      saveToLocal(STORIES_KEY, next);
      return next;
    });
    
    // Save to IndexedDB so it persists on reload
    import('../utils').then(({ updateStory }) => {
      updateStory(updatedStory).catch(() => {});
    });

    // 2. Fire and forget to Supabase RPC
    try {
      const { supabase } = await import('../../../lib/supabase/client');
      let sessionId = sessionStorage.getItem('story_session_id');
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        sessionStorage.setItem('story_session_id', sessionId);
      }
      
      // We don't await this so it doesn't block
      (supabase.rpc as any)('increment_story_view', {
        p_story_id: id,
        p_session_id: sessionId
      }).catch(() => {});
    } catch (err) {
      // Ignore if supabase client fails to load
    }
  }, [setStories]);

  // Memoize active (unarchived) stories

  const activeStories = useMemo(() => {
    return stories.filter((s) => !s.isArchived);
  }, [stories]);

  return {
    stories: activeStories,
    allStories: stories,
    isLoading,
    isCreating,
    setIsCreating,
    editingStory,
    setEditingStory,
    handleCreate,
    handleUpdate,
    handleDelete,
    handlePin,
    handleArchive,
    handleRecordView,
    setStories,
    sortStories,
  };
}

export default useStories;
