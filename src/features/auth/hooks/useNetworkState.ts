import { useSyncExternalStore } from 'react';

function subscribeToNetwork(callback: () => void): () => void {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getNetworkSnapshot(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

function getServerNetworkSnapshot(): boolean {
  return true;
}

export function useNetworkState() {
  return useSyncExternalStore(subscribeToNetwork, getNetworkSnapshot, getServerNetworkSnapshot);
}
