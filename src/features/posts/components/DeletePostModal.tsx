import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  type MouseEvent,
} from 'react';
import { AlertTriangle, Loader2, ShieldAlert, WifiOff } from 'lucide-react';

export interface DeletePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  postTitle?: string;
  postAuthorId?: string;
  currentUserId?: string;
  userRole?: string;
}

export function DeletePostModal({
  isOpen,
  onClose,
  onConfirm,
  postTitle,
  postAuthorId,
  currentUserId,
  userRole = 'guest',
}: DeletePostModalProps) {
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  const modalRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  // Author or Admin Ownership Gate
  const isAuthorized = useMemo(() => {
    if (userRole === 'admin') return true;
    return Boolean(postAuthorId && currentUserId && postAuthorId === currentUserId);
  }, [userRole]);

  // Monitor network connectivity
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Capture active focus before modal open & restore on close
  useEffect(() => {
    if (isOpen) {
      previouslyFocusedElement.current = document.activeElement as HTMLElement;
      // Focus the safest action (Cancel) by default for destructive operations
      setTimeout(() => {
        cancelButtonRef.current?.focus();
      }, 50);
    } else {
      previouslyFocusedElement.current?.focus();
      setIsDeleting(false);
      setErrorMsg('');
    }
  }, [isOpen]);

  const handleDismiss = useCallback(() => {
    if (isDeleting) return;
    onClose();
  }, [isDeleting, onClose]);

  // Keyboard Navigation: Escape Key & Focus Trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismiss();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleDismiss]);

  const handleBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleDismiss();
    }
  };

  const handleConfirm = async () => {
    if (!isOnline) {
      setErrorMsg('Cannot delete post while offline. Check your network.');
      return;
    }

    setIsDeleting(true);
    setErrorMsg('');

    try {
      await onConfirm();
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Failed to delete post. Please try again.');
      }
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  // RBAC Permission Gate
  if (!isAuthorized) {
    return (
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-denied-title"
        className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
      >
        <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full mx-auto shadow-2xl flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center shrink-0 mb-4 text-red-600">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 id="delete-denied-title" className="text-xl font-bold text-neutral-900 mb-2">
            Unauthorized Action
          </h2>
          <p className="text-sm text-neutral-500 mb-6">
            You do not have permission to delete this post.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 px-4 rounded-xl text-sm font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-400 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-post-modal-title"
      aria-describedby="delete-post-modal-desc"
      className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full mx-auto shadow-2xl relative animate-in zoom-in-95 duration-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Offline Alert Banner */}
        {!isOnline && (
          <div className="mb-4 -mx-6 -mt-6 sm:-mx-8 sm:-mt-8 bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-center gap-2 text-xs text-amber-700">
            <WifiOff className="w-3.5 h-3.5" />
            <span>You are offline. Deletion is disabled.</span>
          </div>
        )}

        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-7 h-7 text-rose-600" />
          </div>

          <h2 id="delete-post-modal-title" className="text-xl font-bold text-neutral-900">
            Delete Post
          </h2>

          <p id="delete-post-modal-desc" className="text-sm text-neutral-500 leading-relaxed">
            {postTitle ? (
              <>
                Are you sure you want to delete <span className="font-semibold text-neutral-800">"{postTitle}"</span>? This action cannot be undone.
              </>
            ) : (
              'Are you sure you want to delete this post? This action cannot be undone.'
            )}
          </p>
        </div>

        {/* Error Feedback */}
        {errorMsg && (
          <div
            role="alert"
            aria-live="assertive"
            className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-600 text-center"
          >
            {errorMsg}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-center gap-3 mt-8">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={handleDismiss}
            disabled={isDeleting}
            className="w-full sm:w-1/2 py-3 px-4 rounded-xl text-sm font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-400 cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting || !isOnline}
            className={`w-full sm:w-1/2 py-3 px-4 rounded-xl text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-sm shadow-rose-600/20 focus:outline-none focus:ring-2 focus:ring-rose-500 flex items-center justify-center gap-2 cursor-pointer ${
              isDeleting || !isOnline ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeletePostModal;
