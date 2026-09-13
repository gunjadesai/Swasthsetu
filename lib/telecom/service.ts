import { format } from "date-fns";
import { createAdminClient } from "@/lib/supabase/admin";
import { defaultLocale, locales, type Locale } from "@/lib/i18n/dictionaries";
import { decryptPHI, encryptPHI, encryptPHIJson } from "@/lib/phi-crypto";
import { ageFromDateOfBirth, type TriageOutcome } from "@/lib/ai-triage";
import { consultModeLabel } from "@/lib/consult-mode";
import { logPhiAccess } from "@/lib/audit";
import { withMigrationFallback } from "@/lib/supabase/schema-fallback";
import type { AmbulanceRequestStatus, TriageChannel } from "@/lib/types";
import { telecomTexts } from "./messages";
import { notifyEmergencyContact } from "./notify";
import { phoneLast10 } from "./phone";

// Shared domain operations for the keypad-phone channels (SMS, USSD,
// IVR). These run from webhooks with no signed-in user, so they use the
// service-role client - every caller must have verified the webhook
// first (lib/telecom/verify.ts), and the only identity trusted here is
// the caller's phone number matched against a registered patient.

export type TelecomPatient = {
  patientId: number;
  profileId: string;
  fullName: string;
  locale: Locale;
  age: number | null;
  gender: string | null;
  emergencyContact: string | null;
  pickupLatitude: number | null;
  pickupLongitude: number | null;
};

type VillageCoords = { latitude: number | null; longitude: number | null } | null;

export async function findPatientByPhone(phone: string): Promise<TelecomPatient | null> {
  const last10 = phoneLast10(phone);
  if (last10.length !== 10) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("patients")
    .select(
      "patient_id, date_of_birth, gender, emergency_contact, profiles!inner(id, full_name, phone_last10, villages(latitude, longitude), languages(language_code)), asha_workers(villages(latitude, longitude))"
    )
    .eq("profiles.phone_last10", last10)
    .order("patient_id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  const profile = data.profiles as unknown as {
    id: string;
    full_name: string;
    villages: VillageCoords;
    languages: { language_code: string } | null;
  };
  const ashaVillage = (data.asha_workers as unknown as { villages: VillageCoords } | null)?.villages ?? null;
  // No GPS on a keypad phone: use the patient's registered village, or
  // the village of the ASHA who registered them.
  const village = profile.villages?.latitude != null ? profile.villages : ashaVillage;
  const code = profile.languages?.language_code as Locale | undefined;

  return {
    patientId: data.patient_id,
    profileId: profile.id,
    fullName: profile.full_name,
    locale: code && locales.includes(code) ? code : defaultLocale,
    age: ageFromDateOfBirth(data.date_of_birth),
    gender: data.gender,
    emergencyContact: data.emergency_contact,
    pickupLatitude: village?.latitude != null ? Number(village.latitude) : null,
    pickupLongitude: village?.longitude != null ? Number(village.longitude) : null,
  };
}

export async function saveTelecomTriage(
  patient: TelecomPatient,
  outcome: TriageOutcome,
  input: { channel: TriageChannel; freeText: string }
): Promise<number | null> {
  const admin = createAdminClient();
  let freeText: string | null = null;
  let aiAssessment: string | null = null;
  try {
    freeText = encryptPHI(input.freeText);
    aiAssessment = encryptPHIJson(outcome.ai);
  } catch (e) {
    console.error("[telecom] triage PHI not stored:", e instanceof Error ? e.message : e);
  }

  const baseRow = {
    patient_id: patient.patientId,
    conducted_by_profile_id: patient.profileId,
    symptoms: { selected: outcome.symptomKeys },
    urgency_level: outcome.urgency_level,
    recommended_action: outcome.recommended_action,
  };
  const { data, error } = await withMigrationFallback("triage_assessments", (includeNewColumns) =>
    admin
      .from("triage_assessments")
      .insert(
        (includeNewColumns
          ? { ...baseRow, channel: input.channel, engine: outcome.engine, free_text: freeText, ai_assessment: aiAssessment }
          : baseRow) as Record<string, unknown>
      )
      .select("triage_id")
      .single()
  );

  if (error || !data) {
    console.error("[telecom] could not save triage:", error?.message);
    return null;
  }
  await logPhiAccess(admin, {
    profileId: patient.profileId,
    action: input.channel === "IVR" ? "ivr" : input.channel === "USSD" ? "ussd" : "sms",
    entityName: "triage_assessments",
    entityId: data.triage_id,
  });
  return data.triage_id;
}

