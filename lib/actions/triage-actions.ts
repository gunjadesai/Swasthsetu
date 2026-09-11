"use server";

import { createClient } from "@/lib/supabase/server";
import { computeTriageResult } from "@/lib/triage";
import type { RecommendedAction, UrgencyLevel } from "@/lib/types";

export type TriageState = {
  error?: string;
  result?: {
    triageId: number;
    urgency_level: UrgencyLevel;
    recommended_action: RecommendedAction;
  };
};

// Shared by the patient self-triage page and the ASHA-assisted triage
// page - reused rather than duplicated per role, same spirit as the
// other cross-role helpers in lib/.
export async function submitTriage(
  _prevState: TriageState,
  formData: FormData
): Promise<TriageState> {
  const symptomKeys = formData.getAll("symptoms").map(String);
  const notes = String(formData.get("notes") ?? "").trim();
  const explicitPatientId = formData.get("patientId");

  if (symptomKeys.length === 0) {
    return { error: "Select at least one symptom (or 'None of these' if you feel fine)." };
  }

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

  let patientId: number | null = null;
  if (roleName === "Patient") {
    const { data: patient } = await supabase
      .from("patients")
      .select("patient_id")
      .eq("profile_id", user.id)
      .single();
    patientId = patient?.patient_id ?? null;
  } else if (explicitPatientId) {
    patientId = Number(explicitPatientId);
  }

  if (!patientId) {
    return { error: "Could not determine which patient this triage is for." };
  }

  const { urgency_level, recommended_action } = computeTriageResult(symptomKeys);

  const { data: inserted, error } = await supabase
    .from("triage_assessments")
    .insert({
      patient_id: patientId,
      conducted_by_profile_id: user.id,
      symptoms: { selected: symptomKeys },
      urgency_level,
      recommended_action,
      notes: notes || null,
    })
    .select("triage_id")
    .single();

  if (error || !inserted) {
    return { error: error?.message ?? "Could not save the triage result." };
  }

  return {
    result: { triageId: inserted.triage_id, urgency_level, recommended_action },
  };
}
