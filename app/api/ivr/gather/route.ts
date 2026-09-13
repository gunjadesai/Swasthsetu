import { after } from "next/server";
import { runTriage } from "@/lib/ai-triage";
import { detectEmergencyPhrase } from "@/lib/triage";
import { IVR_CALL_108, telecomTexts } from "@/lib/telecom/messages";
import { logTelecomMessage, sendSms } from "@/lib/telecom/sms";
import { callbackUrl, gather, redirectTo, say, twimlResponse } from "@/lib/telecom/twiml";
import { readFormParams, verifyTelecomWebhook } from "@/lib/telecom/verify";
import {
  createTelecomAmbulanceRequest,
  findPatientByPhone,
  saveTelecomTriage,
  triageReplyText,
  type TelecomPatient,
} from "@/lib/telecom/service";

// Handles each answer on the voice line.
//   step=menu     1 / "emergency" / "bachao" -> ambulance
//                 2                          -> ask for symptoms
//                 any other speech           -> AI triage of what was said
//   step=describe speech                     -> AI triage
//   step=confirm  1 / "yes" / "haan"         -> ambulance linked to the triage
// An Emergency triage offers the ambulance immediately; anything else is
// read back as advice and also sent by SMS so the caller keeps a copy.

const YES_WORDS = ["yes", "haan", "han", "ha", "ji", "हां", "हाँ", "हा", "जी", "હા", "હાં"];

function saidYes(speech: string): boolean {
  const normalized = speech.toLowerCase();
  return YES_WORDS.some((w) => normalized.split(/[\s,.!?।]+/).includes(w));
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export async function POST(request: Request) {
  const params = await readFormParams(request);
  const verification = verifyTelecomWebhook(request, params);
  if (!verification.ok) {
    return new Response(verification.message, { status: verification.status });
  }

  const url = new URL(request.url);
  const step = url.searchParams.get("step") ?? "menu";
  const attempt = Number(url.searchParams.get("attempt")) || 1;
  const triageId = Number(url.searchParams.get("triageId")) || null;
  const from = params.From ?? "";
  const digits = params.Digits ?? "";
  const speech = (params.SpeechResult ?? "").trim();

  const patient = await findPatientByPhone(from);
  if (!patient) {
    return twimlResponse(say(telecomTexts("en").ivrNotRegistered, "en"), "<Hangup/>");
  }
  const { locale } = patient;
  const texts = telecomTexts(locale);

  if (speech) {
    await logTelecomMessage({
      direction: "Inbound",
      channel: "IVR",
      phone: from,
      body: speech,
      status: "Received",
      profileId: patient.profileId,
      provider: "twilio",
      providerMessageId: params.CallSid,
    });
  }

  const goodbye = () => twimlResponse(say(IVR_CALL_108[locale], locale), say(texts.ivrGoodbye, locale), "<Hangup/>");

  const ask = (nextStep: string, prompt: string, extra: Record<string, string> = {}, nextAttempt = 1) => {
    const next = callbackUrl(request, "/api/ivr/gather", { step: nextStep, attempt: String(nextAttempt), ...extra });
    return [gather({ action: next, locale, prompt }), redirectTo(next)];
  };

  const retry = (prompt: string) =>
    attempt < 2
      ? twimlResponse(
          say(texts.ivrNotUnderstood, locale),
          ...ask(step, prompt, triageId ? { triageId: String(triageId) } : {}, attempt + 1)
        )
      : goodbye();

  const dispatchAmbulance = async (notes: string, linkedTriageId: number | null) => {
    const requestId = await createTelecomAmbulanceRequest(patient, {
      channel: "IVR",
      notes,
      triageId: linkedTriageId,
    });
    if (!requestId) return twimlResponse(say(texts.ambulanceFailed, locale), "<Hangup/>");
    after(async () => {
      await sendSms(from, texts.ambulanceSent(requestId), {
        profileId: patient.profileId,
        relatedTable: "ambulance_requests",
        relatedId: requestId,
      });
    });
    return twimlResponse(say(texts.ambulanceSent(requestId), locale), say(texts.ivrGoodbye, locale), "<Hangup/>");
  };

  const triageCall = async (who: TelecomPatient, words: string) => {
    const outcome = await runTriage({
      symptomKeys: [],
      freeText: words,
      locale,
      channel: "IVR",
      patient: { age: who.age, gender: who.gender },
    });
    const savedTriageId = await saveTelecomTriage(who, outcome, { channel: "IVR", freeText: words });

    if (outcome.urgency_level === "Emergency") {
      const spoken = [texts.urgency.Emergency, outcome.ai?.summary].filter(Boolean).join(". ");
      return twimlResponse(
        say(spoken, locale),
        ...ask("confirm", texts.ivrAmbulanceOffer, savedTriageId ? { triageId: String(savedTriageId) } : {})
      );
    }

    const advice = outcome.ai?.self_care_advice.slice(0, 2).join(" ") ?? "";
    const spoken = [
      `${texts.urgency[outcome.urgency_level]}.`,
      outcome.ai?.summary,
      advice,
      texts.action[outcome.recommended_action],
    ]
      .filter(Boolean)
      .join(" ");
    after(async () => {
      await sendSms(from, triageReplyText(outcome, locale, 3), {
        profileId: who.profileId,
        relatedTable: "triage_assessments",
        relatedId: savedTriageId ?? undefined,
      });
    });
    return twimlResponse(say(spoken, locale), say(texts.ivrGoodbye, locale), "<Hangup/>");
  };

  if (step === "menu") {
    if (digits === "1" || (speech && wordCount(speech) <= 4 && detectEmergencyPhrase(speech))) {
      return dispatchAmbulance(speech || "IVR menu: pressed 1", null);
    }
    if (digits === "2") return twimlResponse(...ask("describe", texts.ivrDescribe));
    if (speech) return triageCall(patient, speech);
    return retry(texts.ivrWelcome);
  }

  if (step === "describe") {
    if (speech) return triageCall(patient, speech);
    return retry(texts.ivrDescribe);
  }

  if (step === "confirm") {
    if (digits === "1" || (speech && (saidYes(speech) || detectEmergencyPhrase(speech)))) {
      return dispatchAmbulance(speech || "IVR: confirmed ambulance after emergency triage", triageId);
    }
    if (!digits && !speech) return retry(texts.ivrAmbulanceOffer);
    return goodbye();
  }

  return goodbye();
}
