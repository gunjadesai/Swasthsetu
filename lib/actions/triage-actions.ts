"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { ageFromDateOfBirth, runTriage, type AiTriageAssessment } from "@/lib/ai-triage";
import { encryptPHI, encryptPHIJson } from "@/lib/phi-crypto";
import { withMigrationFallback } from "@/lib/supabase/schema-fallback";
import type { RecommendedAction, TriageEngine, UrgencyLevel } from "@/lib/types";

export type TriageState = {
  error?: string;
  result?: {
    triageId: number;
    urgency_level: UrgencyLevel;
    recommended_action: RecommendedAction;
    engine: TriageEngine;
    ai: AiTriageAssessment | null;
    aiUnavailable: boolean;
    // The AI call failed because no credentials are configured (vs. a
    // temporary outage) - the UI says "not set up" instead of "try later".
    aiNotConfigured: boolean;
    // Symptom keys the rules recognised in the free text (not ticked).
    recognisedSymptoms: string[];
    // Rules-only and nothing recognised at all: urgency is unknown, not Low.
    notAssessed: boolean;
  };
};

type PatientRow = { patient_id: number; date_of_birth: string | null; gender: string | null };

// Shared by the patient self-triage page and the ASHA-assisted triage
// page - reused rather than duplicated per role, same spirit as the
// other cross-role helpers in lib/.
//
// An Emergency result doesn't render a result card at all: it redirects
// straight to the emergency page with the triage attached, so the next
// thing the person sees is the ambulance button.
export async function submitTriage(
  _prevState: TriageState,
  formData: FormData
): Promise<TriageState> {
  const symptomKeys = formData.getAll("symptoms").map(String);
  const description = String(formData.get("description") ?? "").trim().slice(0, 2000);
  const explicitPatientId = Number(formData.get("patientId")) || null;
  const channel = formData.get("channel") === "Voice" ? "Voice" : "Web";

  if (symptomKeys.length === 0 && !description) {
    return { error: "Select at least one symptom, or describe how you feel - you can type it or speak it." };
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

  let patient: PatientRow | null = null;
  if (roleName === "Patient") {
    const { data } = await supabase
      .from("patients")
      .select("patient_id, date_of_birth, gender")
      .eq("profile_id", user.id)
      .single();
    patient = data;
  } else if (roleName === "ASHAWorker" && explicitPatientId) {
    const { data: asha } = await supabase
      .from("asha_workers")
      .select("asha_id")
      .eq("profile_id", user.id)
      .single();
    const { data } = await supabase
      .from("patients")
      .select("patient_id, date_of_birth, gender")
      .eq("patient_id", explicitPatientId)
      .eq("registered_by_asha_id", asha?.asha_id ?? -1)
      .maybeSingle();
    patient = data;
  }

  if (!patient) {
    return {
      error:
        roleName === "ASHAWorker"
          ? "Pick a patient you registered."
          : "Could not determine which patient this triage is for.",
    };
  }

  const locale = await getLocale();
  const outcome = await runTriage({
    symptomKeys,
    freeText: description,
    locale,
    channel,
    patient: { age: ageFromDateOfBirth(patient.date_of_birth), gender: patient.gender },
  });

  // A patient must still get their result if the encryption key is
  // misconfigured: skip storing the free text / AI detail (never store it
  // in plain text) rather than failing the whole triage.
  let freeText: string | null = null;
  let aiAssessment: string | null = null;
  try {
    freeText = encryptPHI(description);
    aiAssessment = encryptPHIJson(outcome.ai);
  } catch (e) {
    console.error("[triage] PHI not stored:", e instanceof Error ? e.message : e);
  }

  const baseRow = {
    patient_id: patient.patient_id,
    conducted_by_profile_id: user.id,
    symptoms: { selected: outcome.symptomKeys, checked: symptomKeys },
    urgency_level: outcome.urgency_level,
    recommended_action: outcome.recommended_action,
  };
  const { data: inserted, error } = await withMigrationFallback("triage_assessments", (includeNewColumns) =>
    supabase
      .from("triage_assessments")
      .insert(
        (includeNewColumns
          ? { ...baseRow, channel, engine: outcome.engine, free_text: freeText, ai_assessment: aiAssessment }
          : baseRow) as Record<string, unknown>
      )
      .select("triage_id")
      .single()
  );

  if (error || !inserted) {
    return { error: error?.message ?? "Could not save the triage result." };
  }

  if (outcome.urgency_level === "Emergency") {
    redirect(
      roleName === "Patient"
        ? `/patient/emergency?triageId=${inserted.triage_id}`
        : `/asha/emergency?triageId=${inserted.triage_id}&patientId=${patient.patient_id}`
    );
  }

  return {
    result: {
      triageId: inserted.triage_id,
      urgency_level: outcome.urgency_level,
      recommended_action: outcome.recommended_action,
      engine: outcome.engine,
      ai: outcome.ai,
      aiUnavailable: Boolean(outcome.aiError),
      // Missing or invalid key (the SDK's "Could not resolve authentication
      // method", or a 401) rather than a transient outage.
      aiNotConfigured: /authentication method|api[\s_-]?key|authToken|\b401\b/i.test(outcome.aiError ?? ""),
      recognisedSymptoms: outcome.symptomKeys.filter((key) => !symptomKeys.includes(key)),
      notAssessed: outcome.engine === "Rules" && outcome.symptomKeys.length === 0,
    },
  };
}
