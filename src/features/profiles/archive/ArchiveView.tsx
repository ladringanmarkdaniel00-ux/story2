import React from 'react';
import { ArrowLeft, Shield, AlertTriangle, PlaySquare, Grid as GridIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useArchiveMachine } from './hooks/useArchiveMachine';
import { ArchiveTabs } from './components/ArchiveTabs';
import { ArchiveCard } from './components/ArchiveCard';
import { ArchiveInspectionModal } from './components/ArchiveInspectionModal';
import { ArchiveDeleteModal } from './components/ArchiveDeleteModal';

export function ArchiveView(): React.JSX.Element {
  const {
    isAdmin,
    archiveData,
    viewingTarget,
    viewerIndex,
    itemPendingDeletion,
    isDeleting,
    modalRef,
    deleteModalRef,
    activeMediaList,
    isModalOpen,
    actions,
  } = useArchiveMachine();

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
        <Shield className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-neutral-900 mb-2">Access Denied</h2>
        <p className="text-neutral-500 max-w-md">
          You do not have permission to view the unified media archive. This area is restricted to administrators.
        </p>
      </div>
    );
  }

  const items = archiveData.activeTab === 'story' ? archiveData.stories : archiveData.posts;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={actions.handleGoBack}
          className="p-2 rounded-full hover:bg-neutral-100 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-6 h-6 text-neutral-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Unified Media Archive</h1>
          <p className="text-sm text-neutral-500 mt-1">Manage deleted and expired content</p>
        </div>
      </div>

      <ArchiveTabs 
        activeTab={archiveData.activeTab} 
        onChangeTab={archiveData.setActiveTab}
        storiesCount={archiveData.stories.length}
        postsCount={archiveData.posts.length}
      />

      {archiveData.errorMessage && (
        <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{archiveData.errorMessage}</p>
        </div>
      )}

      {archiveData.isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <div key={i} className="aspect-square bg-neutral-100 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 bg-neutral-50 rounded-2xl border border-neutral-100">
          <GridIcon className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-neutral-900 mb-1">Archive is Empty</h3>
          <p className="text-sm text-neutral-500">No {archiveData.activeTab === 'story' ? 'expired stories' : 'archived posts'} found in the database.</p>
        </div>
      ) : (
        <motion.div 
          layout
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
        >
          <AnimatePresence mode="popLayout">
            {items.map((item) => (
              <ArchiveCard
                key={item.id}
                item={item}
                type={archiveData.activeTab}
                isAdmin={isAdmin}
                onView={() => {
                  actions.setViewingTarget({ item, type: archiveData.activeTab });
                  actions.setViewerIndex(0);
                }}
                onRestore={() => archiveData.restoreItem(item, archiveData.activeTab)}
                onRequestDelete={() => actions.setItemPendingDeletion({ id: item.id, type: archiveData.activeTab })}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <AnimatePresence>
        {viewingTarget && (
          <ArchiveInspectionModal
            modalRef={modalRef}
            viewingTarget={viewingTarget}
            activeMediaList={activeMediaList}
            viewerIndex={viewerIndex}
            onClose={() => actions.setViewingTarget(null)}
            onNext={actions.handleNextMedia}
            onPrev={actions.handlePrevMedia}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {itemPendingDeletion && (
          <ArchiveDeleteModal
            deleteModalRef={deleteModalRef}
            itemPendingDeletion={itemPendingDeletion}
            isDeleting={isDeleting}
            onCancel={() => actions.setItemPendingDeletion(null)}
            onConfirm={actions.handleConfirmDelete}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default ArchiveView;
