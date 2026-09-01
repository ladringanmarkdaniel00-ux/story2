import React, { useState, useRef, useEffect, useMemo } from 'react';
import { PlaySquare, MoreVertical, Trash2, RefreshCcw, Plus, FileQuestion } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Story } from '../../../stories';
import { Post } from '../../../posts';
import { ArchiveTab } from '../hooks/useArchiveData';
import { extractMedia } from '../utils/mediaExtractor';

interface ArchiveCardProps {
  readonly item: Story | Post;
  readonly type: ArchiveTab;
  readonly onRestore: () => void;
  readonly onRequestDelete: () => void;
  readonly onView: () => void;
  readonly isAdmin: boolean;
}

export const ArchiveCard = React.memo<ArchiveCardProps>(({
  item,
  type,
  onRestore,
  onRequestDelete,
  onView,
  isAdmin,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const mediaList = useMemo(() => extractMedia(item, type), [item, type]);
  const hasMultipleMedia = mediaList.length > 1;
  const primaryMedia = mediaList[0];

  const dateLabel = useMemo(() => {
    try {
      const parsed = new Date(item.createdAt);
      if (Number.isNaN(parsed.getTime())) return 'Undated';
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(parsed);
    } catch {
      return 'Undated';
    }
  }, [item.createdAt]);

  useEffect(() => {
    if (!isMenuOpen) return;
    function handleDismiss(event: MouseEvent | KeyboardEvent) {
      if (event instanceof KeyboardEvent && event.key === 'Escape') {
        setIsMenuOpen(false);
        return;
      }
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleDismiss);
    document.addEventListener('keydown', handleDismiss);
    return () => {
      document.removeEventListener('mousedown', handleDismiss);
      document.removeEventListener('keydown', handleDismiss);
    };
  }, [isMenuOpen]);

  const postTitle = type === 'post' ? (item as Post).title : undefined;

  return (
    <article
      className={`relative bg-neutral-200 dark:bg-neutral-800 rounded-2xl overflow-hidden group focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-neutral-900 ${
        type === 'story' ? 'aspect-[9/16]' : 'aspect-square'
      }`}
      aria-label={`${type} archived on ${dateLabel}`}
    >
      <div
        className="w-full h-full cursor-pointer select-none"
        onClick={onView}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onView();
          }
        }}
        aria-label="Inspect media details"
      >
        {primaryMedia?.url ? (
          <>
            {primaryMedia.type === 'video' ? (
              <video
                src={primaryMedia.url}
                className="w-full h-full object-cover pointer-events-none"
                muted
                playsInline
                preload="none"
                aria-label={item.caption || postTitle || 'Archived video preview'}
              />
            ) : (
              <img
                src={primaryMedia.url}
                alt={item.caption || postTitle || 'Archived asset preview'}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            )}
            <div className="absolute inset-x-0 bottom-0 p-3 pt-8 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none">
              {postTitle && (
                <h2 className="text-white font-semibold text-sm line-clamp-1 mb-0.5 drop-shadow-sm">
                  {postTitle}
                </h2>
              )}
              {item.caption && (
                <p className="text-white/90 text-xs line-clamp-1 drop-shadow-sm">
                  {item.caption}
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-white dark:bg-neutral-900 p-4 text-center gap-2">
            <FileQuestion className="w-6 h-6 text-neutral-400" aria-hidden="true" />
            <p className="text-sm text-neutral-800 dark:text-neutral-200 line-clamp-4 break-words">
              {item.caption || 'Text-only archive entry'}
            </p>
          </div>
        )}
      </div>

      <div className="absolute top-2 right-2 flex items-center gap-1.5 z-20">
        {hasMultipleMedia && (
          <div
            className="bg-black/60 backdrop-blur-md text-white p-1.5 rounded-lg shadow-sm pointer-events-none"
            aria-label="Multiple media items"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
          </div>
        )}

        <time
          dateTime={item.createdAt.toString()}
          className="bg-black/60 backdrop-blur-md text-white text-xs font-medium px-2 py-1.5 rounded-lg shadow-sm select-none"
        >
          {dateLabel}
        </time>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen((prev) => !prev);
            }}
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
            aria-label="Open item management options"
            className="p-1.5 bg-black/60 hover:bg-black/80 backdrop-blur-md text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-white cursor-pointer"
          >
            <MoreVertical className="w-4 h-4" aria-hidden="true" />
          </button>

          <AnimatePresence>
            {isMenuOpen && (
              <motion.div
                role="menu"
                aria-orientation="vertical"
                initial={{ opacity: 0, scale: 0.95, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -8 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 top-full mt-2 w-40 bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-100 dark:border-neutral-800 py-1.5 overflow-hidden origin-top-right z-30"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMenuOpen(false);
                    onView();
                  }}
                  className="w-full px-3 py-2 flex items-center gap-2.5 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-left text-sm cursor-pointer"
                >
                  <PlaySquare className="w-4 h-4 text-neutral-500" aria-hidden="true" />
                  <span>Inspect</span>
                </button>

                {isAdmin && (
                  <>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMenuOpen(false);
                        onRestore();
                      }}
                      className="w-full px-3 py-2 flex items-center gap-2.5 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-left text-sm cursor-pointer"
                    >
                      <RefreshCcw className="w-4 h-4 text-neutral-500" aria-hidden="true" />
                      <span>Restore</span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMenuOpen(false);
                        onRequestDelete();
                      }}
                      className="w-full px-3 py-2 flex items-center gap-2.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors text-left text-sm cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" aria-hidden="true" />
                      <span>Delete</span>
                    </button>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </article>
  );
});
ArchiveCard.displayName = 'ArchiveCard';
