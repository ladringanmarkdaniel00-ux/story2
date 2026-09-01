import React, { Suspense, lazy } from 'react';
import { ModalErrorBoundary } from '../../components/ui/ModalErrorBoundary';
import { logger } from '../../lib/core/logger';
import type { UserRole } from '../../types/user';

const formLoaders = {
  StoryForm: () => import('../stories').then((m) => ({ default: m.StoryForm })),
  CreatePost: () => import('../posts/components/CreatePost').then((m) => ({ default: m.CreatePost })),
  EditPost: () => import('../posts/components/EditPost').then((m) => ({ default: m.EditPost })),
};

const StoryForm = lazy(formLoaders.StoryForm);
const CreatePost = lazy(formLoaders.CreatePost);
const EditPost = lazy(formLoaders.EditPost);

export const preloadFormChunk = (chunkKey: keyof typeof formLoaders): void => {
  try {
    formLoaders[chunkKey]();
  } catch (error) {
    logger.warn(`Non-blocking prefetch failed for chunk: ${chunkKey}`, { error: String(error) });
  }
};

interface HomeModalsProps {
  isCreatingStory: boolean;
  editingStory: any;
  isCreatingPost: boolean;
  editingPost: any;
  handleCloseCreateStory: () => void;
  handleStoryCreatedSubmit: (payload: unknown) => Promise<void>;
  handleCloseEditStory: () => void;
  handleStoryUpdatedSubmit: (payload: unknown) => Promise<void>;
  handleCloseCreatePost: () => void;
  handlePostCreatedSubmit: (payload: unknown) => Promise<void>;
  handleCloseEditPost: () => void;
  handlePostUpdatedSubmit: (payload: unknown) => Promise<void>;
  userRole: UserRole;
}

export function HomeModals(props: HomeModalsProps) {
  return (
    <ModalErrorBoundary>
      <Suspense fallback={null}>
        {props.isCreatingStory && (
          <StoryForm
            onClose={props.handleCloseCreateStory}
            onStoryCreated={props.handleStoryCreatedSubmit}
          />
        )}
        {props.editingStory && (
          <StoryForm
            story={props.editingStory}
            onClose={props.handleCloseEditStory}
            onStoryUpdated={props.handleStoryUpdatedSubmit}
          />
        )}
        {props.isCreatingPost && (
          <CreatePost
            onClose={props.handleCloseCreatePost}
            onPostCreated={props.handlePostCreatedSubmit}
            userRole={props.userRole}
          />
        )}
        {props.editingPost && (
          <EditPost
            post={props.editingPost}
            onClose={props.handleCloseEditPost}
            onPostUpdated={props.handlePostUpdatedSubmit}
            userRole={props.userRole}
          />
        )}
      </Suspense>
    </ModalErrorBoundary>
  );
}
