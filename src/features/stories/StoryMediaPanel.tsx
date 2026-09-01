import { useState, useCallback, useEffect, memo } from 'react';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Story } from './types';
import { useStoryNavigation } from './hooks/useStoryNavigation';
import { StoryMediaView } from './components/StoryMediaView';
import { StoryHeader } from './components/StoryHeader';
import { UserRole } from '../../types/user';
import { DeleteStoryModal } from './components/DeleteStoryModal';
import { hasPermission } from '../../lib/core/auth';

interface StoryMediaPanelProps {
  stories: ReadonlyArray<Story>;
  isLoading?: boolean;
  userRole?: UserRole;
  currentUserId?: string;
  onOpenCreate: () => void;
  onOpenEdit: (story: Story) => void;
  onDeleteStory: (storyId: string) => any;
  onPinStory: (story: Story) => void;
  onArchiveStory?: (story: Story) => void;
  onRecordView?: (storyId: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const StoryMediaPanel = memo(function StoryMediaPanel({
  stories,
  isLoading,
  userRole = 'guest',
  currentUserId,
  onOpenCreate,
  onOpenEdit,
  onDeleteStory,
  onPinStory,
  onArchiveStory,
  onRecordView,
  isCollapsed = false,
  onToggleCollapse,
}: StoryMediaPanelProps) {
  const [deletingStoryId, setDeletingStoryId] = useState<string | null>(null);
  const { safeIndex, setCurrentIndex, handleNext, handlePrev, touchHandlers } =
    useStoryNavigation(stories);

  const activeStory = stories[safeIndex];
  const hasStories = stories.length > 0 && !!activeStory;

  useEffect(() => {
    if (activeStory && onRecordView) {
      onRecordView(activeStory.id);
    }
  }, [activeStory?.id, onRecordView]);

  const handleDeleteConfirm = useCallback(async () => {
    if (deletingStoryId) {
      await onDeleteStory(deletingStoryId);
      setDeletingStoryId(null);
    }
  }, [deletingStoryId, onDeleteStory]);

  const handleCloseDeleteModal = useCallback(() => {
    setDeletingStoryId(null);
  }, []);

  return (
    <aside
      aria-label="Stories Panel"
      className={`w-full md:sticky md:top-0 md:shrink-0 h-[100svh] relative flex items-center justify-center select-none m-0 p-0 transition-[width,min-width] duration-300 ease-in-out z-20 ${
        isCollapsed ? 'md:w-0 md:min-w-0 md:border-none bg-transparent' : 'md:w-[380px] lg:w-[420px]'
      }`}
    >
      <main
        {...touchHandlers}
        className={`w-full h-full md:border-r md:border-neutral-200 relative flex items-center justify-center overflow-hidden transition-opacity duration-200 ${
          hasStories ? 'bg-neutral-950' : 'bg-white'
        } ${isCollapsed ? 'md:opacity-0 pointer-events-none' : 'opacity-100'}`}
      >
        {hasStories ? (
          <>
            {/* Media Viewer */}
            <StoryMediaView
              stories={stories}
              activeIndex={safeIndex}
              onVideoEnd={handleNext}
            />

            {/* Tap Navigation Zones with Full Accessibility */}
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous story"
              className="absolute top-16 bottom-20 left-0 w-1/3 z-20 cursor-pointer bg-transparent border-none outline-none focus-visible:bg-white/5"
            />
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next story"
              className="absolute top-16 bottom-20 right-0 w-1/3 z-20 cursor-pointer bg-transparent border-none outline-none focus-visible:bg-white/5"
            />

            {/* Story Meta and Progress Header */}
            <StoryHeader
              stories={stories}
              activeStory={activeStory}
              activeIndex={safeIndex}
              userRole={userRole}
              currentUserId={currentUserId}
              onSelectIndex={setCurrentIndex}
              onOpenCreate={onOpenCreate}
              onOpenEdit={onOpenEdit}
              onDeleteRequest={setDeletingStoryId}
              onPinStory={onPinStory}
              onArchiveStory={onArchiveStory}
            />
          </>
        ) : (
          /* Empty / Blank State */
          <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-30" />
        )}
      </main>

      {/* Collapse/Expand Toggle */}
      <button
        type="button"
        onClick={onToggleCollapse}
        className={`hidden md:flex absolute top-1/2 ${
          isCollapsed ? '-right-10 md:translate-x-0' : '-right-4'
        } w-8 h-8 -mt-4 bg-white border border-neutral-200 rounded-full shadow-md items-center justify-center z-50 hover:bg-neutral-50 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-black cursor-pointer`}
        aria-label={isCollapsed ? 'Expand story panel' : 'Collapse story panel'}
      >
        {isCollapsed ? (
          <ChevronRight className="w-5 h-5 text-neutral-600" />
        ) : (
          <ChevronLeft className="w-5 h-5 text-neutral-600" />
        )}
      </button>

      {/* Delete Confirmation Modal */}
      <DeleteStoryModal
        isOpen={Boolean(deletingStoryId)}
        onClose={handleCloseDeleteModal}
        onConfirm={handleDeleteConfirm}
      />
    </aside>
  );
});

export default StoryMediaPanel;
