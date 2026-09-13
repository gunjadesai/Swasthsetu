"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { logFieldVisit, syncFieldVisits } from "./actions";
import { FIELD_VISIT_STORAGE_KEY, type FieldVisitEntry } from "./offline";
import { useOfflineSync } from "@/lib/offline-sync/use-offline-sync";
import { useTranslation } from "@/lib/i18n/locale-context";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function VisitForm({
  patients,
  profileId,
}: {
  patients: { patient_id: number; full_name: string }[];
  // Queues are per signed-in ASHA: a shared district phone must not
  // hand one worker's unsynced visits to the next one who signs in.
  profileId: string;
}) {
  const t = useTranslation();
  const router = useRouter();
  const {
    pending,
    enqueue: queueVisit,
    flush: flushQueue,
    isSyncing,
    syncError,
    lastSyncedCount,
  } = useOfflineSync<FieldVisitEntry>(FIELD_VISIT_STORAGE_KEY, syncFieldVisits, {
    userKey: profileId,
    // Clinical notes are encrypted with a device key while they wait.
    encryptedFields: ["notes"],
    onSynced: () => router.refresh(),
  });
  const [message, setMessage] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const combinedError = error ?? syncError;
  const combinedMessage =
    message ?? (lastSyncedCount ? `Synced ${lastSyncedCount} queued visit(s).` : null);

  // Queue an entry and say what actually happened. The old version
  // always reported "saved on this device", including when the write
  // had silently failed and the visit was gone.
  async function queueAndReport(entry: FieldVisitEntry, form: HTMLFormElement, savedMessage: string) {
    const result = await queueVisit(entry);
    if (!result.ok) {
      setError(result.reason === "storage-full" ? t("offline.storageFull") : t("offline.storageUnavailable"));
      return;
    }
    setWarning(result.encrypted ? null : t("offline.notEncrypted"));
    setMessage(savedMessage);
    form.reset();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setWarning(null);
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
      await queueAndReport(
        { patientId, visitDate, purpose, notes },
        form,
        "You're offline - the visit was saved on this device and will sync automatically."
      );
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
        await queueAndReport(
          { patientId, visitDate, purpose, notes },
          form,
          "Couldn't reach the server - the visit was saved on this device and will sync automatically."
        );
      }
    });
  }

  return (
    <div className="max-w-md space-y-6">
      {pending.length > 0 && (
        <div className="rounded-md border border-marigold-500/40 bg-marigold-400/10 px-3 py-2 text-sm">
          <div className="flex items-center justify-between">
            <span>{pending.length} visit(s) waiting to sync</span>
            <Button type="button" size="sm" variant="secondary" onClick={flushQueue} disabled={isPending || isSyncing}>
              {isSyncing ? "Syncing..." : "Sync now"}
            </Button>
          </div>
          {pending.some((visit) => (visit.attempts ?? 0) > 0) && (
            <p className="mt-1 text-xs text-ink/70">{t("offline.syncPartial")}</p>
          )}
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
        {warning && (
          <p className="rounded-md bg-marigold-400/15 px-3 py-2 text-sm text-marigold-600">{warning}</p>
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
