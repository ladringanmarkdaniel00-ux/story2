/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * PWA Service Worker Update Notifier
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw } from 'lucide-react';
import { promptServiceWorkerUpdate } from '../../lib/pwa/serviceWorker';
import { requestPersistentStorage } from '../../utils/pwaCapabilities';

export function PwaUpdateNotifier() {
  const [updateAvailable, setUpdateAvailable] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  useEffect(() => {
    // Request persistent storage on mount
    requestPersistentStorage();

    const handleUpdate = () => {
      setUpdateAvailable(true);
    };

    window.addEventListener('pwa-update-available', handleUpdate);
    return () => {
      window.removeEventListener('pwa-update-available', handleUpdate);
    };
  }, []);

  const handleApplyUpdate = () => {
    setIsUpdating(true);
    promptServiceWorkerUpdate();
  };

  return (
    <AnimatePresence>
      {updateAvailable && (
        <aside
          aria-label="App update available"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[99999] w-[92%] max-w-md pointer-events-none"
        >
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="pointer-events-auto bg-neutral-900/95 text-white backdrop-blur-md border border-neutral-800 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-3 text-xs"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white shrink-0">
                <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-neutral-100 text-[13px] truncate">
                  Update Available
                </span>
                <span className="text-[11px] text-neutral-400 truncate">
                  A fresh version of DAN is ready to load
                </span>
              </div>
            </div>

            <button
              onClick={handleApplyUpdate}
              disabled={isUpdating}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white text-black font-bold text-[11px] uppercase tracking-wider rounded-xl hover:bg-neutral-200 transition-colors shrink-0 cursor-pointer disabled:opacity-50"
            >
              <span>{isUpdating ? 'Reloading...' : 'Update'}</span>
            </button>
          </motion.div>
        </aside>
      )}
    </AnimatePresence>
  );
}
