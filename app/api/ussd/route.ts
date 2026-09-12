import { computeTriageResult, ruleBasedTriage } from "@/lib/triage";
import type { TriageOutcome } from "@/lib/ai-triage";
import { createAdminClient } from "@/lib/supabase/admin";
import { telecomTexts } from "@/lib/telecom/messages";
import { logTelecomMessage } from "@/lib/telecom/sms";
import { readFormParams, verifyTelecomWebhook } from "@/lib/telecom/verify";
import {
  createTelecomAmbulanceRequest,
  findPatientByPhone,
  latestAmbulanceStatusText,
  saveTelecomTriage,
  upcomingAppointmentsText,
} from "@/lib/telecom/service";

// USSD menu (dial e.g. *384*123#) - works on every keypad phone, no data
// and no SMS credit needed. Speaks the de-facto aggregator protocol
// (Africa's Talking style): POST sessionId, serviceCode, phoneNumber and
// `text` = every answer so far joined by "*"; reply "CON ..." to keep the
// session open or "END ..." to close it.
//
// Triage here is rule-based only: USSD sessions time out within seconds,
// too short for an AI round-trip.

const USSD_MAX = 180;

function ussd(kind: "CON" | "END", text: string): Response {
  const body = text.length > USSD_MAX ? `${text.slice(0, USSD_MAX - 1)}…` : text;
  return new Response(`${kind} ${body}`, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

function rulesOutcome(symptomKey: string): TriageOutcome {
  const rules = ruleBasedTriage({ symptomKeys: [symptomKey] });
  const { urgency_level, recommended_action } = computeTriageResult(rules.symptomKeys);
  return {
    urgency_level,
    recommended_action,
    engine: "Rules",
    symptomKeys: rules.symptomKeys,
    ruleRedFlags: rules.redFlags,
    ai: null,
  };
}

export async function POST(request: Request) {
  const params = await readFormParams(request);
  const verification = verifyTelecomWebhook(request, params);
  if (!verification.ok) {
    return new Response(verification.message, { status: verification.status });
  }

  const phone = params.phoneNumber ?? "";
  const answers = (params.text ?? "").split("*").filter((part) => part !== "");
  const patient = await findPatientByPhone(phone);

  if (answers.length > 0) {
    await logTelecomMessage({
      direction: "Inbound",
      channel: "USSD",
      phone,
      body: `USSD ${answers.join("*")}`,
      status: "Received",
      profileId: patient?.profileId,
      provider: "ussd",
    });
  }

  if (!patient) return ussd("END", telecomTexts("en").notRegistered);
  const texts = telecomTexts(patient.locale);
  const [menu, second, third] = answers;

  if (!menu) return ussd("CON", texts.ussdMain);

  // 1 - Emergency ambulance (confirm first: a mistyped key shouldn't
  // dispatch a vehicle).
  if (menu === "1") {
    if (!second) return ussd("CON", texts.ussdConfirmSos);
    if (second !== "1") return ussd("END", texts.ussdCancelled);
    const requestId = await createTelecomAmbulanceRequest(patient, { channel: "USSD", notes: "USSD emergency menu" });
    return ussd("END", requestId ? texts.ambulanceSent(requestId) : texts.ambulanceFailed);
  }

  // 2 - Symptom check
  if (menu === "2") {
    if (!second) {
      const options = texts.ussdSymptoms.map(([, label], i) => `${i + 1}. ${label}`).join("\n");
      return ussd("CON", `${texts.ussdChooseSymptom}\n${options}`);
    }
    const choice = texts.ussdSymptoms[Number(second) - 1];
    if (!choice) return ussd("END", texts.ussdInvalid);
    const outcome = rulesOutcome(choice[0]);

    if (!third) {
      await saveTelecomTriage(patient, outcome, { channel: "USSD", freeText: choice[1] });
      if (outcome.urgency_level === "Emergency") {
        return ussd("CON", `${texts.urgency.Emergency}\n${texts.ussdEmergencyConfirm}`);
      }
      return ussd("END", `${texts.urgency[outcome.urgency_level]}. ${texts.action[outcome.recommended_action]}`);
    }

    if (outcome.urgency_level === "Emergency" && third === "1") {
      // Link the request to the triage saved on the previous screen.
      const admin = createAdminClient();
      const { data: triage } = await admin
        .from("triage_assessments")
        .select("triage_id")
        .eq("patient_id", patient.patientId)
        .eq("channel", "USSD")
        .gte("created_at", new Date(Date.now() - 10 * 60_000).toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const requestId = await createTelecomAmbulanceRequest(patient, {
        channel: "USSD",
        notes: choice[1],
        triageId: triage?.triage_id ?? null,
      });
      return ussd("END", requestId ? texts.ambulanceSent(requestId) : texts.ambulanceFailed);
    }
    return ussd("END", texts.ussdCancelled);
  }

  if (menu === "3") return ussd("END", await upcomingAppointmentsText(patient));
  if (menu === "4") return ussd("END", await latestAmbulanceStatusText(patient));

  return ussd("END", texts.ussdInvalid);
}
