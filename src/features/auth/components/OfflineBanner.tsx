import React from 'react';
import { WifiOff } from 'lucide-react';

interface OfflineBannerProps {
  isOnline: boolean;
}

export function OfflineBanner({ isOnline }: OfflineBannerProps): React.JSX.Element {
  return (
    <div className="min-h-[34px] flex items-center">
      {!isOnline && (
        <div
          role="status"
          aria-live="polite"
          className="w-full bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded text-[11px] text-amber-800 flex items-center gap-1.5"
        >
          <WifiOff className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>You are offline. Reconnect to proceed.</span>
        </div>
      )}
    </div>
  );
}
