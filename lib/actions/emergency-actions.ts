"use server";

import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { encryptPHI } from "@/lib/phi-crypto";
import { withMigrationFallback } from "@/lib/supabase/schema-fallback";
import { notifyEmergencyContact } from "@/lib/telecom/notify";

export type EmergencyState = { error?: string; requestId?: number };

type PatientRow = {
  patient_id: number;
  emergency_contact: string | null;
  profiles: { full_name: string } | null;
};

function coordinate(value: FormDataEntryValue | null): number | null {
  if (value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

// Shared by the patient emergency page and the ASHA emergency page.
// channel = "Voice" when the request was triggered by the voice SOS
// listener; the transcript travels along as (encrypted) caller notes so
// the ambulance crew knows what was said.
export async function requestAmbulance(
  _prevState: EmergencyState,
  formData: FormData
): Promise<EmergencyState> {
  const latitude = coordinate(formData.get("latitude"));
  const longitude = coordinate(formData.get("longitude"));
  const triageId = Number(formData.get("triageId")) || null;
  const explicitPatientId = Number(formData.get("patientId")) || null;
  const channel = formData.get("channel") === "Voice" ? "Voice" : "Web";
  const callerNotes = String(formData.get("callerNotes") ?? "").trim().slice(0, 1000);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("roles(role_name)")
    .eq("id", user.id)
    .single();
  const roleName = (profile?.roles as { role_name?: string } | null)?.role_name;

  let patient: PatientRow | null = null;
  if (roleName === "ASHAWorker") {
    if (!explicitPatientId) return { error: "Choose the patient who needs the ambulance." };
    const { data: asha } = await supabase
      .from("asha_workers")
      .select("asha_id")
      .eq("profile_id", user.id)
      .single();
    const { data } = await supabase
      .from("patients")
      .select("patient_id, emergency_contact, profiles(full_name)")
      .eq("patient_id", explicitPatientId)
      .eq("registered_by_asha_id", asha?.asha_id ?? -1)
      .maybeSingle();
    if (!data) return { error: "You can only request an ambulance for a patient you registered." };
    patient = data as unknown as PatientRow;
  } else {
    const { data } = await supabase
      .from("patients")
      .select("patient_id, emergency_contact, profiles(full_name)")
      .eq("profile_id", user.id)
      .maybeSingle();
    patient = data as unknown as PatientRow | null;
  }

  // A misconfigured encryption key must never stop an ambulance: drop the
  // note rather than storing health information in plain text.
  let encryptedNotes: string | null = null;
  try {
    encryptedNotes = encryptPHI(callerNotes);
  } catch (e) {
    console.error("[emergency] caller notes not stored:", e instanceof Error ? e.message : e);
  }

  const baseRow = {
    patient_id: patient?.patient_id ?? null,
    requested_by_profile_id: user.id,
    pickup_latitude: latitude,
    pickup_longitude: longitude,
    triage_id: triageId,
  };
  const { data: inserted, error } = await withMigrationFallback("ambulance_requests", (includeNewColumns) =>
    supabase
      .from("ambulance_requests")
      .insert(
        (includeNewColumns ? { ...baseRow, channel, caller_notes: encryptedNotes } : baseRow) as Record<string, unknown>
      )
      .select("request_id")
      .single()
  );

  if (error || !inserted) {
    return { error: error?.message ?? "Could not submit the ambulance request." };
  }

  if (triageId) {
    await supabase
      .from("triage_assessments")
      .update({ linked_ambulance_request_id: inserted.request_id })
      .eq("triage_id", triageId);
  }

  if (patient) {
    const locale = await getLocale();
    const target = patient;
    const requestId = inserted.request_id;
    // After the response is sent - an SMS gateway round-trip must not
    // delay the confirmation on screen.
    after(() =>
      notifyEmergencyContact({
        emergencyContact: target.emergency_contact,
        patientName: target.profiles?.full_name ?? "A patient",
        requestId,
        locale,
        profileId: user.id,
      })
    );
  }

  return { requestId: inserted.request_id };
}
