// Shared shape for anything sitting in an offline queue: the caller's own
// entry fields, plus bookkeeping added at enqueue time.
export type QueuedItem<T> = T & {
  localId: string;
  queuedAt: string;
};

export type SyncOutcome = { syncedLocalIds: string[]; error?: string };
