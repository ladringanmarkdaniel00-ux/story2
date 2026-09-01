/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Settings, Archive, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useStore, secureCleanup } from '../../store';

export function ProfileView(): React.JSX.Element {
  const navigate = useNavigate();
  const profile = useStore((state) => state.profile);
  const user = useStore((state) => state.user);
  const signOutStore = useStore((state) => state.signOut); // Changed from logout to match store signature

  const userRole = profile?.role;
  const email = user?.email || 'guest@example.com';
  const profileName = profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : 'Darlingan User';

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close settings menu securely
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = useCallback(async () => {
    setIsSettingsOpen(false);
    // Execute secure memory and storage scrubbing
    secureCleanup();
    if (signOutStore) {
      await signOutStore();
    }
    navigate('/login', { replace: true });
  }, [signOutStore, navigate]);

  const handleNavigateArchive = useCallback(() => {
    setIsSettingsOpen(false);
    navigate('/archive');
  }, [navigate]);

  return (
    <main
      role="main"
      className="w-full min-h-[100svh] bg-white flex flex-col pt-8 px-6 pb-24 transition-colors duration-300"
    >
      <div className="w-full max-w-3xl mx-auto flex flex-col gap-8">
        
        {/* Profile Header */}
        <div className="flex items-start justify-between px-2">
          <div className="flex flex-col items-start">
            <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight text-left">
              {profileName}
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 font-medium text-sm text-left mt-0.5">
              {email}
            </p>
          </div>
          <div className="relative" ref={settingsRef}>
            <button 
              onClick={() => setIsSettingsOpen((prev) => !prev)}
              className="p-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
              aria-label="Settings"
              aria-expanded={isSettingsOpen}
              aria-haspopup="true"
            >
              <Settings className="w-5 h-5" />
            </button>
            
            <AnimatePresence>
              {isSettingsOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-100 dark:border-neutral-800 py-1.5 z-50 overflow-hidden origin-top-right"
                >
                  {userRole === 'admin' && (
                    <button
                      onClick={handleNavigateArchive}
                      className="w-full px-4 py-2.5 flex items-center gap-2.5 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-left text-sm cursor-pointer"
                    >
                      <Archive className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                      <span className="font-medium">Archives</span>
                    </button>
                  )}
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2.5 flex items-center gap-2.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-left text-sm cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-red-500" />
                    <span className="font-medium">Log out</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>
    </main>
  );
}

export default ProfileView;
