"use server";

import { createClient } from "@/lib/supabase/server";

export type EmergencyState = { error?: string; requestId?: number };

export async function requestAmbulance(
  _prevState: EmergencyState,
  formData: FormData
): Promise<EmergencyState> {
  const lat = formData.get("latitude");
  const lng = formData.get("longitude");
  const triageId = formData.get("triageId");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: patient } = await supabase
    .from("patients")
    .select("patient_id")
    .eq("profile_id", user.id)
    .single();

  const { data: inserted, error } = await supabase
    .from("ambulance_requests")
    .insert({
      patient_id: patient?.patient_id ?? null,
      requested_by_profile_id: user.id,
      pickup_latitude: lat ? Number(lat) : null,
      pickup_longitude: lng ? Number(lng) : null,
      triage_id: triageId ? Number(triageId) : null,
    })
    .select("request_id")
    .single();

  if (error || !inserted) {
    return { error: error?.message ?? "Could not submit the ambulance request." };
  }

  return { requestId: inserted.request_id };
}