export async function createTelecomAmbulanceRequest(
  patient: TelecomPatient,
  input: { channel: TriageChannel; notes?: string; triageId?: number | null }
): Promise<number | null> {
  const admin = createAdminClient();
  let callerNotes: string | null = null;
  try {
    callerNotes = encryptPHI(input.notes);
  } catch (e) {
    console.error("[telecom] caller notes not stored:", e instanceof Error ? e.message : e);
  }

  const baseRow = {
    patient_id: patient.patientId,
    requested_by_profile_id: patient.profileId,
    pickup_latitude: patient.pickupLatitude,
    pickup_longitude: patient.pickupLongitude,
    triage_id: input.triageId ?? null,
  };
  const { data, error } = await withMigrationFallback("ambulance_requests", (includeNewColumns) =>
    admin
      .from("ambulance_requests")
      .insert(
        (includeNewColumns
          ? { ...baseRow, channel: input.channel, caller_notes: callerNotes }
          : baseRow) as Record<string, unknown>
      )
      .select("request_id")
      .single()
  );

  if (error || !data) {
    console.error("[telecom] could not create ambulance request:", error?.message);
    return null;
  }

  if (input.triageId) {
    await admin
      .from("triage_assessments")
      .update({ linked_ambulance_request_id: data.request_id })
      .eq("triage_id", input.triageId);
  }

  await notifyEmergencyContact({
    emergencyContact: patient.emergencyContact,
    patientName: patient.fullName,
    requestId: data.request_id,
    locale: patient.locale,
    profileId: patient.profileId,
  });

  return data.request_id;
}

// One short paragraph: urgency, the AI's plain-language summary and top
// advice when available, otherwise the standard action text.
export function triageReplyText(outcome: TriageOutcome, locale: Locale, maxAdvice = 2): string {
  const texts = telecomTexts(locale);
  const parts = [`${texts.urgency[outcome.urgency_level]}.`];
  if (outcome.ai?.summary) parts.push(outcome.ai.summary);
  if (outcome.urgency_level !== "Emergency" && outcome.ai?.self_care_advice.length) {
    parts.push(outcome.ai.self_care_advice.slice(0, maxAdvice).join(" "));
  }
  parts.push(texts.action[outcome.recommended_action]);
  return parts.join(" ");
}

export async function upcomingAppointmentsText(patient: TelecomPatient): Promise<string> {
  const texts = telecomTexts(patient.locale);
  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await admin
    .from("appointments")
    .select("appointment_date, appointment_time, mode, doctors(profiles(full_name))")
    .eq("patient_id", patient.patientId)
    .eq("status", "Scheduled")
    .gte("appointment_date", today)
    .order("appointment_date", { ascending: true })
    .order("appointment_time", { ascending: true })
    .limit(3);

  if (!data || data.length === 0) return texts.noAppointments;

  const lines = data.map((a) => {
    const doctor = (a.doctors as unknown as { profiles: { full_name: string } | null } | null)?.profiles
      ?.full_name;
    return `${format(new Date(a.appointment_date), "d MMM")} ${a.appointment_time.slice(0, 5)} - Dr. ${doctor ?? "?"} (${consultModeLabel(a.mode)})`;
  });
  return [texts.appointmentsHeader, ...lines].join("\n");
}

export async function latestAmbulanceStatusText(patient: TelecomPatient): Promise<string> {
  const texts = telecomTexts(patient.locale);
  const admin = createAdminClient();
  const { data } = await admin
    .from("ambulance_requests")
    .select("request_id, status")
    .eq("patient_id", patient.patientId)
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return texts.noAmbulance;
  return texts.ambulanceStatus(data.request_id, data.status as AmbulanceRequestStatus);
}

export { decryptPHI };
