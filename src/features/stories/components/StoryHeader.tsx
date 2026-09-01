import React from 'react';
import { Eye } from 'lucide-react';
import { Story } from '../types';
import { UserRole } from '../../../types/user';
import { StoryMenu } from './StoryMenu';

export interface StoryHeaderProps {
  stories: readonly Story[];
  activeStory: Story;
  activeIndex: number;
  userRole: UserRole;
  currentUserId?: string;
  onSelectIndex: (index: number) => void;
  onOpenCreate: () => void;
  onOpenEdit: (story: Story) => void;
  onDeleteRequest: (storyId: string) => void;
  onPinStory: (story: Story) => void;
  onArchiveStory?: (story: Story) => void;
}

const getTimeAgo = (timestamp: number) => {
  const diffMs = Date.now() - timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${Math.max(1, diffMins)}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  return `${Math.floor(diffHours / 24)}d`;
};

export const StoryHeader = React.memo(function StoryHeader({
  stories,
  activeStory,
  activeIndex,
  userRole,
  currentUserId,
  onSelectIndex,
  onOpenCreate,
  onOpenEdit,
  onDeleteRequest,
  onPinStory,
  onArchiveStory,
}: StoryHeaderProps) {
  return (
    <header className="absolute top-0 left-0 right-0 z-30 p-4 pt-6 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
      <div className="flex items-start justify-between pointer-events-auto">
        <div className="flex flex-col items-start gap-2">
          <div className="flex gap-1.5">
            {stories.map((story, i) => (
              <div 
                key={story.id}
                onClick={() => onSelectIndex(i)}
                className={`h-2 rounded-full cursor-pointer transition-all duration-300 ${
                  i === activeIndex ? 'w-6 bg-white' : 'w-2 bg-white/40 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
          
          <span className="text-white font-semibold text-sm drop-shadow-md">
            {activeStory ? getTimeAgo(activeStory.createdAt) : ''}
          </span>
        </div>

        <div className="flex items-center gap-3 pointer-events-auto">
          {(userRole === 'admin' || activeStory?.authorId === currentUserId) && activeStory && (
            <div className="flex items-center gap-1.5 text-white/90 bg-black/40 px-2 py-1 rounded-full text-xs font-medium backdrop-blur-md mr-1">
              <Eye className="w-3.5 h-3.5" />
              <span>{activeStory.viewerCount || 0}</span>
            </div>
          )}
          {(userRole === 'admin' || activeStory?.authorId === currentUserId) && activeStory && (
            <StoryMenu 
              isPinned={activeStory.isPinned}
              onPin={() => onPinStory(activeStory)}
              onEdit={() => onOpenEdit(activeStory)}
              onDelete={() => onDeleteRequest(activeStory.id)}
              onArchive={onArchiveStory ? () => onArchiveStory(activeStory) : undefined}
            />
          )}
        </div>
      </div>
    </header>
  );
});

