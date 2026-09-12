import type { QueuedItem } from "./types";

// Generic localStorage-backed offline queue factory, parameterized by a
// storage key so multiple offline-capable flows (ASHA field visits, digital
// triage submissions, queue-ticket check-ins, ...) can each get their own
// isolated queue without duplicating this logic. Deliberately localStorage,
// not IndexedDB - these are small text records with no blobs, so a JSON
// array is enough and needs no new dependency. Every read/write is wrapped
// because localStorage can throw (private browsing, storage disabled, quota
// exceeded) and an offline-tolerant app must degrade to "nothing queued"
// rather than crash the form that's using it.
export function createOfflineQueue<T extends Record<string, unknown>>(storageKey: string) {
  function getAll(): QueuedItem<T>[] {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as QueuedItem<T>[]) : [];
    } catch {
      return [];
    }
  }

  function enqueue(entry: T): QueuedItem<T> {
    const item: QueuedItem<T> = {
      ...entry,
      localId: crypto.randomUUID(),
      queuedAt: new Date().toISOString(),
    } as QueuedItem<T>;
    try {
      const pending = getAll();
      pending.push(item);
      localStorage.setItem(storageKey, JSON.stringify(pending));
    } catch {
      // Nothing we can do if storage itself is unavailable - the entry is
      // lost, same as it would be with no offline support at all.
    }
    return item;
  }

  function remove(localIds: string[]): void {
    if (localIds.length === 0) return;
    try {
      const remaining = getAll().filter((item) => !localIds.includes(item.localId));
      localStorage.setItem(storageKey, JSON.stringify(remaining));
    } catch {
      // ignore
    }
  }

  function clear(): void {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  }

  return { getAll, enqueue, remove, clear };
}
