"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createOfflineQueue } from "./queue";
import type { EnqueueFailure, QueuedItem, SyncOutcome } from "./types";

// Reusable "offline-capable form" hook. Queues entries in localStorage
// when the browser is offline (or when a server request fails despite
// `navigator.onLine` saying otherwise), exposes a pending count and a
// manual "Sync now" action, and flushes the queue automatically - on the
// browser's `online` event *and* on mount, which is how a queue filled
// in a dead-signal village finally goes up when the ASHA reopens the app
// back on the network (the `online` event fires on a transition, so a
// page opened already-online never got one).
//
// Any offline-capable flow adopts this by giving it a unique storage key
// and a server action that accepts the queued items and reports which
// ones made it in - no need to hand-roll the localStorage/online-listener
// plumbing per feature. First real usage: app/asha/(app)/visits.

// A sync that never answers must not leave the queue looking busy
// forever: a village connection can hold a request open for minutes.
const SYNC_TIMEOUT_MS = 20_000;

export function useOfflineSync<T extends Record<string, unknown>>(
  storageKey: string,
  syncFn: (pending: QueuedItem<T>[]) => Promise<SyncOutcome>,
  options: {
    // Signed-in profile id: queues are per user, never shared between
    // two people using the same phone.
    userKey: string;
    encryptedFields?: (keyof T & string)[];
    onSynced?: (syncedCount: number) => void;
  }
) {
  const { userKey, encryptedFields, onSynced } = options;
  const queue = useMemo(
    () => createOfflineQueue<T>(storageKey, { userKey, encryptedFields: encryptedFields ?? [] }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [storageKey, userKey]
  );

  const [pending, setPending] = useState<QueuedItem<T>[]>([]);
  const [isSyncing, startTransition] = useTransition();
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncedCount, setLastSyncedCount] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    setPending(await queue.getAll());
  }, [queue]);

  // The browser can fire `online` more than once in quick succession, and a
  // user can click "Sync now" while an auto-flush from that event is still
  // in flight. Without this guard, two overlapping flushes both read the
  // same still-full queue and both submit it. (The server also dedupes on
  // each entry's localId - migration 005 - so a retry that crosses with a
  // response in flight can't double-insert either.)
  const syncInFlight = useRef(false);

  const flush = useCallback(() => {
    if (syncInFlight.current) return;
    syncInFlight.current = true;

    startTransition(async () => {
      try {
        const current = await queue.getAll();
        if (current.length === 0) return;

        let result: SyncOutcome;
        try {
          result = await Promise.race([
            syncFn(current),
            new Promise<SyncOutcome>((_, reject) =>
              setTimeout(() => reject(new Error("timeout")), SYNC_TIMEOUT_MS)
            ),
          ]);
        } catch {
          // The sync call threw, or took too long - e.g. the request never
          // reached the server because we're still offline. This must be
          // caught here: an uncaught rejection inside an async function
          // passed to startTransition can crash the component (tearing
          // down the `online` listener that's supposed to retry this),
          // silently disabling auto-sync until the page is reloaded. The
          // queued items are left untouched, so nothing is lost - the
          // next online event, the next page load, or "Sync now" retries.
          setSyncError("Couldn't reach the server. Everything is still saved on this device and will be retried.");
          return;
        }

        // Whatever made it in is removed, whatever didn't stays queued
        // with its error recorded - one entry the server rejects no
        // longer blocks every entry behind it.
        queue.remove(result.syncedLocalIds);
        queue.markFailed(result.failedItems ?? []);
        await refresh();

        if (result.error) {
          setSyncError(result.error);
        } else if (result.failedItems && result.failedItems.length > 0) {
          setSyncError(result.failedItems[0].error);
        } else {
          setSyncError(null);
        }

        if (result.syncedLocalIds.length > 0) {
          setLastSyncedCount(result.syncedLocalIds.length);
          // The server action already revalidated its own path, but a
          // Server Component already mounted on the page (e.g. a "recent
          // items" list) won't refetch on its own from a client-triggered
          // sync - the caller can pass a router.refresh() here to pick up
          // the newly-synced rows without a full page reload.
          onSynced?.(result.syncedLocalIds.length);
        }
      } finally {
        syncInFlight.current = false;
      }
    });
  }, [queue, syncFn, refresh, onSynced]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await refresh();
      if (cancelled) return;
      // Reopened with a signal: push whatever was stranded here last time.
      if (navigator.onLine) flush();
    })();

    window.addEventListener("online", flush);
    return () => {
      cancelled = true;
      window.removeEventListener("online", flush);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue]);

  // Returns whether the entry is really on the device, so the caller can
  // tell the user the truth instead of an unconditional "saved".
  const enqueue = useCallback(
    async (entry: T): Promise<{ ok: boolean; reason?: EnqueueFailure; encrypted?: boolean }> => {
      const result = await queue.enqueue(entry);
      await refresh();
      return result.ok
        ? { ok: true, encrypted: result.encrypted }
        : { ok: false, reason: result.reason };
    },
    [queue, refresh]
  );

  return { pending, enqueue, flush, isSyncing, syncError, lastSyncedCount };
}
