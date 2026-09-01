import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Plus, ImagePlus } from 'lucide-react';

import { Post, PostMedia } from './types';
import { PostMenu } from './PostMenu';
import { PostMediaCarousel } from './components/PostMediaCarousel';
import { PostCard } from './components/PostCard';
import { PostScrubber } from './components/PostScrubber';
import { formatUnixTimestamp } from '../stories/utils';
import { UserRole } from '../../types/user';
import { DeletePostModal } from './components/DeletePostModal';
import { hasPermission } from '../../lib/core/auth';

interface PostFeedProps {
  readonly posts: readonly Post[];
  isLoading?: boolean;
  userRole?: UserRole;
  currentUserId?: string;
  onOpenCreatePost: () => void;
  onOpenCreateStory?: () => void;
  onEditPost: (post: Post) => void;
  onDeletePost: (postId: string) => any;
  onPinPost: (post: Post) => void;
  onArchivePost?: (post: Post) => void;
  isStoryPanelCollapsed?: boolean;
}

export function PostFeed({ posts, isLoading, currentUserId, userRole, onOpenCreatePost, onOpenCreateStory, onEditPost, onDeletePost, onPinPost, onArchivePost, isStoryPanelCollapsed = false }: PostFeedProps) {
  const [currentPostIndex, setCurrentPostIndex] = useState(0);
  const [direction, setDirection] = useState(0);

    const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  
  const safePostIndex = Math.max(0, Math.min(currentPostIndex, posts.length - 1));
  const currentPost = posts[safePostIndex];

  
  useEffect(() => {
    if (currentPostIndex >= posts.length && posts.length > 0) {
      setCurrentPostIndex(posts.length - 1);
    }
  }, [posts.length, currentPostIndex]);

    const paginate = (newDirection: number) => {
    const nextIndex = currentPostIndex + newDirection;
    if (nextIndex >= 0 && nextIndex < posts.length) {
      setDirection(newDirection);
      setCurrentPostIndex(nextIndex);
    }
  };

const swipeConfidenceThreshold = 10000;
  const swipePower = (offset: number, velocity: number) => {
    return Math.abs(offset) * velocity;
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.95
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 300 : -300,
      opacity: 0,
      scale: 0.95
    })
  };

  return (
    <section id="post-feed-section" className="w-full md:flex-1 h-[100dvh] overflow-hidden bg-white md:bg-neutral-50 flex flex-col items-center relative">
      {/* Universal Container */}
      <div id="posts-container" className="flex flex-1 w-full relative items-center justify-center pt-6 md:pt-16 lg:pt-24 pb-16 lg:pb-24 px-3 sm:px-10 md:px-16 xl:px-24">
        {/* Header Controls overlay */}
        <div className="absolute top-4 right-4 md:top-6 md:right-8 z-30 flex items-center gap-2 md:gap-3">
          {hasPermission(userRole, 'story:create') && onOpenCreateStory && (
            <button
              id="btn-create-story"
              type="button"
              onClick={onOpenCreateStory}
              aria-label="Create story"
              className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white border border-neutral-200 hover:bg-neutral-50 text-black shadow-sm flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              <ImagePlus className="w-4 h-4 md:w-4 md:h-4 stroke-[2]" />
            </button>
          )}
          {hasPermission(userRole, 'post:create') && (
            <button
              id="btn-create-post"
              type="button"
              onClick={onOpenCreatePost}
              aria-label="Create post"
              className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-black hover:bg-neutral-800 text-white shadow-sm flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 md:w-5 md:h-5 stroke-[2.5]" />
            </button>
          )}
        </div>

        {posts.length > 0 ? (
          <div className={`w-full h-full max-h-[90vh] lg:max-h-[85vh] flex flex-col items-center justify-center gap-4 sm:gap-6 py-4 transition-all duration-300 ${
            isStoryPanelCollapsed
              ? 'max-w-[min(100%,85vw,550px)] sm:max-w-[min(100%,800px,calc(90dvh*0.75))] lg:max-w-[min(100%,1100px,calc(95dvh*1.3))] xl:max-w-[min(100%,1400px,calc(95dvh*1.7))]'
              : 'max-w-[min(100%,85vw,500px)] sm:max-w-[min(100%,650px,calc(85dvh*0.75))] lg:max-w-[min(100%,950px,calc(90dvh*1.1))] xl:max-w-[min(100%,1200px,calc(90dvh*1.5))]'
          }`}>
            {/* The single Post Card Block */}
            <div className="w-full aspect-[4/5] sm:aspect-[3/4] landscape:aspect-[3/2] lg:aspect-[2/1] xl:aspect-[21/9] 2xl:aspect-[2.5/1] relative flex flex-col shrink-0 max-h-full">
              <AnimatePresence initial={false} custom={direction}>
                  <motion.div
                    key={safePostIndex}
                    custom={direction}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                      x: { type: 'spring', stiffness: 300, damping: 30 },
                      opacity: { duration: 0.2 },
                      scale: { duration: 0.2 }
                    }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={1}
                    onDragEnd={(e, { offset, velocity }) => {
                      const swipe = swipePower(offset.x, velocity.x);

                      if (swipe < -swipeConfidenceThreshold || offset.x < -100) {
                        paginate(1);
                      } else if (swipe > swipeConfidenceThreshold || offset.x > 100) {
                        paginate(-1);
                      }
                    }}
                    className="absolute inset-0 w-full h-full overflow-hidden flex flex-col cursor-grab active:cursor-grabbing"
                  >
                    <PostCard 
                      post={currentPost} 
                      postIndex={safePostIndex} 
                      userRole={userRole}
                      isStoryPanelCollapsed={isStoryPanelCollapsed}
                      onEdit={() => onEditPost(currentPost)}
                      onDelete={() => setDeletingPostId(currentPost.id)}
                      onPin={() => onPinPost(currentPost)}
                      onArchive={() => onArchivePost?.(currentPost)}
                    />
                  </motion.div>
                </AnimatePresence>
              </div>

            {/* Carousel Indicators */}
            <PostScrubber 
              posts={posts} 
              activeIndex={safePostIndex} 
              isStoryPanelCollapsed={isStoryPanelCollapsed}
              onSelectIndex={(idx) => {
                setDirection(idx > currentPostIndex ? 1 : -1);
                setCurrentPostIndex(idx);
              }}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-neutral-500 gap-1.5">
            <div className="font-medium text-lg">no post for now :)</div>
            <div className="text-sm text-neutral-400">
              {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        )}
      </div>

      <DeletePostModal
        isOpen={!!deletingPostId}
        onClose={() => setDeletingPostId(null)}
        postTitle={
          posts.find((p) => p.id === deletingPostId)?.title ||
          posts.find((p) => p.id === deletingPostId)?.caption?.slice(0, 30)
        }
        postAuthorId={posts.find((p) => p.id === deletingPostId)?.userId}
        userRole={userRole}
        onConfirm={() => {
          if (deletingPostId) {
            onDeletePost(deletingPostId);
            setDeletingPostId(null);
          }
        }}
      />
    </section>
  );
}
