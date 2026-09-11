"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { PendingFieldVisit } from "@/lib/offline-queue";

async function resolveAshaId(supabase: Awaited<ReturnType<typeof createClient>>) {
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

export type SyncResult = { syncedLocalIds: string[]; error?: string };

// Called by the "Sync Now" button (and automatically when the browser
// comes back online) to flush whatever queued up in localStorage while
// this ASHA had no connection.
export async function syncFieldVisits(pending: PendingFieldVisit[]): Promise<SyncResult> {
  if (pending.length === 0) return { syncedLocalIds: [] };

  const supabase = await createClient();
  const ashaId = await resolveAshaId(supabase);
  if (!ashaId) return { syncedLocalIds: [], error: "Your ASHA profile isn't set up yet." };

  const { error } = await supabase.from("asha_field_visits").insert(
    pending.map((p) => ({
      asha_id: ashaId,
      patient_id: p.patientId,
      visit_date: p.visitDate,
      purpose: p.purpose || null,
      notes: p.notes || null,
      is_synced_from_offline: true,
    }))
  );

  if (error) return { syncedLocalIds: [], error: error.message };

  revalidatePath("/asha/visits");
  return { syncedLocalIds: pending.map((p) => p.localId) };
}
