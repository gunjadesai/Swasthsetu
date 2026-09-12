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
  syncFn: (pending: QueuedItem<T>[]) => Promise<SyncOutcome>,
  onSynced?: (syncedCount: number) => void
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
        let result: SyncOutcome;
        try {
          result = await syncFn(current);
        } catch {
          // The sync call itself threw - e.g. the network request never
          // reached the server because we're still offline. This must be
          // caught here: an uncaught rejection inside an async function
          // passed to startTransition can crash the component (tearing
          // down the `online` listener that's supposed to retry this),
          // silently disabling auto-sync until the page is reloaded. The
          // queued items are left untouched, so nothing is lost - the
          // next real online event or manual "Sync now" retries them.
          setSyncError("Couldn't reach the server - still offline. Will retry automatically once back online.");
          return;
        }
        if (result.error) {
          setSyncError(result.error);
          return;
        }
        setSyncError(null);
        queue.remove(result.syncedLocalIds);
        setLastSyncedCount(result.syncedLocalIds.length);
        refresh();
        // The server action already revalidated its own path, but a
        // Server Component already mounted on the page (e.g. a "recent
        // items" list) won't refetch on its own from a client-triggered
        // sync - the caller can pass a router.refresh() here to pick up
        // the newly-synced rows without a full page reload.
        onSynced?.(result.syncedLocalIds.length);
      } finally {
        syncInFlight.current = false;
      }
    });
  }, [queue, syncFn, refresh, onSynced]);

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
