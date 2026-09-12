"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isMissingColumnError } from "@/lib/supabase/schema-fallback";
import type { PendingFieldVisit } from "./offline";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

async function resolveAshaId(supabase: ServerClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: asha } = await supabase
    .from("asha_workers")
    .select("asha_id")
    .eq("profile_id", user.id)
    .single();
  return asha?.asha_id ?? null;
}

export type LogVisitState = { error?: string; success?: boolean; queuedOffline?: boolean };

export async function logFieldVisit(
  _prevState: LogVisitState,
  formData: FormData
): Promise<LogVisitState> {
  const patientId = Number(formData.get("patientId"));
  const visitDate = String(formData.get("visitDate") ?? "");
  const purpose = String(formData.get("purpose") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!patientId || !visitDate) {
    return { error: "Pick a patient and a visit date." };
  }

  const supabase = await createClient();
  const ashaId = await resolveAshaId(supabase);
  if (!ashaId) return { error: "Your ASHA profile isn't set up yet." };

  const { error } = await supabase.from("asha_field_visits").insert({
    asha_id: ashaId,
    patient_id: patientId,
    visit_date: visitDate,
    purpose: purpose || null,
    notes: notes || null,
    is_synced_from_offline: false,
  });

  if (error) return { error: error.message };

  revalidatePath("/asha/visits");
  return { success: true };
}

export type SyncResult = {
  syncedLocalIds: string[];
  failedItems?: { localId: string; error: string }[];
  error?: string;
};

function rowFor(ashaId: number, visit: PendingFieldVisit, withClientRef: boolean) {
  return {
    asha_id: ashaId,
    patient_id: visit.patientId,
    visit_date: visit.visitDate,
    purpose: visit.purpose || null,
    notes: visit.notes || null,
    is_synced_from_offline: true,
    ...(withClientRef ? { client_ref: visit.localId } : {}),
  };
}

// Insert once per queued visit, keyed on the reference the phone
// generated (migration 005). A retry - lost response, a second flush, a
// tab reopened mid-sync - lands on the same key and is ignored instead
// of logging the visit twice. ignoreDuplicates means a repeat is a
// success, not an error, which is exactly what the client should hear.
async function insertVisits(
  supabase: ServerClient,
  ashaId: number,
  visits: PendingFieldVisit[],
  withClientRef: boolean
) {
  return supabase
    .from("asha_field_visits")
    .upsert(
      visits.map((visit) => rowFor(ashaId, visit, withClientRef)),
      withClientRef ? { onConflict: "asha_id,client_ref", ignoreDuplicates: true } : {}
    );
}

// Called by the "Sync Now" button, by the browser's `online` event, and
// whenever the visits page is opened with a signal.
export async function syncFieldVisits(pending: PendingFieldVisit[]): Promise<SyncResult> {
  if (pending.length === 0) return { syncedLocalIds: [] };

  const supabase = await createClient();
  const ashaId = await resolveAshaId(supabase);
  if (!ashaId) return { syncedLocalIds: [], error: "Your ASHA profile isn't set up yet." };

  // Idempotent path first; fall back to plain inserts when migration 005
  // hasn't been run, so an ASHA in the field is never stuck with a queue
  // she can't clear (at the cost of the duplicate protection).
  let useClientRef = true;
  let { error } = await insertVisits(supabase, ashaId, pending, true);
  if (error && isMissingColumnError(error)) {
    console.warn(
      "[schema] asha_field_visits.client_ref is missing - run supabase/migrations/005_open_issue_fixes.sql. " +
        "Syncing without it: a retried sync can log a visit twice."
    );
    useClientRef = false;
    ({ error } = await insertVisits(supabase, ashaId, pending, false));
  }

  if (!error) {
    revalidatePath("/asha/visits");
    return { syncedLocalIds: pending.map((p) => p.localId) };
  }

  // One bad entry used to fail the whole batch and keep failing it,
  // stranding every good visit behind it. Retry one at a time so the
  // good ones land and only the genuinely broken entry stays queued,
  // with the reason attached to it.
  const syncedLocalIds: string[] = [];
  const failedItems: { localId: string; error: string }[] = [];

  for (const visit of pending) {
    const { error: itemError } = await insertVisits(supabase, ashaId, [visit], useClientRef);
    if (itemError) {
      failedItems.push({ localId: visit.localId, error: itemError.message });
    } else {
      syncedLocalIds.push(visit.localId);
    }
  }

  revalidatePath("/asha/visits");
  return {
    syncedLocalIds,
    failedItems,
    error:
      failedItems.length > 0
        ? `${failedItems.length} visit(s) couldn't be synced: ${failedItems[0].error}`
        : undefined,
  };
}
