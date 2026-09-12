"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { logFieldVisit, syncFieldVisits } from "./actions";
import { FIELD_VISIT_STORAGE_KEY, type FieldVisitEntry } from "./offline";
import { useOfflineSync } from "@/lib/offline-sync/use-offline-sync";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function VisitForm({
  patients,
}: {
  patients: { patient_id: number; full_name: string }[];
}) {
  const router = useRouter();
  const {
    pending,
    enqueue: queueVisit,
    flush: flushQueue,
    isSyncing,
    syncError,
    lastSyncedCount,
  } = useOfflineSync<FieldVisitEntry>(FIELD_VISIT_STORAGE_KEY, syncFieldVisits, () => router.refresh());
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const combinedError = error ?? syncError;
  const combinedMessage =
    message ?? (lastSyncedCount ? `Synced ${lastSyncedCount} queued visit(s).` : null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const patientId = Number(formData.get("patientId"));
    const visitDate = String(formData.get("visitDate") ?? "");
    const purpose = String(formData.get("purpose") ?? "");
    const notes = String(formData.get("notes") ?? "");

    if (!patientId || !visitDate) {
      setError("Pick a patient and a visit date.");
      return;
    }

    if (!navigator.onLine) {
      queueVisit({ patientId, visitDate, purpose, notes });
      setMessage("You're offline - the visit was saved on this device and will sync automatically.");
      form.reset();
      return;
    }

    startTransition(async () => {
      try {
        const result = await logFieldVisit({}, formData);
        if (result.error) {
          setError(result.error);
          return;
        }
        setMessage("Visit logged.");
        form.reset();
      } catch {
        // Network dropped mid-request even though navigator.onLine
        // said we were online - fall back to the same offline queue.
        queueVisit({ patientId, visitDate, purpose, notes });
        setMessage("Couldn't reach the server - the visit was saved on this device and will sync automatically.");
        form.reset();
      }
    });
  }

  return (
    <div className="max-w-md space-y-6">
      {pending.length > 0 && (
        <div className="flex items-center justify-between rounded-md border border-marigold-500/40 bg-marigold-400/10 px-3 py-2 text-sm">
          <span>{pending.length} visit(s) waiting to sync</span>
          <Button type="button" size="sm" variant="secondary" onClick={flushQueue} disabled={isPending || isSyncing}>
            {isSyncing ? "Syncing..." : "Sync now"}
          </Button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="patientId">Patient</Label>
          <Select id="patientId" name="patientId" required defaultValue="">
            <option value="" disabled>
              Choose a patient
            </option>
            {patients.map((p) => (
              <option key={p.patient_id} value={p.patient_id}>
                {p.full_name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="visitDate">Visit date</Label>
          <Input id="visitDate" name="visitDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
        </div>
        <div>
          <Label htmlFor="purpose">Purpose</Label>
          <Input id="purpose" name="purpose" placeholder="e.g. Antenatal check, vaccination follow-up" />
        </div>
        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" name="notes" rows={3} />
        </div>

        {combinedError && (
          <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
            {combinedError}
          </p>
        )}
        {combinedMessage && (
          <p className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">{combinedMessage}</p>
        )}

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? "Saving..." : "Log visit"}
        </Button>
      </form>
    </div>
  );
}
