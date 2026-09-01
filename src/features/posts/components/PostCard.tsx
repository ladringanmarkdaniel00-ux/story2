/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { type Post, type PostMedia } from '../types';
import { PostMenu } from '../PostMenu';
import { PostMediaCarousel } from './PostMediaCarousel';
import { formatUnixTimestamp } from '../../stories/utils';
import { type UserRole } from '../../../types/user';
import { isResourceOwnerOrAdmin } from "../../../lib/core/auth";

// ============================================================================
// 1. IMMUTABLE TYPE CONTRACTS
// ============================================================================

const SAFE_PROTOCOLS = new Set(['https:', 'http:', 'blob:', 'data:']);

function isValidMediaUrl(urlStr?: string): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  try {
    const parsed = new URL(urlStr, window.location.href);
    return SAFE_PROTOCOLS.has(parsed.protocol);
  } catch {
    return false;
  }
}

function safeFormatDate(timestamp: number | string | Date | undefined): { readonly formatted: string; readonly iso: string } {
  try {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp ?? Date.now());
    if (isNaN(date.getTime())) {
      return { formatted: 'recently', iso: new Date().toISOString() };
    }
    return {
      formatted: formatUnixTimestamp(date.getTime()),
      iso: date.toISOString(),
    };
  } catch {
    return { formatted: 'recently', iso: new Date().toISOString() };
  }
}

export interface PostCardProps {
  readonly post: Readonly<Post>;
  readonly postIndex?: number;
  readonly userRole?: UserRole;
  readonly currentUserId?: string;
  readonly isStoryPanelCollapsed?: boolean;
  readonly onEdit: () => void;
  readonly onDelete: () => void;
  readonly onPin: () => void;
  readonly onArchive?: () => void;
}

// ============================================================================
// 2. MAIN POST CARD COMPONENT
// ============================================================================

export function PostCard({
  post,
  postIndex = 0,
  userRole = 'guest',
  currentUserId,
  isStoryPanelCollapsed = false,
  onEdit,
  onDelete,
  onPin,
  onArchive,
}: PostCardProps): React.JSX.Element {
  // Sanitize and normalize media collection with protocol verification
  const mediaList: ReadonlyArray<PostMedia> = useMemo(() => {
    if (Array.isArray(post.media) && post.media.length > 0) {
      return post.media.filter((item) => isValidMediaUrl(item.url));
    }
    if (post.mediaUrl && isValidMediaUrl(post.mediaUrl)) {
      return [{ url: post.mediaUrl, type: post.mediaType || 'image' }];
    }
    return [];
  }, [post.media, post.mediaUrl, post.mediaType]);

  const hasCaption = Boolean(post.caption && post.caption.trim().length > 0);
  const isSingleLineCaption = Boolean(
    hasCaption && post.caption && post.caption.length < 80 && !post.caption.includes('\n')
  );
  const useRowLayout = Boolean(hasCaption && !isSingleLineCaption);

  // RBAC & Ownership Validation
  const canManagePost = isResourceOwnerOrAdmin(post.userId, currentUserId, userRole);

  const { formatted: formattedDate, iso: isoDate } = safeFormatDate(post.createdAt);
  const headingId = `post-heading-${post.id}`;

  return (
    <article
      id={`post-card-${post.id}`}
      aria-labelledby={post.title ? headingId : undefined}
      aria-label={!post.title ? `Post from ${formattedDate}` : undefined}
      className={`w-full h-full flex flex-col relative ${
        mediaList.length > 0 ? 'p-3.5 sm:p-4 md:p-5' : 'p-5 sm:p-6 md:p-8 justify-center'
      }`}
    >
      {/* RBAC & Ownership Action Menu */}
      {canManagePost && (
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20">
          <PostMenu
            isPinned={post.isPinned}
            onPin={onPin}
            onEdit={onEdit}
            onDelete={onDelete}
            onArchive={onArchive}
          />
        </div>
      )}

      {/* Post Heading */}
      {post.title && (
        <div
          className={`w-full shrink-0 flex justify-start ${
            mediaList.length === 0 ? 'pb-4 sm:pb-6' : 'pb-3 sm:pb-4'
          } z-10 ${
            mediaList.length > 0 && !useRowLayout ? 'sm:max-w-[90%] md:max-w-[85%] lg:max-w-[60%] mx-auto' : ''
          }`}
        >
          <h2
            id={headingId}
            className={`w-full font-bold text-neutral-900 leading-tight text-left ${
              mediaList.length === 0 ? 'text-2xl sm:text-3xl lg:text-4xl' : 'text-xl sm:text-2xl lg:text-3xl'
            }`}
          >
            {post.title}
          </h2>
        </div>
      )}

      {/* Main Content Layout Container */}
      <div
        className={`w-full h-full flex flex-col flex-1 min-w-0 overflow-hidden justify-center items-center ${
          useRowLayout ? 'landscape:flex-row lg:flex-row' : ''
        } ${mediaList.length > 0 ? 'gap-3 sm:gap-4 lg:gap-6 landscape:gap-6' : 'items-center'}`}
      >
        <PostMediaCarousel
          mediaList={mediaList as PostMedia[]}
          userRole={userRole}
          isFirstItem={postIndex === 0}
          useRowLayout={useRowLayout}
        />

        {/* Caption & Metadata Section */}
        <div
          className={`w-full flex flex-col min-w-0 min-h-0 max-h-full overflow-y-auto no-scrollbar ${
            useRowLayout ? 'flex-1 shrink' : 'shrink-0'
          } ${
            mediaList.length > 0
              ? `pt-1 sm:pt-2 pb-1 ${useRowLayout ? 'landscape:pt-0 lg:pt-0 lg:my-auto landscape:my-auto' : ''}`
              : 'flex-1 pt-0 pb-1 justify-center items-center text-left'
          }`}
        >
          {post.caption && (
            <p
              className={`text-neutral-900 break-words whitespace-pre-wrap min-w-0 pr-0 ${
                isSingleLineCaption ? 'text-center' : 'text-justify [text-justify:inter-word] hyphens-auto'
              } ${
                mediaList.length > 0
                  ? `w-full ${
                      isStoryPanelCollapsed
                        ? 'text-xs sm:text-sm lg:text-base leading-snug'
                        : 'text-[11px] sm:text-xs lg:text-sm leading-snug'
                    }`
                  : `w-fit max-w-full ${
                      isStoryPanelCollapsed
                        ? 'text-lg sm:text-xl lg:text-2xl font-medium leading-tight'
                        : 'text-base sm:text-lg lg:text-xl font-medium leading-tight'
                    }`
              }`}
            >
              {post.caption}
            </p>
          )}

          {/* Accessible Semantic Timestamp */}
          <div
            className={`w-full flex justify-center ${
              mediaList.length > 0 ? (post.caption ? 'mt-2' : 'mt-0') : 'mt-4'
            }`}
          >
            <time
              dateTime={isoDate}
              className="text-neutral-400/60 text-[10px] font-normal tracking-wide lowercase tabular-nums select-none"
            >
              {formattedDate}
            </time>
          </div>
        </div>
      </div>
    </article>
  );
}

export default PostCard;
