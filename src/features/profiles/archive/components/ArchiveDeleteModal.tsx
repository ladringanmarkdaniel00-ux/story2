import React, { RefObject } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { ArchiveTab } from '../hooks/useArchiveData';

interface ArchiveDeleteModalProps {
  itemPendingDeletion: { id: string; type: ArchiveTab };
  isDeleting: boolean;
  deleteModalRef: RefObject<HTMLDivElement>;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ArchiveDeleteModal = React.memo<ArchiveDeleteModalProps>(({
  itemPendingDeletion,
  isDeleting,
  deleteModalRef,
  onCancel,
  onConfirm,
}) => {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-confirm-title"
    >
      <motion.div
        ref={deleteModalRef as React.RefObject<HTMLDivElement>}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-neutral-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center flex flex-col gap-4"
      >
        <div className="w-12 h-12 bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-500 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h2 id="delete-confirm-title" className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
            Permanently Delete?
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            This action cannot be undone. This will permanently remove the {itemPendingDeletion.type} from the database.
          </p>
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-2 mt-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 px-4 py-2.5 rounded-xl font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 px-4 py-2.5 rounded-xl font-medium bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span>Deleting...</span>
              </>
            ) : (
              'Delete'
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
});
ArchiveDeleteModal.displayName = 'ArchiveDeleteModal';
