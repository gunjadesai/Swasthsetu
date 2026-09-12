"use client";

import { decryptOnDevice, encryptOnDevice, isLocalEncryptionAvailable } from "./device-crypto";
import type { EnqueueResult, QueuedItem } from "./types";

// Generic localStorage-backed offline queue factory, parameterized by a
// storage key so multiple offline-capable flows (ASHA field visits,
// digital triage submissions, queue-ticket check-ins, ...) can each get
// their own isolated queue without duplicating this logic. Deliberately
// localStorage, not IndexedDB - these are small text records with no
// blobs, so a JSON array is enough and needs no new dependency.
//
// Three things this handles that the first version didn't:
//
//  * Whose queue it is. The key is namespaced per signed-in profile. On
//    a shared district phone, one ASHA signing out and another signing
//    in used to inherit the first one's unsynced visits and file them
//    under her own ASHA id.
//  * Whether the write actually happened. localStorage throws when it's
//    full or disabled, and the old code swallowed that - the form said
//    "saved on this device" for an entry that was never stored. enqueue
//    now reads the entry back and reports failure to the caller.
//  * What's in it. Clinical notes are encrypted with a device key (see
//    device-crypto.ts) instead of sitting in plain text.
export function createOfflineQueue<T extends Record<string, unknown>>(
  storageKey: string,
  options: {
    // Namespace: the signed-in profile id. "anon" only before sign-in.
    userKey: string;
    // Fields to encrypt at rest on the device (PHI, free text).
    encryptedFields?: (keyof T & string)[];
  }
) {
  const key = `${storageKey}:${options.userKey}`;
  const encryptedFields = options.encryptedFields ?? [];

  function readRaw(): QueuedItem<T>[] {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as QueuedItem<T>[]) : [];
    } catch {
      // Storage unavailable, or a half-written value from a browser that
      // was killed mid-write - treat as "nothing queued" rather than
      // crashing the form that's using it.
      return [];
    }
  }

  function writeRaw(items: QueuedItem<T>[]): boolean {
    try {
      localStorage.setItem(key, JSON.stringify(items));
      return true;
    } catch {
      return false;
    }
  }

  async function getAll(): Promise<QueuedItem<T>[]> {
    const items = readRaw();
    if (encryptedFields.length === 0) return items;
    return Promise.all(
      items.map(async (item) => {
        const decrypted = { ...item } as Record<string, unknown>;
        for (const field of encryptedFields) {
          const value = decrypted[field];
          if (typeof value === "string") decrypted[field] = await decryptOnDevice(value);
        }
        return decrypted as QueuedItem<T>;
      })
    );
  }

  async function enqueue(entry: T): Promise<EnqueueResult<T>> {
    const item: QueuedItem<T> = {
      ...entry,
      localId: crypto.randomUUID(),
      queuedAt: new Date().toISOString(),
      attempts: 0,
    };

    const encrypted = await isLocalEncryptionAvailable();
    const stored = { ...item } as Record<string, unknown>;
    for (const field of encryptedFields) {
      const value = stored[field];
      if (typeof value === "string" && value) stored[field] = await encryptOnDevice(value);
    }

    const existing = readRaw();
    if (!writeRaw([...existing, stored as QueuedItem<T>])) {
      // Quota exceeded, private-mode storage, or storage disabled. Say
      // so: a lost field visit that the app claimed to have saved is
      // worse than an error the ASHA can act on.
      return { ok: false, reason: existing.length > 0 ? "storage-full" : "storage-unavailable" };
    }

    // Trust nothing: confirm it can be read back before telling the
    // caller it's safe. Some browsers accept the write and drop it.
    if (!readRaw().some((queued) => queued.localId === item.localId)) {
      return { ok: false, reason: "storage-full" };
    }

    return { ok: true, item, encrypted };
  }

  function remove(localIds: string[]): void {
    if (localIds.length === 0) return;
    writeRaw(readRaw().filter((item) => !localIds.includes(item.localId)));
  }

  // Records a failed attempt so the UI can show why something is stuck
  // and a permanently-bad entry stops looking like a transient failure.
  function markFailed(failures: { localId: string; error: string }[]): void {
    if (failures.length === 0) return;
    const byId = new Map(failures.map((f) => [f.localId, f.error]));
    writeRaw(
      readRaw().map((item) =>
        byId.has(item.localId)
          ? { ...item, attempts: (item.attempts ?? 0) + 1, lastError: byId.get(item.localId) }
          : item
      )
    );
  }

  function clear(): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }

  return { getAll, enqueue, remove, markFailed, clear, storageKey: key };
}
