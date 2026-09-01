import React from 'react';
import { ShieldAlert } from 'lucide-react';

interface AccessDeniedDialogProps {
  userRole: string;
  onClose: () => void;
}

export function AccessDeniedDialog({ userRole, onClose }: AccessDeniedDialogProps) {
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="rbac-denied-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200"
    >
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 id="rbac-denied-title" className="text-lg font-bold text-neutral-100 mb-2">
          Access Denied
        </h2>
        <p className="text-xs text-neutral-400 mb-6 leading-relaxed">
          Your account role (<span className="text-neutral-200 font-medium">{userRole}</span>)
          does not have permission to publish new posts.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 bg-neutral-100 hover:bg-white text-neutral-950 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
        >
          Return to Feed
        </button>
      </div>
    </div>
  );
}
