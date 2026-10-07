'use client';

import React, { useState, useEffect } from 'react';
import { getPendingOfflineMutations, flushOfflineMutations } from '@/lib/offline/indexedDbQueue';

export function OfflineSyncBanner() {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);

  const refresh = async () => {
    try {
      const items = await getPendingOfflineMutations();
      setPending(items.length);
    } catch {
      setPending(0);
    }
  };

  useEffect(() => {
    setOnline(navigator.onLine);
    void refresh();

    const onOnline = () => {
      setOnline(true);
      void flushOfflineMutations().then(refresh);
    };

    const onOffline = () => setOnline(false);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  if (online && pending === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 border border-neutral-700 text-neutral-100 rounded-full px-4 py-2 text-xs font-mono shadow-2xl flex items-center gap-2">
      <span className={`h-2 w-2 rounded-full ${online ? 'bg-cyan-400 animate-pulse' : 'bg-amber-400'}`} />
      <span>{online ? `Syncing ${pending} offline mutations...` : `Offline Field Mode (${pending} queued)`}</span>
    </div>
  );
}

export default OfflineSyncBanner;
