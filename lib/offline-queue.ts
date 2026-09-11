// Tiny localStorage-backed pending queue for the ASHA field-visit form.
// Deliberately not IndexedDB - these are small text records with no
// blobs, so a JSON array in localStorage is enough and needs no new
// dependency. Every read/write is wrapped because localStorage can
// throw (private browsing, storage disabled) and a rural field app
// must never crash the form just because offline storage isn't
// available - it should just behave as if nothing was queued yet.
const STORAGE_KEY = "rural-health:pending-field-visits";

export type PendingFieldVisit = {
  localId: string;
  patientId: number;
  visitDate: string;
  purpose: string;
  notes: string;
  queuedAt: string;
};

export function getPendingVisits(): PendingFieldVisit[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PendingFieldVisit[]) : [];
  } catch {
    return [];
  }
}

export function queueVisit(entry: Omit<PendingFieldVisit, "localId" | "queuedAt">): void {
  try {
    const pending = getPendingVisits();
    pending.push({
      ...entry,
      localId: crypto.randomUUID(),
      queuedAt: new Date().toISOString(),
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
  } catch {
    // Nothing we can do if storage itself is unavailable - the visit
    // is lost, same as it would be with no offline support at all.
  }
}

export function clearSyncedVisits(localIds: string[]): void {
  try {
    const remaining = getPendingVisits().filter((v) => !localIds.includes(v.localId));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
  } catch {
    // ignore
  }
}
