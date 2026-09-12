"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createOfflineQueue } from "./queue";
import type { QueuedItem, SyncOutcome } from "./types";

// Reusable "offline-capable form" hook. Queues entries in localStorage when
// the browser is offline (or when a server request fails despite
// `navigator.onLine` saying otherwise), exposes a pending count and a manual
// "Sync now" action, and auto-flushes on the browser's `online` event.
//
// Any offline-capable flow adopts this by giving it a unique storage key and
// a server action that accepts the queued items and reports which ones made
// it in - no need to hand-roll the localStorage/online-listener plumbing
// per feature. First real usage: app/asha/(app)/visits (field-visit logging).
export function useOfflineSync<T extends Record<string, unknown>>(
  storageKey: string,
  syncFn: (pending: QueuedItem<T>[]) => Promise<SyncOutcome>
) {
  const queue = useMemo(() => createOfflineQueue<T>(storageKey), [storageKey]);
  const [pending, setPending] = useState<QueuedItem<T>[]>([]);
  const [isSyncing, startTransition] = useTransition();
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncedCount, setLastSyncedCount] = useState<number | null>(null);

  const refresh = useCallback(() => setPending(queue.getAll()), [queue]);

  // The browser can fire `online` more than once in quick succession, and a
  // user can click "Sync now" while an auto-flush from that event is still
  // in flight. Without this guard, two overlapping flushes both read the
  // same still-full queue and both submit it, double-inserting every queued
  // entry before either response comes back to clear the queue.
  const syncInFlight = useRef(false);

  const flush = useCallback(() => {
    if (syncInFlight.current) return;
    const current = queue.getAll();
    if (current.length === 0) return;
    syncInFlight.current = true;
    startTransition(async () => {
      try {
        const result = await syncFn(current);
        if (result.error) {
          setSyncError(result.error);
          return;
        }
        setSyncError(null);
        queue.remove(result.syncedLocalIds);
        setLastSyncedCount(result.syncedLocalIds.length);
        refresh();
      } finally {
        syncInFlight.current = false;
      }
    });
  }, [queue, syncFn, refresh]);

  useEffect(() => {
    refresh();
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const enqueue = useCallback(
    (entry: T) => {
      queue.enqueue(entry);
      refresh();
    },
    [queue, refresh]
  );

  return { pending, enqueue, flush, isSyncing, syncError, lastSyncedCount };
}
