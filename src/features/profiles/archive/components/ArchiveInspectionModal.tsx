import React, { RefObject } from 'react';
import { motion } from 'motion/react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Story } from '../../../stories';
import { Post } from '../../../posts';
import { ArchiveTab, ArchiveMediaItem } from '../hooks/useArchiveData';

interface ArchiveInspectionModalProps {
  viewingTarget: { item: Story | Post; type: ArchiveTab };
  activeMediaList: ArchiveMediaItem[];
  viewerIndex: number;
  modalRef: RefObject<HTMLDivElement>;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export const ArchiveInspectionModal = React.memo<ArchiveInspectionModalProps>(({
  viewingTarget,
  activeMediaList,
  viewerIndex,
  modalRef,
  onClose,
  onPrev,
  onNext,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Archive Media Inspector"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 p-2.5 text-white/80 hover:text-white bg-black/40 hover:bg-black/60 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white z-50 cursor-pointer"
        aria-label="Close viewer"
      >
        <X className="w-6 h-6" />
      </button>
      <motion.div
        ref={modalRef as React.RefObject<HTMLDivElement>}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative max-w-4xl w-full max-h-[90vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {activeMediaList.length === 0 ? (
          <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl p-8 max-h-[80vh] overflow-y-auto shadow-2xl">
            {viewingTarget.type === 'post' && (viewingTarget.item as Post).title && (
              <h2 className="text-xl font-bold mb-4">{(viewingTarget.item as Post).title}</h2>
            )}
            <p className="text-neutral-900 dark:text-neutral-100 whitespace-pre-wrap break-words">
              {viewingTarget.item.caption}
            </p>
          </div>
        ) : (
          <div className="relative w-full max-h-[90vh] flex items-center justify-center bg-black/50 rounded-xl overflow-hidden">
            {activeMediaList[viewerIndex]?.type === 'video' ? (
              <video
                src={activeMediaList[viewerIndex]?.url}
                className="max-w-full max-h-[90vh] object-contain"
                controls
                autoPlay
                playsInline
                loop
              />
            ) : (
              <img
                src={activeMediaList[viewerIndex]?.url}
                className="max-w-full max-h-[90vh] object-contain"
                alt="Full screen preview"
              />
            )}

            {activeMediaList.length > 1 && (
              <>
                {viewerIndex > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPrev();
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full transition-colors z-20 focus:outline-none focus:ring-2 focus:ring-white cursor-pointer"
                    aria-label="Previous media"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                )}
                {viewerIndex < activeMediaList.length - 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onNext();
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full transition-colors z-20 focus:outline-none focus:ring-2 focus:ring-white cursor-pointer"
                    aria-label="Next media"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                )}
                <div className="absolute bottom-4 left-0 right-0 flex justify-center z-20 px-4 mb-24 pointer-events-none">
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-full pb-1 snap-x">
                    {activeMediaList.map((_, idx) => (
                      <div
                        key={idx}
                        className={`transition-all duration-300 rounded-full shadow-sm shrink-0 snap-center ${
                          idx === viewerIndex ? 'bg-white w-2 h-2' : 'bg-white/50 w-1.5 h-1.5'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}

            {(viewingTarget.item.caption || (viewingTarget.type === 'post' && (viewingTarget.item as Post).title)) && (
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none text-left z-20">
                {viewingTarget.type === 'post' && (viewingTarget.item as Post).title && (
                  <h3 className="text-white font-bold text-xl sm:text-2xl mb-2 drop-shadow-md">
                    {(viewingTarget.item as Post).title}
                  </h3>
                )}
                {viewingTarget.item.caption && (
                  <p className="text-white/95 text-sm sm:text-base drop-shadow-md whitespace-pre-wrap break-words">
                    {viewingTarget.item.caption}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
});
ArchiveInspectionModal.displayName = 'ArchiveInspectionModal';
