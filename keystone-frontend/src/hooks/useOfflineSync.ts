// hooks/useOfflineSync.ts
// Offline-First engine: Queues work notes, customer signatures, status updates,
// and part consumption in IndexedDB via localforage, with automatic sync on reconnect.

import { useEffect, useState } from 'react';
import localforage from 'localforage';
import api from '@/services/api';
import toast from 'react-hot-toast';

export interface PendingOfflineJob {
  id?: string;
  workOrderId: number;
  status?: string;
  reason?: string;
  workNotes?: string;
  customerSignature?: string;
  partsUsed?: Array<{ partId: number; quantity: number; notes?: string }>;
  queuedAt: number;
}

const QUEUE_KEY = 'offline_service_queue';

export async function queueOfflineJob(job: PendingOfflineJob) {
  const queue: PendingOfflineJob[] = (await localforage.getItem(QUEUE_KEY)) ?? [];
  queue.push({
    ...job,
    id: `${job.workOrderId}-${Date.now()}`,
    queuedAt: Date.now(),
  });
  await localforage.setItem(QUEUE_KEY, queue);
  toast.success('Saved to offline storage! Will sync when reconnected.', { icon: '📶' });
}

export async function getPendingQueueCount(): Promise<number> {
  const queue: PendingOfflineJob[] | null = await localforage.getItem(QUEUE_KEY);
  return queue ? queue.length : 0;
}

export async function flushOfflineQueue(): Promise<{ synced: number; failed: number }> {
  const queue: PendingOfflineJob[] | null = await localforage.getItem(QUEUE_KEY);
  if (!queue || queue.length === 0) return { synced: 0, failed: 0 };

  const failed: PendingOfflineJob[] = [];
  let synced = 0;

  for (const job of queue) {
    try {
      // 1. Sync offline work notes, digital signature & status
      if (job.workNotes || job.customerSignature || job.status) {
        await api.post(`/workorders/${job.workOrderId}/complete-offline`, {
          workNotes: job.workNotes,
          customerSignature: job.customerSignature,
          status: job.status,
        });
      }

      // 2. Sync parts consumption
      if (job.partsUsed && job.partsUsed.length > 0) {
        for (const p of job.partsUsed) {
          await api.post(`/parts/workorder/${job.workOrderId}/usage`, p);
        }
      }

      synced++;
    } catch (err) {
      console.error('Failed to sync offline item:', err);
      failed.push(job);
    }
  }

  await localforage.setItem(QUEUE_KEY, failed);
  if (synced > 0) {
    toast.success(`Successfully synced ${synced} offline update(s) with cloud!`, { icon: '☁️' });
  }
  return { synced, failed: failed.length };
}

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [pendingCount, setPendingCount] = useState<number>(0);

  const refreshCount = async () => {
    const count = await getPendingQueueCount();
    setPendingCount(count);
  };

  useEffect(() => {
    refreshCount();

    const handleOnline = async () => {
      setIsOnline(true);
      toast('Connectivity restored. Syncing offline updates...', { icon: '🟢' });
      await flushOfflineQueue();
      refreshCount();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast('Network disconnected. Offline-first mode active.', { icon: '🟠' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (navigator.onLine) {
      flushOfflineQueue().then(refreshCount);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, pendingCount, syncNow: flushOfflineQueue };
}
