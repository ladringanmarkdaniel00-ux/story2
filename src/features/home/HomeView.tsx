/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useStore } from '../../store';
import { useMediaProtection } from '../../hooks/useMediaProtection';
import { useStories, StoryMediaPanel } from '../stories';
import { usePosts, PostFeed } from '../posts';
import { UserRole } from '../../types/user';
import { logger } from '../../lib/core/logger';

// Extracted Domain Logic
import { StoryPayloadSchema, PostPayloadSchema, type StoryPayload, type PostPayload } from './schemas';
import { generateIdempotencyKey } from './utils';
import { HomeModals, preloadFormChunk } from './HomeModals';

// ============================================================================
// MAIN HOME VIEW COMPONENT
// ============================================================================

export function HomeView(): React.JSX.Element {
  const profile = useStore((state) => state.profile);
  const user = useStore((state) => state.user);
  const userRole = profile?.role as UserRole;
  const currentUserId = user?.id || '';
  const [isStoryPanelCollapsed, setIsStoryPanelCollapsed] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const containerRef = useRef<HTMLElement>(null);
  const isMountedRef = useRef<boolean>(true);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const activeAbortControllerRef = useRef<AbortController | null>(null);

  // Lifecycle Mount Tracking & Abort Cleanup
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (activeAbortControllerRef.current) {
        activeAbortControllerRef.current.abort();
      }
    };
  }, []);

  // Media Inspection & Direct Action Protection for Non-Admins
  useMediaProtection(containerRef, userRole !== 'admin');

  // Domain Controllers
  const {
    stories,
    isLoading: isStoriesLoading,
    isCreating: isCreatingStory,
    editingStory,
    setIsCreating: setIsCreatingStory,
    setEditingStory,
    handleCreate: handleStoryCreate,
    handleUpdate: handleStoryUpdate,
    handleDelete: handleStoryDelete,
    handlePin: handleStoryPin,
    handleArchive: handleStoryArchive,
    handleRecordView: handleStoryRecordView,
  } = useStories();

  const {
    posts,
    isLoading: isPostsLoading,
    isCreating: isCreatingPost,
    editingPost,
    setIsCreating: setIsCreatingPost,
    setEditingPost,
    handleCreate: handlePostCreate,
    handleUpdate: handlePostUpdate,
    handleDelete: handlePostDelete,
    handlePin: handlePostPin,
    handleArchive: handlePostArchive,
  } = usePosts();

  const hasActiveModal = Boolean(isCreatingStory || editingStory || isCreatingPost || editingPost);

  // WAI-ARIA Focus Restoration & Modal Dismissal Lifecycles
  useEffect(() => {
    if (hasActiveModal) {
      previousActiveElementRef.current = document.activeElement as HTMLElement | null;
    } else if (previousActiveElementRef.current) {
      previousActiveElementRef.current.focus?.();
      previousActiveElementRef.current = null;
    }
  }, [hasActiveModal]);

  // Global Keyboard Navigation: Close Modal on Escape
  useEffect(() => {
    if (!hasActiveModal) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) {
        event.preventDefault();
        setIsCreatingStory(false);
        setEditingStory(null);
        setIsCreatingPost(false);
        setEditingPost(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [hasActiveModal, isSubmitting, setIsCreatingStory, setEditingStory, setIsCreatingPost, setEditingPost]);

  // Story Action Handlers with Runtime Validation & Idempotency
  const handleOpenCreateStory = useCallback(() => {
    preloadFormChunk('StoryForm');
    setIsCreatingStory(true);
  }, [setIsCreatingStory]);

  const handleCloseCreateStory = useCallback(() => {
    if (!isSubmitting) setIsCreatingStory(false);
  }, [isSubmitting, setIsCreatingStory]);

  const handleCloseEditStory = useCallback(() => {
    if (!isSubmitting) setEditingStory(null);
  }, [isSubmitting, setEditingStory]);

  const handleStoryCreatedSubmit = useCallback(
    async (rawInput: unknown): Promise<void> => {
      if (isSubmitting) return;

      const parseResult = StoryPayloadSchema.safeParse(rawInput);
      if (!parseResult.success) {
        logger.warn('Client schema validation failed for story creation', { errors: parseResult.error.flatten() });
        return;
      }

      const payloadWithIdempotency: StoryPayload = {
        ...parseResult.data,
        idempotencyKey: parseResult.data.idempotencyKey ?? generateIdempotencyKey(),
      };

      setIsSubmitting(true);
      activeAbortControllerRef.current = new AbortController();

      try {
        await handleStoryCreate(payloadWithIdempotency as any);
        if (isMountedRef.current) {
          setIsCreatingStory(false);
        }
      } catch (error: unknown) {
        logger.error('Failed to create story', error instanceof Error ? error : new Error(String(error)));
      } finally {
        if (isMountedRef.current) {
          setIsSubmitting(false);
        }
      }
    },
    [handleStoryCreate, isSubmitting, setIsCreatingStory]
  );

  const handleStoryUpdatedSubmit = useCallback(
    async (rawInput: unknown): Promise<void> => {
      if (isSubmitting) return;

      const parseResult = StoryPayloadSchema.safeParse(rawInput);
      if (!parseResult.success) {
        logger.warn('Client schema validation failed for story update', { errors: parseResult.error.flatten() });
        return;
      }

      const payloadWithIdempotency: StoryPayload = {
        ...parseResult.data,
        idempotencyKey: parseResult.data.idempotencyKey ?? generateIdempotencyKey(),
      };

      setIsSubmitting(true);
      activeAbortControllerRef.current = new AbortController();

      try {
        await handleStoryUpdate(payloadWithIdempotency as any);
        if (isMountedRef.current) {
          setEditingStory(null);
        }
      } catch (error: unknown) {
        logger.error('Failed to update story', error instanceof Error ? error : new Error(String(error)));
      } finally {
        if (isMountedRef.current) {
          setIsSubmitting(false);
        }
      }
    },
    [handleStoryUpdate, isSubmitting, setEditingStory]
  );

  // Post Action Handlers with Runtime Validation & Idempotency
  const handleOpenCreatePost = useCallback(() => {
    preloadFormChunk('CreatePost');
    setIsCreatingPost(true);
  }, [setIsCreatingPost]);

  const handleCloseCreatePost = useCallback(() => {
    if (!isSubmitting) setIsCreatingPost(false);
  }, [isSubmitting, setIsCreatingPost]);

  const handleCloseEditPost = useCallback(() => {
    if (!isSubmitting) setEditingPost(null);
  }, [isSubmitting, setEditingPost]);

  const handlePostCreatedSubmit = useCallback(
    async (rawInput: unknown): Promise<void> => {
      if (isSubmitting) return;

      const parseResult = PostPayloadSchema.safeParse(rawInput);
      if (!parseResult.success) {
        logger.warn('Client schema validation failed for post creation', { errors: parseResult.error.flatten() });
        return;
      }

      const payloadWithIdempotency: PostPayload = {
        ...parseResult.data,
        idempotencyKey: parseResult.data.idempotencyKey ?? generateIdempotencyKey(),
      };

      setIsSubmitting(true);
      activeAbortControllerRef.current = new AbortController();

      try {
        await handlePostCreate(payloadWithIdempotency as any);
        if (isMountedRef.current) {
          setIsCreatingPost(false);
        }
      } catch (error: unknown) {
        logger.error('Failed to create post', error instanceof Error ? error : new Error(String(error)));
      } finally {
        if (isMountedRef.current) {
          setIsSubmitting(false);
        }
      }
    },
    [handlePostCreate, isSubmitting, setIsCreatingPost]
  );

  const handlePostUpdatedSubmit = useCallback(
    async (rawInput: unknown): Promise<void> => {
      if (isSubmitting) return;

      const parseResult = PostPayloadSchema.safeParse(rawInput);
      if (!parseResult.success) {
        logger.warn('Client schema validation failed for post update', { errors: parseResult.error.flatten() });
        return;
      }

      const payloadWithIdempotency: PostPayload = {
        ...parseResult.data,
        idempotencyKey: parseResult.data.idempotencyKey ?? generateIdempotencyKey(),
      };

      setIsSubmitting(true);
      activeAbortControllerRef.current = new AbortController();

      try {
        await handlePostUpdate(payloadWithIdempotency as any);
        if (isMountedRef.current) {
          setEditingPost(null);
        }
      } catch (error: unknown) {
        logger.error('Failed to update post', error instanceof Error ? error : new Error(String(error)));
      } finally {
        if (isMountedRef.current) {
          setIsSubmitting(false);
        }
      }
    },
    [handlePostUpdate, isSubmitting, setEditingPost]
  );

  const handleToggleStoryCollapse = useCallback((): void => {
    setIsStoryPanelCollapsed((prev) => !prev);
  }, []);

  // Zero Cumulative Layout Shift (CLS) Visibility Computations
  const isStoriesEmpty = !isStoriesLoading && stories.length === 0;
  const hideStoryPanel = isStoriesEmpty && userRole !== 'admin';
  const isCollapsed = hideStoryPanel || isStoryPanelCollapsed;

  return (
    <>
      <main
        ref={containerRef}
        id="page-home"
        aria-hidden={hasActiveModal ? true : undefined}
        inert={hasActiveModal ? true : undefined}
        className="w-full min-h-screen md:h-[100svh] bg-white overflow-x-hidden md:overflow-hidden text-black relative flex flex-col md:flex-row md:items-start"
      >
        {/* Story Media Panel */}
        {!hideStoryPanel && (
          <StoryMediaPanel
            stories={stories}
            isLoading={isStoriesLoading}
            userRole={userRole}
            currentUserId={currentUserId}
            onOpenCreate={handleOpenCreateStory}
            onOpenEdit={setEditingStory}
            onDeleteStory={handleStoryDelete}
            onPinStory={handleStoryPin}
            onArchiveStory={handleStoryArchive}
            onRecordView={handleStoryRecordView}
            isCollapsed={isStoryPanelCollapsed}
            onToggleCollapse={handleToggleStoryCollapse}
          />
        )}

        {/* Main Post Feed Section */}
        <PostFeed
          posts={posts}
          isLoading={isPostsLoading}
          userRole={userRole}
          currentUserId={currentUserId}
          onOpenCreatePost={handleOpenCreatePost}
          onOpenCreateStory={handleOpenCreateStory}
          onEditPost={setEditingPost}
          onDeletePost={handlePostDelete}
          onPinPost={handlePostPin}
          onArchivePost={handlePostArchive}
          isStoryPanelCollapsed={isCollapsed}
        />
      </main>

      <HomeModals
        isCreatingStory={isCreatingStory}
        editingStory={editingStory}
        isCreatingPost={isCreatingPost}
        editingPost={editingPost}
        handleCloseCreateStory={handleCloseCreateStory}
        handleStoryCreatedSubmit={handleStoryCreatedSubmit}
        handleCloseEditStory={handleCloseEditStory}
        handleStoryUpdatedSubmit={handleStoryUpdatedSubmit}
        handleCloseCreatePost={handleCloseCreatePost}
        handlePostCreatedSubmit={handlePostCreatedSubmit}
        handleCloseEditPost={handleCloseEditPost}
        handlePostUpdatedSubmit={handlePostUpdatedSubmit}
        userRole={userRole}
      />
    </>
  );
}

export default HomeView;
