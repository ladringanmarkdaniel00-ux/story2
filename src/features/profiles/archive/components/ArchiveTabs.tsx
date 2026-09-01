import React from 'react';
import { PlaySquare, Grid as GridIcon } from 'lucide-react';
import { ArchiveTab } from '../hooks/useArchiveData';

interface ArchiveTabsProps {
  activeTab: ArchiveTab;
  storiesCount: number;
  postsCount: number;
  onChangeTab: (tab: ArchiveTab) => void;
}

export const ArchiveTabs = React.memo<ArchiveTabsProps>(({
  activeTab,
  storiesCount,
  postsCount,
  onChangeTab,
}) => {
  return (
    <div
      role="tablist"
      aria-label="Archive Categories"
      className="flex w-full border-b border-neutral-200 dark:border-neutral-800"
    >
      <button
        type="button"
        role="tab"
        id="tab-stories"
        aria-controls="tabpanel-stories"
        aria-selected={activeTab === 'story'}
        onClick={() => onChangeTab('story')}
        className={`flex-1 flex items-center justify-center gap-2 pb-3.5 text-sm font-medium transition-colors border-b-2 cursor-pointer ${
          activeTab === 'story'
            ? 'text-neutral-900 dark:text-white border-neutral-900 dark:border-white'
            : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 border-transparent'
        }`}
      >
        <PlaySquare className="w-4 h-4" aria-hidden="true" />
        <span>Stories ({storiesCount})</span>
      </button>
      <button
        type="button"
        role="tab"
        id="tab-posts"
        aria-controls="tabpanel-posts"
        aria-selected={activeTab === 'post'}
        onClick={() => onChangeTab('post')}
        className={`flex-1 flex items-center justify-center gap-2 pb-3.5 text-sm font-medium transition-colors border-b-2 cursor-pointer ${
          activeTab === 'post'
            ? 'text-neutral-900 dark:text-white border-neutral-900 dark:border-white'
            : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 border-transparent'
        }`}
      >
        <GridIcon className="w-4 h-4" aria-hidden="true" />
        <span>Posts ({postsCount})</span>
      </button>
    </div>
  );
});
ArchiveTabs.displayName = 'ArchiveTabs';
