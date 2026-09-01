/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw } from 'lucide-react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

export function OfflineBanner() {
  const { isOnline, wasOffline, isChecking, checkConnection } = useNetworkStatus();
  const [showRestoredNotice, setShowRestoredNotice] = useState(false);

  useEffect(() => {
    if (isOnline && wasOffline) {
      setShowRestoredNotice(true);
      const timer = setTimeout(() => {
        setShowRestoredNotice(false);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  return (
    <aside
      aria-label="Network status banner"
      aria-live="polite"
      className="fixed top-3 sm:top-4 left-1/2 -translate-x-1/2 z-[99990] w-[92%] max-w-sm pointer-events-none pt-safe"
    >
      <AnimatePresence mode="wait">
        {!isOnline && (
          <motion.div
            key="offline-state"
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="pointer-events-auto bg-neutral-900/95 backdrop-blur-md text-white border border-neutral-800 rounded-full px-4 py-2.5 shadow-2xl flex items-center justify-between gap-3 text-xs"
          >
            <span className="flex-1 text-center font-medium text-neutral-100 text-[13px] tracking-tight">
              You are currently offline
            </span>

            <button
              onClick={() => checkConnection()}
              disabled={isChecking}
              className="flex items-center gap-1.5 px-3 py-1 bg-white text-black font-semibold text-[11px] uppercase tracking-wider rounded-full hover:bg-neutral-200 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
            >
              <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
              <span>{isChecking ? 'Checking...' : 'Retry'}</span>
            </button>
          </motion.div>
        )}

        {isOnline && showRestoredNotice && (
          <motion.div
            key="online-restored"
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="pointer-events-auto bg-emerald-950/95 backdrop-blur-md text-emerald-100 border border-emerald-800/80 rounded-full px-5 py-2.5 shadow-2xl flex items-center justify-center text-xs font-semibold text-center"
          >
            <span className="text-[13px] tracking-tight text-center w-full">Connection restored</span>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}
