import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useArchiveData, ArchiveTab } from './useArchiveData';
import { useStore } from '../../../../store';
import { Story } from '../../../stories';
import { Post } from '../../../posts';
import { extractMedia } from '../utils/mediaExtractor';

export function useArchiveMachine() {
  const navigate = useNavigate();
  const profile = useStore((state) => state.profile);
  const userRole = profile?.role;
  const isAdmin = userRole === 'admin';

  const archiveData = useArchiveData(isAdmin);

  const [viewingTarget, setViewingTarget] = useState<{ item: Story | Post; type: ArchiveTab } | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number>(0);
  const [itemPendingDeletion, setItemPendingDeletion] = useState<{ id: string; type: ArchiveTab } | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const deleteModalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (viewingTarget || itemPendingDeletion) {
      previousActiveElement.current = document.activeElement as HTMLElement;

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setViewingTarget(null);
          setItemPendingDeletion(null);
          return;
        }

        const currentActiveModal = deleteModalRef.current || modalRef.current;
        if (e.key === 'Tab' && currentActiveModal) {
          const focusable = currentActiveModal.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusable.length === 0) return;

          const first = focusable[0];
          const last = focusable[focusable.length - 1];

          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        previousActiveElement.current?.focus();
      };
    }
  }, [viewingTarget, itemPendingDeletion]);

  const activeMediaList = useMemo(() => {
    if (!viewingTarget) return [];
    return extractMedia(viewingTarget.item, viewingTarget.type);
  }, [viewingTarget]);

  const handleNextMedia = useCallback(() => {
    setViewerIndex((prev) => Math.min(prev + 1, activeMediaList.length - 1));
  }, [activeMediaList.length]);

  const handlePrevMedia = useCallback(() => {
    setViewerIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleConfirmDelete = async () => {
    if (!itemPendingDeletion) return;
    setIsDeleting(true);
    try {
      await archiveData.deleteItem(itemPendingDeletion.id, itemPendingDeletion.type);
      setItemPendingDeletion(null);
      if (viewingTarget?.item.id === itemPendingDeletion.id) {
        setViewingTarget(null);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleGoBack = useCallback(() => {
    const historyIndex = (window.history.state as { idx?: number } | null)?.idx;
    if (typeof historyIndex === 'number' && historyIndex > 0) {
      navigate(-1);
    } else {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  const isModalOpen = Boolean(viewingTarget || itemPendingDeletion);

  return {
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
    actions: {
      setViewingTarget,
      setViewerIndex,
      setItemPendingDeletion,
      handleNextMedia,
      handlePrevMedia,
      handleConfirmDelete,
      handleGoBack,
    },
  };
}
