/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cookie, ShieldCheck, X } from 'lucide-react';
import { analytics } from '../../utils/analytics';

const COOKIE_CONSENT_KEY = 'user_cookie_consent_v1';

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof localStorage === 'undefined') return;
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      // Delay prompt slightly to ensure clean initial paint
      const timer = setTimeout(() => setIsVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    analytics.setOptOut(false);
    setIsVisible(false);
  };

  const handleEssentialOnly = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'essential_only');
    analytics.setOptOut(true);
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.aside
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          aria-label="Cookie consent banner"
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-[99998] p-4 bg-white text-neutral-900 border border-neutral-200 rounded-2xl shadow-2xl"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-neutral-100 rounded-xl shrink-0 text-neutral-700">
              <Cookie className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                <span>Privacy & Cookies</span>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              </h3>
              <p className="text-[11px] text-neutral-600 mt-1 leading-relaxed">
                We use cookies and local storage to optimize your feed experience, preserve offline drafts, and measure anonymous analytics.
              </p>
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={handleAcceptAll}
                  className="px-3.5 py-1.5 bg-black text-white text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
                >
                  Accept All
                </button>
                <button
                  onClick={handleEssentialOnly}
                  className="px-3.5 py-1.5 border border-neutral-200 text-neutral-700 text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-neutral-50 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
                >
                  Essential Only
                </button>
              </div>
            </div>
            <button
              onClick={handleEssentialOnly}
              aria-label="Close cookie consent"
              className="text-neutral-400 hover:text-black p-1 rounded-md transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-black"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
