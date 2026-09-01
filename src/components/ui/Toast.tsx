/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

type ToastListener = (toasts: ToastItem[]) => void;

class ToastManager {
  private toasts: ToastItem[] = [];
  private listeners: ToastListener[] = [];

  subscribe(listener: ToastListener) {
    this.listeners.push(listener);
    listener(this.toasts);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l([...this.toasts]));
  }

  show(message: string, type: ToastType = 'info', duration: number = 4000) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newToast: ToastItem = { id, type, message, duration };
    this.toasts = [...this.toasts, newToast];
    this.notify();

    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, duration);
    }
  }

  dismiss(id: string) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.notify();
  }

  success(message: string, duration?: number) {
    this.show(message, 'success', duration);
  }

  error(message: string, duration?: number) {
    this.show(message, 'error', duration);
  }

  warning(message: string, duration?: number) {
    this.show(message, 'warning', duration);
  }

  info(message: string, duration?: number) {
    this.show(message, 'info', duration);
  }
}

export const toast = new ToastManager();

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    return toast.subscribe(setToasts);
  }, []);

  return (
    <aside
      aria-label="Notifications"
      aria-live="polite"
      aria-atomic="false"
      className="fixed top-4 right-4 z-[99999] flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4"
    >
      <AnimatePresence>
        {toasts.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            role="status"
            className="pointer-events-auto flex items-center justify-between gap-3 p-3.5 bg-neutral-900 text-white rounded-xl shadow-xl border border-neutral-800 text-xs font-medium"
          >
            <div className="flex items-center gap-2.5">
              {item.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
              {item.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
              {item.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
              {item.type === 'info' && <Info className="w-4 h-4 text-sky-400 shrink-0" />}
              <span className="leading-snug">{item.message}</span>
            </div>
            <button
              onClick={() => toast.dismiss(item.id)}
              aria-label="Dismiss notification"
              className="text-neutral-400 hover:text-white p-1 rounded-md transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </aside>
  );
}
