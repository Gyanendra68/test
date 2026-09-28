import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type SyncState = 'ONLINE' | 'OFFLINE' | 'SYNCING' | 'SYNCED' | 'FAILED';

export interface PendingSyncItem {
  id: string;
  type: 'SAVE_DRAFT' | 'UPDATE_PROFILE' | 'RESOLVE_DEFICIENCY';
  endpoint: string;
  method: string;
  payload: any;
  timestamp: number;
}

interface SyncContextType {
  isOnline: boolean;
  syncState: SyncState;
  pendingCount: number;
  enqueuePendingAction: (item: Omit<PendingSyncItem, 'id' | 'timestamp'>) => void;
  triggerSync: () => Promise<void>;
  saveOfflineDraft: (draft: any) => void;
  getOfflineDraft: () => any | null;
  clearOfflineDraft: () => void;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [syncState, setSyncState] = useState<SyncState>(isOnline ? 'ONLINE' : 'OFFLINE');
  const [pendingQueue, setPendingQueue] = useState<PendingSyncItem[]>(() => {
    try {
      const saved = localStorage.getItem('tribal_pending_sync_queue');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Save pending queue to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('tribal_pending_sync_queue', JSON.stringify(pendingQueue));
    } catch (e) {
      console.error('Failed to persist sync queue', e);
    }
  }, [pendingQueue]);

  // Sync execution
  const triggerSync = useCallback(async () => {
    if (!navigator.onLine || pendingQueue.length === 0) {
      if (navigator.onLine) setSyncState('SYNCED');
      return;
    }

    setSyncState('SYNCING');
    const token = localStorage.getItem('tribal_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const remainingQueue: PendingSyncItem[] = [];

    for (const item of pendingQueue) {
      try {
        const res = await fetch(item.endpoint, {
          method: item.method,
          headers,
          body: JSON.stringify(item.payload)
        });
        if (!res.ok) {
          remainingQueue.push(item);
        }
      } catch (err) {
        remainingQueue.push(item);
      }
    }

    setPendingQueue(remainingQueue);
    if (remainingQueue.length === 0) {
      setSyncState('SYNCED');
      setTimeout(() => setSyncState('ONLINE'), 3000);
    } else {
      setSyncState('FAILED');
    }
  }, [pendingQueue]);

  // Listen to browser network changes
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSyncState('ONLINE');
      // Auto-trigger sync when network returns
      triggerSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncState('OFFLINE');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [triggerSync]);

  const enqueuePendingAction = (item: Omit<PendingSyncItem, 'id' | 'timestamp'>) => {
    const newItem: PendingSyncItem = {
      ...item,
      id: `sync_${Date.now()}_${Math.random()}`,
      timestamp: Date.now()
    };
    setPendingQueue((prev) => [...prev, newItem]);
    if (!isOnline) {
      setSyncState('OFFLINE');
    } else {
      triggerSync();
    }
  };

  const saveOfflineDraft = (draft: any) => {
    try {
      localStorage.setItem('tribal_cached_application_draft', JSON.stringify(draft));
    } catch (e) {
      console.error('Could not cache draft offline', e);
    }
  };

  const getOfflineDraft = () => {
    try {
      const saved = localStorage.getItem('tribal_cached_application_draft');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  };

  const clearOfflineDraft = () => {
    localStorage.removeItem('tribal_cached_application_draft');
  };

  return (
    <SyncContext.Provider
      value={{
        isOnline,
        syncState,
        pendingCount: pendingQueue.length,
        enqueuePendingAction,
        triggerSync,
        saveOfflineDraft,
        getOfflineDraft,
        clearOfflineDraft
      }}
    >
      {children}
    </SyncContext.Provider>
  );
};

export function useSync() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
}
