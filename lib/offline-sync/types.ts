// Shared shape for anything sitting in an offline queue: the caller's own
// entry fields, plus bookkeeping added at enqueue time.
//
// localId doubles as the idempotency key sent to the server: a retried
// sync (lost response, a second flush, a tab reopened mid-sync) lands on
// the same key and is ignored instead of logging the visit twice.
export type QueuedItem<T> = T & {
  localId: string;
  queuedAt: string;
  attempts: number;
  lastError?: string;
};

// Why an entry couldn't be put on the queue. "storage-full" is the one
// that used to be silent: the write threw, the form said "saved", and
// the visit was gone.
export type EnqueueFailure = "storage-full" | "storage-unavailable";

export type EnqueueResult<T> =
  | { ok: true; item: QueuedItem<T>; encrypted: boolean }
  | { ok: false; reason: EnqueueFailure };

// What a sync reports back. Per-item outcomes matter: one entry the
// server rejects (a patient deleted since, a bad date) must not hold up
// everything queued behind it.
export type SyncOutcome = {
  syncedLocalIds: string[];
  failedItems?: { localId: string; error: string }[];
  error?: string;
};
